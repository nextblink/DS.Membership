using System.Text;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Web.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' not found.");

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
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationContext>()
    .AddDefaultTokenProviders();

// --- Scope/current-user (issue #7) ---
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<ICurrentUserContext>(sp => sp.GetRequiredService<ICurrentUser>());
// --- end scope ---

// --- File storage (issue #8) ---
builder.Services.Configure<FileStorageOptions>(
    builder.Configuration.GetSection("FileStorage"));
builder.Services.AddScoped<IFormImageStorage, FormImageStorage>();
// --- end file storage ---

// --- OrgUnits (issue #9) ---
builder.Services.AddScoped<IOrgUnitsService, OrgUnitsService>();
// --- end OrgUnits ---

// --- Functions (issue #10) ---
builder.Services.AddScoped<IFunctionsService, FunctionsService>();
// --- end Functions ---

// --- Members (issue #11) ---
builder.Services.AddScoped<IMembersService, MembersService>();
// --- end Members ---

// --- Forms (issue #12) ---
builder.Services.AddScoped<IFormsService, FormsService>();
// --- end Forms ---

// --- JWT auth (issue #6) ---
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddScoped<IAuthService, AuthService>();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
var jwtKeyBytes = Encoding.UTF8.GetBytes(jwtOptions.SecretKey ?? string.Empty);

builder.Services
    .AddAuthentication(o =>
    {
        // AddIdentity (above) registers Identity.Application (cookies) as the
        // default scheme. For an API we want JWT Bearer to be the default for
        // Authenticate / Challenge / Forbid so [Authorize] without a scheme
        // hits the bearer handler.
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
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier,
        };
    });

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("ApiPolicy", p => p.RequireAuthenticatedUser());
});

builder.Services.AddCors(opts =>
{
    opts.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5180")
              .AllowAnyMethod()
              .AllowAnyHeader());
});
// --- end JWT auth ---

// --- Users (issue #13) ---
builder.Services.AddScoped<IUsersService, UsersService>();
// --- end Users ---

// --- Dashboard (issue #14) ---
builder.Services.AddScoped<IDashboardService, DashboardService>();
// --- end Dashboard ---

var app = builder.Build();

// --- Dev seed: ensure a default SuperAdmin user exists ---
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    const string defaultAdminEmail = "admin@local.com";
    const string defaultAdminPassword = "Admin123!";
    if (await userManager.FindByEmailAsync(defaultAdminEmail) is null)
    {
        var admin = new ApplicationUser { UserName = defaultAdminEmail, Email = defaultAdminEmail, EmailConfirmed = true };
        var createResult = await userManager.CreateAsync(admin, defaultAdminPassword);
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, "SuperAdmin");
        }
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// --- File storage (issue #8) ---
// Serves uploaded form scans from wwwroot/uploads/forms/... at /uploads/forms/...
app.UseStaticFiles();
// --- end file storage ---

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok("ok"));

app.Run();
