using System.Text;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Threading.RateLimiting;
using VerdeCrop.Application.Interfaces;
using VerdeCrop.Application.Services;
using VerdeCrop.Infrastructure.Data;
using VerdeCrop.Infrastructure.Repositories;
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
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOpts => sqlOpts.CommandTimeout(60)));

// ── Redis (optional — falls back to in-memory cache if unavailable) ───────────
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
var redisAvailable = false;
try
{
    var redis = StackExchange.Redis.ConnectionMultiplexer.Connect(
        new StackExchange.Redis.ConfigurationOptions
        {
            EndPoints = { redisConn },
            ConnectTimeout = 2000,
            AbortOnConnectFail = false,
            ConnectRetry = 1
        });
    redisAvailable = redis.IsConnected;
    if (redisAvailable)
    {
        builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(redis);
        builder.Services.AddStackExchangeRedisCache(opt =>
        {
            opt.Configuration = redisConn;
            opt.InstanceName = "VerdeCrop:";
        });
        builder.Services.AddScoped<ICacheService, RedisCacheService>();
        Log.Information("Redis connected at {Redis}", redisConn);
    }
}
catch (Exception ex)
{
    Log.Warning("Redis unavailable ({Msg}) — using in-memory cache", ex.Message);
}

if (!redisAvailable)
{
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(_ =>
        StackExchange.Redis.ConnectionMultiplexer.Connect(
            new StackExchange.Redis.ConfigurationOptions
            {
                EndPoints = { redisConn },
                AbortOnConnectFail = false
            }));
    builder.Services.AddScoped<ICacheService, MemoryCacheService>();
}

// ── JWT Auth ──────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is required");

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
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://localhost:5173" };
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader().AllowCredentials()));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;
    opt.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1); o.PermitLimit = 100;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 5;
    });
    opt.AddFixedWindowLimiter("auth", o =>
    {
        o.Window = TimeSpan.FromMinutes(15); o.PermitLimit = 20; // relaxed for dev
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; o.QueueLimit = 0;
    });
});

// ── Firebase (optional) ───────────────────────────────────────────────────────
try
{
    var credPath = builder.Configuration["Firebase:CredentialsPath"] ?? "firebase-credentials.json";
    if (File.Exists(credPath))
        FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(credPath) });
    else
        Log.Warning("Firebase credentials not found — push notifications disabled");
}
catch (Exception ex) { Log.Warning("Firebase init skipped: {Msg}", ex.Message); }

// ── Dependency Injection ──────────────────────────────────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Infrastructure services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<IStorageService, AzureBlobStorageService>();
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
builder.Services.AddHostedService<OrderReminderHostedService>();

// Application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();

// ── Controllers + Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.DefaultIgnoreCondition =
        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Graamo API", Version = "v1", Description = "Organic Marketplace REST API" });
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
        new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }},
        Array.Empty<string>()
    }});
});

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Developer exception page — shows exact error in browser/Swagger ──────────
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// ── Global error handler — returns JSON with real exception message ────────────
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async ctx =>
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = 500;
        var feature = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = feature?.Error;
        var isDev = app.Environment.IsDevelopment();
        var msg = isDev ? $"{ex?.GetType().Name}: {ex?.Message} | {ex?.InnerException?.Message}" : "Internal server error";
        Console.WriteLine($"[UNHANDLED EXCEPTION] {ex?.GetType().Name}: {ex?.Message}");
        Console.WriteLine(ex?.StackTrace);
        await ctx.Response.WriteAsJsonAsync(new { success = false, message = msg });
    });
});

// ── Auto-migrate ──────────────────────────────────────────────────────────────
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    Log.Information("Database migration completed");
}
catch (Exception ex)
{
    Log.Error(ex, "Database migration failed");
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseSerilogRequestLogging();
app.UseRateLimiter();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "VerdeCrop API v1");
    c.RoutePrefix = "swagger";
});
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

Log.Information("Graamo API started — http://localhost:{Port}", 49268);
app.Run();