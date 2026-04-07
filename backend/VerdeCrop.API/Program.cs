using System.Text;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Threading.RateLimiting;
using VerdeCrop.API.Middleware;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Application.Services;
using VerdeCrop.Infrastructure.Data;
using VerdeCrop.Infrastructure.Repositories;
using VerdeCrop.API.Services;
using VerdeCrop.Infrastructure.Services;
var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "FATAL: ConnectionStrings:DefaultConnection is missing. " +
        "Set it in Azure App Service → Configuration → Connection strings.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(
        connectionString,
        sqlOpts =>
        {
            sqlOpts.CommandTimeout(60);
            // Retries up to 5 times with exponential back-off — required for Azure SQL Basic/Standard
            sqlOpts.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        }));

// ── JWT Auth ──────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:SecretKey"];

if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException(
            "FATAL: Jwt:SecretKey is missing or too short (minimum 32 characters). " +
            "Set it via Azure App Configuration or environment variables.");

    Log.Warning("JWT key is missing or weak — using insecure fallback. DO NOT use in production.");
    jwtKey = "CHANGE_THIS_TO_A_32_CHAR_MIN_SECRET_KEY_IN_PRODUCTION";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero   // no grace period — tokens expire exactly on time
        };
        opt.Events = new JwtBearerEvents
        {
            // Return clean JSON 401 instead of a redirect
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsJsonAsync(new { success = false, message = "Unauthorized. Please log in." });
            },
            // Return clean JSON 403 instead of a redirect
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsJsonAsync(new { success = false, message = "Access denied. Insufficient permissions." });
            },
            OnAuthenticationFailed = ctx =>
            {
                Log.Warning("JWT authentication failed: {Error} from {IP}",
                    ctx.Exception.Message,
                    ctx.HttpContext.Connection.RemoteIpAddress);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "https://salmon-meadow-02363df00.6.azurestaticapps.net",
                "http://localhost:3000",
                "http://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromHours(1));
    });
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;
    opt.OnRejected = async (ctx, _) =>
    {
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new { success = false, message = "Too many requests. Please slow down and try again later." });
    };
    // General API: 300 req/min per IP
    opt.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 300;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 50;
    });
    // Auth endpoints: 10 attempts per 15 minutes (brute-force protection)
    opt.AddFixedWindowLimiter("auth", o =>
    {
        o.Window = TimeSpan.FromMinutes(15);
        o.PermitLimit = 10;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 5;
    });
});

// ── Firebase (optional) ───────────────────────────────────────────────────────
try
{
    var credPath = builder.Configuration["Firebase:CredentialsPath"]
        ?? "firebase-credentials.json";
    if (File.Exists(credPath))
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(credPath)
        });
}
catch { }

// ── Caching ───────────────────────────────────────────────────────────────────
builder.Services.AddDistributedMemoryCache();
builder.Services.AddScoped<ICacheService, MemoryCacheService>();

// ── Dependency Injection ──────────────────────────────────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, SmsService>();
// Use LocalFileStorageService when Azure Blob is not configured; swap to
// AzureBlobStorageService by setting Azure:BlobStorage:ConnectionString in config.
var azureConnStr = builder.Configuration["Azure:BlobStorage:ConnectionString"];
if (!string.IsNullOrWhiteSpace(azureConnStr))
    builder.Services.AddScoped<IStorageService, AzureBlobStorageService>();
else
    builder.Services.AddScoped<IStorageService, LocalFileStorageService>();
builder.Services.AddScoped<IFirebaseService, FirebaseService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IFarmerService, FarmerService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IWishlistService, WishlistService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IDynamicPricingService, DynamicPricingService>();
builder.Services.AddScoped<IProductBundleService, ProductBundleService>();
builder.Services.AddScoped<IPriceAlertService, PriceAlertService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IReferralService, ReferralService>();

// ── Controllers + Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return new BadRequestObjectResult(new { success = false, message = string.Join("; ", errors) });
        };
    })
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Graamo API",
        Version = "v1",
        Description = "Organic Marketplace REST API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your-jwt-token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {{
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        Array.Empty<string>()
    }});
});

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

// ── Build app ─────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Global error handler ──────────────────────────────────────────────────────
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = feature?.Error;

        // Always log the full exception — visible in Azure App Service log stream
        Log.Error(ex, "Unhandled exception [{ExType}] on {Method} {Path}",
            ex?.GetType().Name,
            context.Request.Method,
            context.Request.Path);

        var message = app.Environment.IsDevelopment() ? ex?.Message : "Internal server error";
        await context.Response.WriteAsJsonAsync(new { success = false, message });
    });
});

// ── Auto Migration ────────────────────────────────────────────────────────────
var autoMigrateOnStartup = builder.Configuration.GetValue<bool?>("Database:AutoMigrateOnStartup")
    ?? app.Environment.IsDevelopment();

if (autoMigrateOnStartup)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        Log.Information("Database migration completed successfully.");
    }
    catch (Exception ex)
    {
        // Always log — critical to see in Azure Log Stream even in production
        Log.Fatal(ex, "Database migration FAILED during startup. APIs will return 500 until resolved.");
        if (!app.Environment.IsDevelopment())
            throw; // Crash fast in production so Azure restarts + alerts fire
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSerilogRequestLogging();
app.UseRateLimiter();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Graamo API v1");
    c.RoutePrefix = "swagger";
});
app.UseHttpsRedirection();

// ── Static files (serves wwwroot/uploads/ for locally-stored images) ──────────
var wwwRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(wwwRoot)) Directory.CreateDirectory(wwwRoot);
var uploadsDir = Path.Combine(wwwRoot, "uploads");
if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles();

app.UseCors("AllowFrontend");  // ← Must be before UseAuthentication
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// ── DB diagnostic endpoint (remove or restrict after debugging) ───────────────
app.MapGet("/health/db", async (AppDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        var pending    = (await db.Database.GetPendingMigrationsAsync()).ToList();
        return Results.Ok(new
        {
            connected       = canConnect,
            pendingMigrations = pending.Count,
            migrations      = pending,
            server          = db.Database.GetDbConnection().DataSource
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title:  "Database connection failed",
            detail: ex.Message,
            statusCode: 503);
    }
});

Log.Information("Graamo API started");
app.Run();