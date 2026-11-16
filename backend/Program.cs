using System.IO;
using System.Text;
using DropLink.Api.Data;
using DropLink.Api.Hubs;
using DropLink.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// QuestPDF license (Community for non-commercial/independent projects)
QuestPDF.Settings.License = LicenseType.Community;
QuestPDF.Settings.UseSystemFonts = true;
QuestPDF.Settings.ThrowOnMissingFontFamilies = false;

// Kestrel Large Upload Support - Allow up to 150 GB uploads
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 161061273600; // ~150 GB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(30);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(5);
});

// Form Options for multipart streaming
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = 161061273600; // ~150 GB
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// MySQL DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=localhost;Port=3306;Database=droplink_db;User=root;Password=1234;CharSet=utf8mb4;";
builder.Services.AddDbContext<DropLinkDbContext>(options =>
{
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), mysqlOptions =>
    {
        mysqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
    });
});

// Application Services DI
builder.Services.AddSingleton<IStorageService, LocalStorageService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<ILanDiscoveryService, LanDiscoveryService>();
builder.Services.AddSingleton<IPdfService, PdfService>();
builder.Services.AddScoped<ISmartOrganizationService, SmartOrganizationService>();
builder.Services.AddScoped<IAiStudyService, AiStudyService>();

// Authentication & JWT
var jwtKey = builder.Configuration["JwtSettings:Secret"] ?? "DropLink_Super_Secure_Secret_Key_For_Jwt_Auth_2026_Minimum_32_Chars!";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };

    // Support token query string parameter for SignalR WebSockets
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// CORS - Support local network IP access and vite localhost
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Controllers & JSON configuration
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// SignalR
builder.Services.AddSignalR(hubOptions =>
{
    hubOptions.EnableDetailedErrors = true;
    hubOptions.MaximumReceiveMessageSize = 10 * 1024 * 1024; // 10 MB for metadata
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Auto-migrate or ensure database created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DropLinkDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Serve built React static files if present
var frontendDist = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "../frontend/dist"));
if (Directory.Exists(frontendDist))
{
    var fileProvider = new PhysicalFileProvider(frontendDist);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider
    });
}

app.UseAuthentication();
app.UseAuthorization();

// Map SignalR Hub
app.MapHub<TransferHub>("/hub/transfer");

app.MapControllers();

// Base health endpoint
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    app = "DropLink API",
    version = "1.0.0",
    timestamp = DateTime.UtcNow
}));

// Fallback to React index.html for SPA client-side routing
if (Directory.Exists(frontendDist))
{
    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendDist)
    });
}

app.Run();
