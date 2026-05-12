using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Web.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
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

var app = builder.Build();

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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
