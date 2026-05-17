// ─── Add to your existing Program.cs ─────────────────────────────────────────
//
// 1. Register services (before builder.Build()):
//
//    builder.Services.AddScoped<IAttachmentService, AttachmentService>();
//
// 2. Configure request size limit globally (or per-controller via attribute):
//
//    builder.Services.Configure<FormOptions>(o =>
//    {
//        o.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10 MB
//    });
//
//    builder.WebHost.ConfigureKestrel(k =>
//    {
//        k.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
//    });
//
// 3. Serve uploaded files as static files (after builder.Build()):
//
//    var uploadPath = Path.Combine(Directory.GetCurrentDirectory(),
//        builder.Configuration["Uploads:Path"] ?? "uploads");
//    Directory.CreateDirectory(uploadPath);
//
//    app.UseStaticFiles(new StaticFileOptions
//    {
//        FileProvider = new PhysicalFileProvider(uploadPath),
//        RequestPath  = "/uploads",
//    });
//
// 4. Add to appsettings.json:
//    "Uploads": {
//      "Path": "uploads",
//      "BaseUrl": "https://your-server.com/uploads"
//    }
//
// 5. Add EF migration:
//    dotnet ef migrations add AddAttachments \
//      --project Marcipano.Infrastructure \
//      --startup-project Marcipano.API
//
// 6. Add to AppDbContext:
//    public DbSet<Attachment> Attachments => Set<Attachment>();
//
// 7. Configure relationship in OnModelCreating:
//    modelBuilder.Entity<Announcement>()
//        .HasMany(a => a.Attachments)
//        .WithOne(at => at.Announcement)
//        .HasForeignKey(at => at.AnnouncementId)
//        .OnDelete(DeleteBehavior.SetNull);
// ─────────────────────────────────────────────────────────────────────────────

// Required using:
// using Microsoft.AspNetCore.Http.Features;
// using Microsoft.Extensions.FileProviders;
