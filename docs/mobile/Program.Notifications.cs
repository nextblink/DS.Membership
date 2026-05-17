// ─── Add to your existing Program.cs ─────────────────────────────────────────
//
// 1. NuGet packages needed:
//    dotnet add Marcipano.Infrastructure package FirebaseAdmin
//
// 2. Place your Firebase service account JSON at:
//    Marcipano.API/firebase-service-account.json
//    Add to .gitignore — never commit this file.
//
// 3. Add to appsettings.json:
//    "Firebase": { "ServiceAccountPath": "firebase-service-account.json" }
//
// ─────────────────────────────────────────────────────────────────────────────

using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Marcipano.Application.Interfaces;
using Marcipano.Infrastructure.BackgroundJobs;
using Marcipano.Infrastructure.Repositories;
using Marcipano.Infrastructure.Services;

// ── Firebase Admin SDK init (do this once, before builder.Build()) ───────────
var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"]
    ?? throw new InvalidOperationException("Firebase:ServiceAccountPath not configured");

FirebaseApp.Create(new AppOptions
{
    Credential = GoogleCredential.FromFile(serviceAccountPath),
});

// ── Dependency injection ──────────────────────────────────────────────────────
builder.Services.AddScoped<IFcmSubscriptionRepository, FcmSubscriptionRepository>();
builder.Services.AddScoped<INotificationService, FcmNotificationService>();

// ── Due-date reminder background job ─────────────────────────────────────────
builder.Services.AddHostedService<DueDateReminderJob>();

// ─────────────────────────────────────────────────────────────────────────────
// EF Core: add FcmSubscriptions DbSet to your AppDbContext:
//
//   public DbSet<FcmSubscription> FcmSubscriptions => Set<FcmSubscription>();
//
// Then add migration:
//   dotnet ef migrations add AddFcmSubscriptions \
//     --project Marcipano.Infrastructure \
//     --startup-project Marcipano.API
// ─────────────────────────────────────────────────────────────────────────────
