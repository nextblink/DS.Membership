using System.Text;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Telegram.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ApplicationContext>(opts =>
    opts.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.User.RequireUniqueEmail = false;
    })
    .AddEntityFrameworkStores<ApplicationContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<TelegramOptions>(builder.Configuration.GetSection("Telegram"));
builder.Services.Configure<FileStorageOptions>(builder.Configuration.GetSection("FileStorage"));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

builder.Services.AddScoped<ITelegramAuthService, TelegramAuthService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<IAttachmentService, AttachmentService>();
builder.Services.AddSingleton<IAnnouncementNotifier, TelegramBotService>();
builder.Services.AddHostedService(sp => (TelegramBotService)sp.GetRequiredService<IAnnouncementNotifier>());

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
var jwtKeyBytes = Encoding.UTF8.GetBytes(jwtOptions.SecretKey ?? string.Empty);

builder.Services
    .AddAuthentication(o =>
    {
        o.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        o.DefaultForbidScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opts =>
    {
        opts.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        opts.SaveToken = true;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

builder.Services.AddAuthorization(opts =>
    opts.AddPolicy("ApiPolicy", p => p.RequireAuthenticatedUser()));

builder.Services.AddCors(opts =>
    opts.AddPolicy("AllowMiniApp", policy =>
        policy.WithOrigins(
                "http://localhost:5182",
                "https://localhost:5182",
                "https://dagger-roster-manual.ngrok-free.dev")
              .AllowAnyMethod()
              .AllowAnyHeader()));

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowMiniApp");

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("ok"));

app.Run();
