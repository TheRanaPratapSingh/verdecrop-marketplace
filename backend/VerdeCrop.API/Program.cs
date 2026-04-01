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

// ── Serilog ─────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ── Database ────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOpts => sqlOpts.CommandTimeout(60)));

// ── JWT Auth ────────────────────────────────────────
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

// ── ✅ CORS FIX (IMPORTANT) ─────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://salmon-meadow-02363df00.6.azurestaticapps.net"
                )
              .AllowAnyHeader()
              .AllowAnyMethod();
        // ❌ NO AllowCredentials (this was causing your issue)
    });
});

// ── Rate Limiting ──────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = 429;

    opt.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 100;
        o.QueueLimit = 5;
    });

    opt.AddFixedWindowLimiter("auth", o =>
    {
        o.Window = TimeSpan.FromMinutes(15);
        o.PermitLimit = 20;
    });
});

// ── Firebase (optional) ────────────────────────────
try
{
    var credPath = builder.Configuration["Firebase:CredentialsPath"] ?? "firebase-credentials.json";
    if (File.Exists(credPath))
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(credPath)
        });
}
catch { }

// ── Dependency Injection ───────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

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

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();

// ── Controllers + Swagger ──────────────────────────
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Graamo API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// ── Build app ──────────────────────────────────────
var app = builder.Build();

// ── Auto Migration ─────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ── Middleware ─────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// ✅ IMPORTANT ORDER
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();