# Marcipano Telegram Mini App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Telegram Mini App for party members to read, like, and compose targeted announcements, backed by a new `Marsipan.Membership.Telegram.API` project and `MarcipanoTelegram` React client, both sharing the existing `Marsipan.Membership.Middleware`.

**Architecture:** New entities (Announcement, AnnouncementLike, Attachment, FcmSubscription, TelegramLink) are added to the shared Middleware and migrated into a separate `MarcipanoTelegramDb` SQL Server database. `Marsipan.Membership.Telegram.API` handles Telegram `initData` auth, sync, and push notifications via a hosted bot service. The React client is a Vite web app opened inside Telegram, using Dexie for offline-first storage.

**Tech Stack:** .NET 10, EF Core 10, xUnit, Moq, Telegram.Bot 22.x, React 19, Vite 8, Dexie 4, Tailwind v4, React Router v7.

---

## File Map

### Middleware (new/modified)
| Action | Path |
|---|---|
| Modify | `src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Entities/AnnouncementLike.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Entities/Attachment.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Entities/FcmSubscription.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Entities/TelegramLink.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementNotifier.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/ISyncService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/SyncService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/IAttachmentService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/AttachmentService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/ITelegramAuthService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Services/TelegramAuthService.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs` |
| Create | `src/backend/Marsipan.Membership.Middleware/Options/TelegramOptions.cs` |

### Test project (new)
| Action | Path |
|---|---|
| Create | `src/backend/Marsipan.Membership.Telegram.Tests/Marsipan.Membership.Telegram.Tests.csproj` |
| Create | `src/backend/Marsipan.Membership.Telegram.Tests/Services/TelegramAuthServiceTests.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.Tests/Services/SyncServiceTests.cs` |

### Telegram API project (new)
| Action | Path |
|---|---|
| Create | `src/backend/Marsipan.Membership.Telegram.API/Marsipan.Membership.Telegram.API.csproj` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Program.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/appsettings.json` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/appsettings.Development.json` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Properties/launchSettings.json` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Controllers/TelegramAuthController.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Controllers/AnnouncementsController.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Controllers/SyncController.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Controllers/AttachmentsController.cs` |
| Create | `src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs` |

### React client (new)
| Action | Path |
|---|---|
| Create | `src/client/MarcipanoTelegram/package.json` |
| Create | `src/client/MarcipanoTelegram/vite.config.js` |
| Create | `src/client/MarcipanoTelegram/index.html` |
| Create | `src/client/MarcipanoTelegram/src/main.jsx` |
| Create | `src/client/MarcipanoTelegram/src/App.jsx` |
| Create | `src/client/MarcipanoTelegram/src/index.css` |
| Create | `src/client/MarcipanoTelegram/src/framework/api.js` |
| Create | `src/client/MarcipanoTelegram/src/framework/auth.js` |
| Create | `src/client/MarcipanoTelegram/src/framework/telegram.js` |
| Create | `src/client/MarcipanoTelegram/src/db/schema.js` |
| Create | `src/client/MarcipanoTelegram/src/db/hooks.js` |
| Create | `src/client/MarcipanoTelegram/src/sync/syncEngine.js` |
| Create | `src/client/MarcipanoTelegram/src/components/AppHeader.jsx` |
| Create | `src/client/MarcipanoTelegram/src/components/SyncStatusBar.jsx` |
| Create | `src/client/MarcipanoTelegram/src/pages/FeedPage.jsx` |
| Create | `src/client/MarcipanoTelegram/src/pages/AnnouncementDetailPage.jsx` |
| Create | `src/client/MarcipanoTelegram/src/pages/ComposePage.jsx` |

---

## Task 1: Create feature branch

- [ ] **Create and switch to the feature branch**
  ```powershell
  git checkout -b feature/marcipano-telegram
  ```

- [ ] **Commit the empty branch marker**
  ```powershell
  git commit --allow-empty -m "chore: start feature/marcipano-telegram branch"
  ```

---

## Task 2: Add announcement entities to Middleware

**Files:** Create `Entities/Announcement.cs`, `Entities/AnnouncementLike.cs`, `Entities/Attachment.cs`, `Entities/FcmSubscription.cs`

- [ ] **Create `Announcement.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Announcements")]
public class Announcement : BaseEntity
{
    [Required, MaxLength(300)]
    public string Title { get; set; } = null!;

    [Required]
    public string Body { get; set; } = null!;

    [Required]
    public int AuthorId { get; set; }

    [ForeignKey(nameof(AuthorId))]
    public Member Author { get; set; } = null!;

    public OrgUnitType? TargetLevel { get; set; }

    public int? TargetOrgUnitId { get; set; }

    [ForeignKey(nameof(TargetOrgUnitId))]
    public OrgUnit? TargetOrgUnit { get; set; }

    public int? TargetFunctionId { get; set; }

    [ForeignKey(nameof(TargetFunctionId))]
    public Function? TargetFunction { get; set; }

    public ICollection<Attachment> Attachments { get; set; } = [];
    public ICollection<AnnouncementLike> Likes { get; set; } = [];
}
```

- [ ] **Create `AnnouncementLike.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/AnnouncementLike.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("AnnouncementLikes")]
public class AnnouncementLike : BaseEntity
{
    [Required]
    public int AnnouncementId { get; set; }

    [ForeignKey(nameof(AnnouncementId))]
    public Announcement Announcement { get; set; } = null!;

    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;
}
```

- [ ] **Create `Attachment.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/Attachment.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Attachments")]
public class Attachment : BaseEntity
{
    public int? AnnouncementId { get; set; }

    [ForeignKey(nameof(AnnouncementId))]
    public Announcement? Announcement { get; set; }

    [Required, MaxLength(500)]
    public string FileName { get; set; } = null!;

    [Required, MaxLength(500)]
    public string StoredName { get; set; } = null!;

    [Required, MaxLength(1000)]
    public string FileUrl { get; set; } = null!;

    public long FileSize { get; set; }

    [Required, MaxLength(100)]
    public string MimeType { get; set; } = null!;
}
```

- [ ] **Create `FcmSubscription.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/FcmSubscription.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("FcmSubscriptions")]
public class FcmSubscription : BaseEntity
{
    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    [Required, MaxLength(500)]
    public string FcmToken { get; set; } = null!;
}
```

- [ ] **Verify Middleware builds**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  ```
  Expected: Build succeeded, 0 errors.

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs `
          src/backend/Marsipan.Membership.Middleware/Entities/AnnouncementLike.cs `
          src/backend/Marsipan.Membership.Middleware/Entities/Attachment.cs `
          src/backend/Marsipan.Membership.Middleware/Entities/FcmSubscription.cs
  git commit -m "feat: add announcement entities to Middleware"
  ```

---

## Task 3: Add TelegramLink entity to Middleware

**Files:** Create `Entities/TelegramLink.cs`

- [ ] **Create `TelegramLink.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/TelegramLink.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("TelegramLinks")]
public class TelegramLink : BaseEntity
{
    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    public long TelegramUserId { get; set; }

    [MaxLength(200)]
    public string? TelegramUsername { get; set; }

    public DateTime LinkedAt { get; set; }
}
```

- [ ] **Verify Middleware builds**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Entities/TelegramLink.cs
  git commit -m "feat: add TelegramLink entity to Middleware"
  ```

---

## Task 4: Register new entities in ApplicationContext

**Files:** Modify `Data/ApplicationContext.cs`

- [ ] **Add DbSets and model configuration to `ApplicationContext.cs`**

Add the following DbSet properties after `FormImages`:
```csharp
public DbSet<Announcement> Announcements => Set<Announcement>();
public DbSet<AnnouncementLike> AnnouncementLikes => Set<AnnouncementLike>();
public DbSet<Attachment> Attachments => Set<Attachment>();
public DbSet<FcmSubscription> FcmSubscriptions => Set<FcmSubscription>();
public DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();
```

Add inside `OnModelCreating`, after the existing `HasQueryFilter` lines:
```csharp
// AnnouncementLike unique: one like per member per announcement
modelBuilder.Entity<AnnouncementLike>()
    .HasIndex(al => new { al.AnnouncementId, al.MemberId })
    .IsUnique();

// FcmSubscription: unique FCM token
modelBuilder.Entity<FcmSubscription>()
    .HasIndex(f => f.FcmToken)
    .IsUnique();

// TelegramLink: one per member, unique Telegram user ID
modelBuilder.Entity<TelegramLink>()
    .HasIndex(t => t.MemberId)
    .IsUnique();
modelBuilder.Entity<TelegramLink>()
    .HasIndex(t => t.TelegramUserId)
    .IsUnique();

// Soft-delete filter on Announcement
modelBuilder.Entity<Announcement>().HasQueryFilter(e => !e.IsDeleted);
```

- [ ] **Verify Middleware builds**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs
  git commit -m "feat: register announcement and Telegram entities in ApplicationContext"
  ```

---

## Task 5: Add IAnnouncementNotifier interface

**Files:** Create `Services/IAnnouncementNotifier.cs`

- [ ] **Create `IAnnouncementNotifier.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementNotifier.cs
using Marsipan.Membership.Middleware.Entities;

namespace Marsipan.Membership.Middleware.Services;

public interface IAnnouncementNotifier
{
    Task NotifyAsync(Announcement announcement, CancellationToken ct = default);
}
```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementNotifier.cs
  git commit -m "feat: add IAnnouncementNotifier interface to Middleware"
  ```

---

## Task 6: Add announcement DTOs

**Files:** Create `DTOs/AnnouncementDtos.cs`, `DTOs/SyncDtos.cs`

- [ ] **Create `AnnouncementDtos.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record AttachmentDto(
    int Id,
    string FileName,
    string FileUrl,
    long FileSize,
    string MimeType);

public record AnnouncementDto(
    int Id,
    string Title,
    string Body,
    int AuthorId,
    string AuthorName,
    OrgUnitType? TargetLevel,
    int? TargetOrgUnitId,
    int? TargetFunctionId,
    DateTime CreatedDate,
    int LikeCount,
    bool LikedByMe,
    IReadOnlyList<AttachmentDto> Attachments);

public record AnnouncementLikeDto(
    int AnnouncementId,
    int MemberId);

public record CreateAnnouncementRequest(
    string Title,
    string Body,
    OrgUnitType? TargetLevel,
    int? TargetOrgUnitId,
    int? TargetFunctionId,
    IReadOnlyList<int> AttachmentIds);
```

- [ ] **Create `SyncDtos.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs
namespace Marsipan.Membership.Middleware.DTOs;

public record SyncResponseDto(
    IReadOnlyList<AnnouncementDto> Announcements,
    IReadOnlyList<AnnouncementLikeDto> AnnouncementLikes,
    DateTime ServerTime);
```

- [ ] **Build Middleware**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs `
          src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs
  git commit -m "feat: add announcement and sync DTOs to Middleware"
  ```

---

## Task 7: Add TelegramOptions

**Files:** Create `Options/TelegramOptions.cs`

- [ ] **Create `TelegramOptions.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Options/TelegramOptions.cs
namespace Marsipan.Membership.Middleware.Options;

public class TelegramOptions
{
    public string BotToken { get; set; } = string.Empty;
    public string MiniAppUrl { get; set; } = string.Empty;
}
```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Options/TelegramOptions.cs
  git commit -m "feat: add TelegramOptions to Middleware"
  ```

---

## Task 8: Create test project

**Files:** Create `Marsipan.Membership.Telegram.Tests.csproj`

- [ ] **Create the test project**
  ```powershell
  dotnet new xunit -n Marsipan.Membership.Telegram.Tests -o src/backend/Marsipan.Membership.Telegram.Tests --framework net10.0
  ```

- [ ] **Add Middleware and Moq references**
  ```powershell
  dotnet add src/backend/Marsipan.Membership.Telegram.Tests reference src/backend/Marsipan.Membership.Middleware
  dotnet add src/backend/Marsipan.Membership.Telegram.Tests package Moq
  dotnet add src/backend/Marsipan.Membership.Telegram.Tests package Microsoft.EntityFrameworkCore.InMemory
  ```

- [ ] **Add test project to solution**
  ```powershell
  dotnet sln src/backend/Marsipan.Membership.sln add src/backend/Marsipan.Membership.Telegram.Tests
  ```

- [ ] **Delete the boilerplate test file**
  ```powershell
  Remove-Item src/backend/Marsipan.Membership.Telegram.Tests/UnitTest1.cs
  ```

- [ ] **Verify the project builds**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Telegram.Tests
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Telegram.Tests/ src/backend/Marsipan.Membership.sln
  git commit -m "chore: add Telegram test project"
  ```

---

## Task 9: Add TelegramAuthService (TDD)

**Files:** Create `Services/ITelegramAuthService.cs`, `Services/TelegramAuthService.cs`, `Tests/Services/TelegramAuthServiceTests.cs`

- [ ] **Write the failing test first**

```csharp
// src/backend/Marsipan.Membership.Telegram.Tests/Services/TelegramAuthServiceTests.cs
using System.Security.Cryptography;
using System.Text;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class TelegramAuthServiceTests
{
    private const string BotToken = "123456:ABC-test-token";

    private static string BuildValidInitData(long userId, string phone, int ageSeconds = 0)
    {
        var authDate = DateTimeOffset.UtcNow.AddSeconds(-ageSeconds).ToUnixTimeSeconds();
        var dataFields = new SortedDictionary<string, string>
        {
            ["auth_date"] = authDate.ToString(),
            ["user"] = $"{{\"id\":{userId},\"first_name\":\"Test\"}}",
            ["contact"] = $"{{\"phone_number\":\"{phone}\"}}"
        };

        var dataCheckString = string.Join("\n", dataFields.Select(kv => $"{kv.Key}={kv.Value}"));

        var secretKey = HMACSHA256.HashData(Encoding.UTF8.GetBytes("WebAppData"), Encoding.UTF8.GetBytes(BotToken));
        var hash = Convert.ToHexString(HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString))).ToLower();

        var parts = dataFields.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}").ToList();
        parts.Add($"hash={hash}");
        return string.Join("&", parts);
    }

    [Fact]
    public void ValidateInitData_ValidData_ReturnsPayload()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567");
        var result = sut.ValidateInitData(initData);

        Assert.NotNull(result);
        Assert.Equal(42, result.TelegramUserId);
        Assert.Equal("+381601234567", result.PhoneNumber);
    }

    [Fact]
    public void ValidateInitData_TamperedHash_ReturnsNull()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567") + "tampered";
        var result = sut.ValidateInitData(initData);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateInitData_DataOlderThan5Minutes_ReturnsNull()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567", ageSeconds: 310);
        var result = sut.ValidateInitData(initData);

        Assert.Null(result);
    }
}
```

- [ ] **Run tests — expect compile error (TelegramAuthService not yet defined)**
  ```powershell
  dotnet test src/backend/Marsipan.Membership.Telegram.Tests
  ```
  Expected: Build failure — `TelegramAuthService` not found.

- [ ] **Create the interface**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/ITelegramAuthService.cs
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public record TelegramInitDataPayload(long TelegramUserId, string? TelegramUsername, string PhoneNumber);

public interface ITelegramAuthService
{
    TelegramInitDataPayload? ValidateInitData(string initData);
    Task<TelegramAuthResultDto?> AuthenticateAsync(string initData, CancellationToken ct = default);
}
```

- [ ] **Add `TelegramAuthResultDto` to `DTOs/AnnouncementDtos.cs`** (append to file):

```csharp
public record TelegramAuthResultDto(string Token, int MemberId, string DisplayName, int OrgUnitId, IReadOnlyList<int> FunctionIds);
```

- [ ] **Create the implementation**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/TelegramAuthService.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Marsipan.Membership.Middleware.Services;

public class TelegramAuthService : ITelegramAuthService
{
    private static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(5);

    private readonly TelegramOptions _tgOptions;
    private readonly JwtOptions? _jwtOptions;
    private readonly ApplicationContext? _db;

    public TelegramAuthService(IOptions<TelegramOptions> tgOptions, ApplicationContext? db, IOptions<JwtOptions>? jwtOptions = null)
    {
        _tgOptions = tgOptions.Value;
        _db = db;
        _jwtOptions = jwtOptions?.Value;
    }

    public TelegramInitDataPayload? ValidateInitData(string initData)
    {
        if (string.IsNullOrWhiteSpace(initData)) return null;

        var parsed = HttpUtility.ParseQueryString(initData);
        var hash = parsed["hash"];
        if (string.IsNullOrEmpty(hash)) return null;

        // Build data-check-string: all fields except hash, sorted, key=value\n
        var fields = new SortedDictionary<string, string>();
        foreach (string? key in parsed.Keys)
        {
            if (key is null || key == "hash") continue;
            fields[key] = parsed[key] ?? string.Empty;
        }
        var dataCheckString = string.Join("\n", fields.Select(kv => $"{kv.Key}={kv.Value}"));

        // HMAC-SHA256: secret = HMAC-SHA256("WebAppData", botToken), hash = HMAC-SHA256(secret, dataCheckString)
        var secretKey = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("WebAppData"),
            Encoding.UTF8.GetBytes(_tgOptions.BotToken));
        var expected = Convert.ToHexString(
            HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString))).ToLower();

        if (!string.Equals(expected, hash, StringComparison.OrdinalIgnoreCase)) return null;

        // Validate age
        if (!long.TryParse(fields.GetValueOrDefault("auth_date"), out var authDateUnix)) return null;
        var authDate = DateTimeOffset.FromUnixTimeSeconds(authDateUnix);
        if (DateTimeOffset.UtcNow - authDate > MaxAge) return null;

        // Parse user ID and phone
        var userJson = fields.GetValueOrDefault("user") ?? string.Empty;
        var userIdMatch = System.Text.RegularExpressions.Regex.Match(userJson, @"""id""\s*:\s*(\d+)");
        if (!userIdMatch.Success || !long.TryParse(userIdMatch.Groups[1].Value, out var telegramUserId)) return null;

        var usernameMatch = System.Text.RegularExpressions.Regex.Match(userJson, @"""username""\s*:\s*""([^""]+)""");
        var username = usernameMatch.Success ? usernameMatch.Groups[1].Value : null;

        var contactJson = fields.GetValueOrDefault("contact") ?? string.Empty;
        var phoneMatch = System.Text.RegularExpressions.Regex.Match(contactJson, @"""phone_number""\s*:\s*""([^""]+)""");
        if (!phoneMatch.Success) return null;
        var phone = phoneMatch.Groups[1].Value;

        return new TelegramInitDataPayload(telegramUserId, username, phone);
    }

    public async Task<TelegramAuthResultDto?> AuthenticateAsync(string initData, CancellationToken ct = default)
    {
        var payload = ValidateInitData(initData);
        if (payload is null || _db is null || _jwtOptions is null) return null;

        // Resolve by existing TelegramLink first (fast path)
        var link = await _db.TelegramLinks
            .Include(t => t.Member).ThenInclude(m => m.MemberFunctions)
            .Include(t => t.Member).ThenInclude(m => m.OrgUnit)
            .FirstOrDefaultAsync(t => t.TelegramUserId == payload.TelegramUserId, ct);

        if (link is null)
        {
            // Phone-match path
            var normalised = payload.PhoneNumber.Replace(" ", "").Replace("-", "");
            var phone = await _db.Phones
                .Include(p => p.Member).ThenInclude(m => m.MemberFunctions)
                .Include(p => p.Member).ThenInclude(m => m.OrgUnit)
                .FirstOrDefaultAsync(p => p.Number == normalised || p.Number == payload.PhoneNumber, ct);

            if (phone is null) return null;

            link = new TelegramLink
            {
                MemberId = phone.MemberId,
                Member = phone.Member,
                TelegramUserId = payload.TelegramUserId,
                TelegramUsername = payload.TelegramUsername,
                LinkedAt = DateTime.UtcNow,
                CreatedDate = DateTime.UtcNow,
                LastModifiedDate = DateTime.UtcNow,
                CreatedByUserId = phone.MemberId.ToString(),
                LastModifiedByUserId = phone.MemberId.ToString()
            };
            _db.TelegramLinks.Add(link);
            await _db.SaveChangesAsync(ct);
        }
        else if (link.TelegramUsername != payload.TelegramUsername)
        {
            link.TelegramUsername = payload.TelegramUsername;
            link.LastModifiedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        var member = link.Member;
        var functionIds = member.MemberFunctions.Select(mf => mf.FunctionId).ToList();
        var displayName = $"{member.FirstName} {member.LastName}";
        var token = GenerateToken(member, functionIds);

        return new TelegramAuthResultDto(token, member.Id, displayName, member.OrgUnitId, functionIds);
    }

    private string GenerateToken(Member member, List<int> functionIds)
    {
        if (_jwtOptions is null) throw new InvalidOperationException("JwtOptions not configured.");

        var keyBytes = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);
        var creds = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_jwtOptions.ExpiresMinutes <= 0 ? 60 : _jwtOptions.ExpiresMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, member.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("memberId", member.Id.ToString()),
            new("orgUnitId", member.OrgUnitId.ToString()),
            new("telegramUserId", member.Id.ToString()),
        };
        claims.AddRange(functionIds.Select(fid => new Claim("functionId", fid.ToString())));

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Run tests — expect PASS**
  ```powershell
  dotnet test src/backend/Marsipan.Membership.Telegram.Tests --filter "TelegramAuthServiceTests"
  ```
  Expected: 3 tests pass.

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Services/ITelegramAuthService.cs `
          src/backend/Marsipan.Membership.Middleware/Services/TelegramAuthService.cs `
          src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs `
          src/backend/Marsipan.Membership.Telegram.Tests/Services/TelegramAuthServiceTests.cs
  git commit -m "feat: add TelegramAuthService with HMAC-SHA256 initData validation"
  ```

---

## Task 10: Add AnnouncementService and SyncService (TDD)

**Files:** Create `Services/IAnnouncementService.cs`, `Services/AnnouncementService.cs`, `Services/ISyncService.cs`, `Services/SyncService.cs`, `Tests/Services/SyncServiceTests.cs`

- [ ] **Write the failing SyncService test**

```csharp
// src/backend/Marsipan.Membership.Telegram.Tests/Services/SyncServiceTests.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class SyncServiceTests
{
    private static ApplicationContext CreateDb(string name)
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationContext(opts);
    }

    private static readonly string SysUserId = "sys";

    private static Member MakeMember(int id, int orgUnitId, ApplicationContext db)
    {
        var m = new Member
        {
            Id = id, FirstName = "A", LastName = "B", JMBG = id.ToString().PadLeft(13, '0'),
            DateOfBirth = new DateOnly(1990, 1, 1), Gender = Gender.Male,
            MaritalStatus = MaritalStatus.Single, EducationLevel = EducationLevel.Secondary,
            MembershipDate = new DateOnly(2020, 1, 1), OrgUnitId = orgUnitId,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.Members.Add(m);
        return m;
    }

    private static OrgUnit MakeOrgUnit(int id, OrgUnitType type, ApplicationContext db)
    {
        var o = new OrgUnit
        {
            Id = id, Name = $"Unit{id}", Type = type,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.OrgUnits.Add(o);
        return o;
    }

    private static Announcement MakeAnnouncement(int id, int authorId, OrgUnitType? level, int? orgUnitId, int? functionId, ApplicationContext db)
    {
        var a = new Announcement
        {
            Id = id, Title = $"Ann{id}", Body = "body", AuthorId = authorId,
            TargetLevel = level, TargetOrgUnitId = orgUnitId, TargetFunctionId = functionId,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.Announcements.Add(a);
        return a;
    }

    [Fact]
    public async Task GetDeltaAsync_NoTargeting_ReturnedForAllMembers()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_NoTargeting_ReturnedForAllMembers));
        MakeOrgUnit(1, OrgUnitType.Municipal, db);
        MakeMember(1, 1, db);
        MakeAnnouncement(1, 1, null, null, null, db);
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Single(result.Announcements);
    }

    [Fact]
    public async Task GetDeltaAsync_OrgUnitTargeting_ExcludesDifferentUnit()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_OrgUnitTargeting_ExcludesDifferentUnit));
        MakeOrgUnit(1, OrgUnitType.Municipal, db);
        MakeOrgUnit(2, OrgUnitType.Municipal, db);
        MakeMember(1, orgUnitId: 1, db);
        MakeAnnouncement(1, 1, null, orgUnitId: 2, null, db); // targeted to unit 2
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Empty(result.Announcements);
    }

    [Fact]
    public async Task GetDeltaAsync_FunctionTargeting_ExcludesNonHolder()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_FunctionTargeting_ExcludesNonHolder));
        MakeOrgUnit(1, OrgUnitType.Municipal, db);
        MakeMember(1, orgUnitId: 1, db);
        // Member has no MemberFunctions, announcement targets function 5
        MakeAnnouncement(1, 1, null, null, functionId: 5, db);
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Empty(result.Announcements);
    }
}
```

- [ ] **Run tests — expect compile failure**
  ```powershell
  dotnet test src/backend/Marsipan.Membership.Telegram.Tests --filter "SyncServiceTests"
  ```
  Expected: Build failure — `SyncService` not found.

- [ ] **Create service interfaces**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementService.cs
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface IAnnouncementService
{
    Task<AnnouncementDto> CreateAsync(int authorMemberId, CreateAnnouncementRequest request, CancellationToken ct = default);
    Task LikeAsync(int announcementId, int memberId, CancellationToken ct = default);
    Task UnlikeAsync(int announcementId, int memberId, CancellationToken ct = default);
}
```

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/ISyncService.cs
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ISyncService
{
    Task<SyncResponseDto> GetDeltaAsync(int memberId, DateTime? since, CancellationToken ct = default);
}
```

- [ ] **Create `SyncService.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/SyncService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class SyncService : ISyncService
{
    private readonly ApplicationContext _db;

    public SyncService(ApplicationContext db) => _db = db;

    public async Task<SyncResponseDto> GetDeltaAsync(int memberId, DateTime? since, CancellationToken ct = default)
    {
        var member = await _db.Members
            .Include(m => m.OrgUnit)
            .Include(m => m.MemberFunctions)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct)
            ?? throw new KeyNotFoundException($"Member {memberId} not found.");

        var memberFunctionIds = member.MemberFunctions.Select(mf => mf.FunctionId).ToHashSet();

        var query = _db.Announcements
            .Include(a => a.Attachments)
            .Include(a => a.Author)
            .Include(a => a.Likes)
            .Where(a =>
                (a.TargetOrgUnitId == null || a.TargetOrgUnitId == member.OrgUnitId) &&
                (a.TargetLevel == null || a.TargetLevel == member.OrgUnit.Type) &&
                (a.TargetFunctionId == null || memberFunctionIds.Contains(a.TargetFunctionId.Value)));

        if (since.HasValue)
            query = query.Where(a => a.LastModifiedDate > since.Value);

        var announcements = await query.OrderByDescending(a => a.CreatedDate).ToListAsync(ct);

        var announcementIds = announcements.Select(a => a.Id).ToList();
        var likes = await _db.AnnouncementLikes
            .Where(l => announcementIds.Contains(l.AnnouncementId))
            .ToListAsync(ct);

        var announcementDtos = announcements.Select(a => new AnnouncementDto(
            a.Id,
            a.Title,
            a.Body,
            a.AuthorId,
            $"{a.Author.FirstName} {a.Author.LastName}",
            a.TargetLevel,
            a.TargetOrgUnitId,
            a.TargetFunctionId,
            a.CreatedDate,
            a.Likes.Count,
            a.Likes.Any(l => l.MemberId == memberId),
            a.Attachments.Select(at => new AttachmentDto(at.Id, at.FileName, at.FileUrl, at.FileSize, at.MimeType)).ToList()
        )).ToList();

        var likeDtos = likes.Select(l => new AnnouncementLikeDto(l.AnnouncementId, l.MemberId)).ToList();

        return new SyncResponseDto(announcementDtos, likeDtos, DateTime.UtcNow);
    }
}
```

- [ ] **Create `AnnouncementService.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly ApplicationContext _db;
    private readonly IAnnouncementNotifier? _notifier;

    public AnnouncementService(ApplicationContext db, IAnnouncementNotifier? notifier = null)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<AnnouncementDto> CreateAsync(int authorMemberId, CreateAnnouncementRequest request, CancellationToken ct = default)
    {
        var author = await _db.Members.FindAsync([authorMemberId], ct)
            ?? throw new KeyNotFoundException($"Member {authorMemberId} not found.");

        var announcement = new Announcement
        {
            Title = request.Title,
            Body = request.Body,
            AuthorId = authorMemberId,
            TargetLevel = request.TargetLevel,
            TargetOrgUnitId = request.TargetOrgUnitId,
            TargetFunctionId = request.TargetFunctionId,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = authorMemberId.ToString(),
            LastModifiedByUserId = authorMemberId.ToString()
        };

        if (request.AttachmentIds.Count > 0)
        {
            var attachments = await _db.Attachments
                .Where(a => request.AttachmentIds.Contains(a.Id) && a.AnnouncementId == null)
                .ToListAsync(ct);
            foreach (var att in attachments)
                announcement.Attachments.Add(att);
        }

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(ct);

        if (_notifier is not null)
            await _notifier.NotifyAsync(announcement, ct);

        return new AnnouncementDto(
            announcement.Id, announcement.Title, announcement.Body,
            announcement.AuthorId, $"{author.FirstName} {author.LastName}",
            announcement.TargetLevel, announcement.TargetOrgUnitId, announcement.TargetFunctionId,
            announcement.CreatedDate, 0, false,
            announcement.Attachments.Select(a => new AttachmentDto(a.Id, a.FileName, a.FileUrl, a.FileSize, a.MimeType)).ToList());
    }

    public async Task LikeAsync(int announcementId, int memberId, CancellationToken ct = default)
    {
        var exists = await _db.AnnouncementLikes.AnyAsync(l => l.AnnouncementId == announcementId && l.MemberId == memberId, ct);
        if (exists) return;

        _db.AnnouncementLikes.Add(new AnnouncementLike
        {
            AnnouncementId = announcementId,
            MemberId = memberId,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = memberId.ToString(),
            LastModifiedByUserId = memberId.ToString()
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task UnlikeAsync(int announcementId, int memberId, CancellationToken ct = default)
    {
        var like = await _db.AnnouncementLikes.FirstOrDefaultAsync(l => l.AnnouncementId == announcementId && l.MemberId == memberId, ct);
        if (like is null) return;
        _db.AnnouncementLikes.Remove(like);
        await _db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Run tests — expect PASS**
  ```powershell
  dotnet test src/backend/Marsipan.Membership.Telegram.Tests
  ```
  Expected: 6 tests pass.

- [ ] **Build Middleware**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Services/ `
          src/backend/Marsipan.Membership.Telegram.Tests/Services/SyncServiceTests.cs
  git commit -m "feat: add AnnouncementService and SyncService with targeting filter"
  ```

---

## Task 11: Add AttachmentService

**Files:** Create `Services/IAttachmentService.cs`, `Services/AttachmentService.cs`

- [ ] **Create interface**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IAttachmentService.cs
using Marsipan.Membership.Middleware.DTOs;
using Microsoft.AspNetCore.Http;

namespace Marsipan.Membership.Middleware.Services;

public interface IAttachmentService
{
    Task<AttachmentDto> SaveAsync(IFormFile file, int uploaderMemberId, CancellationToken ct = default);
}
```

- [ ] **Create implementation**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/AttachmentService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

public class AttachmentService : IAttachmentService
{
    private readonly ApplicationContext _db;
    private readonly FileStorageOptions _opts;

    public AttachmentService(ApplicationContext db, IOptions<FileStorageOptions> opts)
    {
        _db = db;
        _opts = opts.Value;
    }

    public async Task<AttachmentDto> SaveAsync(IFormFile file, int uploaderMemberId, CancellationToken ct = default)
    {
        if (file.Length > _opts.MaxBytesPerFile)
            throw new ArgumentException($"File exceeds maximum allowed size of {_opts.MaxBytesPerFile} bytes.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (_opts.AllowedExtensions.Length > 0 && !_opts.AllowedExtensions.Contains(ext))
            throw new ArgumentException($"File extension '{ext}' is not allowed.");

        var storedName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var uploadRoot = _opts.UploadRoot ?? "wwwroot/uploads";
        var dir = Path.Combine(uploadRoot, "telegram");
        Directory.CreateDirectory(dir);

        var fullPath = Path.Combine(dir, storedName);
        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        var fileUrl = $"/uploads/telegram/{storedName}";

        var attachment = new Attachment
        {
            FileName = file.FileName,
            StoredName = storedName,
            FileUrl = fileUrl,
            FileSize = file.Length,
            MimeType = file.ContentType,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = uploaderMemberId.ToString(),
            LastModifiedByUserId = uploaderMemberId.ToString()
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync(ct);

        return new AttachmentDto(attachment.Id, attachment.FileName, attachment.FileUrl, attachment.FileSize, attachment.MimeType);
    }
}
```

- [ ] **Build and commit**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Middleware
  git add src/backend/Marsipan.Membership.Middleware/Services/IAttachmentService.cs `
          src/backend/Marsipan.Membership.Middleware/Services/AttachmentService.cs
  git commit -m "feat: add AttachmentService to Middleware"
  ```

---

## Task 12: Run EF migrations

- [ ] **Add `AddAnnouncements` migration** (run from repo root)
  ```powershell
  dotnet ef migrations add AddAnnouncements `
    --project src/backend/Marsipan.Membership.Middleware `
    --startup-project src/backend/Marsipan.Membership.Web
  ```
  Expected: New migration files created in `Middleware/Migrations/`.

- [ ] **Add `AddTelegramLink` migration**
  ```powershell
  dotnet ef migrations add AddTelegramLink `
    --project src/backend/Marsipan.Membership.Middleware `
    --startup-project src/backend/Marsipan.Membership.Web
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Middleware/Migrations/
  git commit -m "feat: add AddAnnouncements and AddTelegramLink EF migrations"
  ```

---

## Task 13: Scaffold Telegram API project

**Files:** Create `.csproj`, `appsettings.json`, `appsettings.Development.json`, `launchSettings.json`

- [ ] **Create the project**
  ```powershell
  dotnet new webapi -n Marsipan.Membership.Telegram.API `
    -o src/backend/Marsipan.Membership.Telegram.API `
    --framework net10.0 --no-openapi
  ```

- [ ] **Add references and packages**
  ```powershell
  dotnet add src/backend/Marsipan.Membership.Telegram.API reference src/backend/Marsipan.Membership.Middleware
  dotnet add src/backend/Marsipan.Membership.Telegram.API package Microsoft.AspNetCore.Authentication.JwtBearer
  dotnet add src/backend/Marsipan.Membership.Telegram.API package Microsoft.EntityFrameworkCore.Design
  dotnet add src/backend/Marsipan.Membership.Telegram.API package Telegram.Bot --version 22.*
  dotnet add src/backend/Marsipan.Membership.Telegram.API package Microsoft.AspNetCore.Identity.EntityFrameworkCore
  ```

- [ ] **Add to solution**
  ```powershell
  dotnet sln src/backend/Marsipan.Membership.sln add src/backend/Marsipan.Membership.Telegram.API
  ```

- [ ] **Delete scaffold boilerplate** (WeatherForecast files)
  ```powershell
  Remove-Item src/backend/Marsipan.Membership.Telegram.API/WeatherForecast.cs -ErrorAction SilentlyContinue
  Remove-Item src/backend/Marsipan.Membership.Telegram.API/Controllers/WeatherForecastController.cs -ErrorAction SilentlyContinue
  ```

- [ ] **Create `appsettings.json`**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=MarcipanoTelegramDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Issuer": "MarsipanMembership",
    "Audience": "MarcipanoTelegram",
    "SecretKey": "REPLACE_WITH_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS_FOR_HS256",
    "ExpiresMinutes": 1440
  },
  "Telegram": {
    "BotToken": "REPLACE_WITH_BOT_TOKEN",
    "MiniAppUrl": "https://localhost:5182"
  },
  "FileStorage": {
    "UploadRoot": "wwwroot/uploads",
    "MaxBytesPerFile": 10485760
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Create `appsettings.Development.json`**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=MarcipanoTelegramDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  }
}
```

- [ ] **Create `Properties/launchSettings.json`**

```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "http://localhost:5147",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "https": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "https://localhost:7228;http://localhost:5147",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

- [ ] **Build the new project**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Telegram.API
  ```

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Telegram.API/ src/backend/Marsipan.Membership.sln
  git commit -m "feat: scaffold Marsipan.Membership.Telegram.API project"
  ```

---

## Task 14: Write Program.cs for Telegram API

**Files:** Modify `src/backend/Marsipan.Membership.Telegram.API/Program.cs`

- [ ] **Replace auto-generated Program.cs entirely**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Program.cs
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

// Identity is required because ApplicationContext extends IdentityDbContext.
// We do not use Identity for auth in this project — Telegram handles auth.
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

// Options
builder.Services.Configure<TelegramOptions>(builder.Configuration.GetSection("Telegram"));
builder.Services.Configure<FileStorageOptions>(builder.Configuration.GetSection("FileStorage"));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

// Services
builder.Services.AddScoped<ITelegramAuthService, TelegramAuthService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<IAttachmentService, AttachmentService>();
builder.Services.AddSingleton<IAnnouncementNotifier, TelegramBotService>();
builder.Services.AddHostedService(sp => (TelegramBotService)sp.GetRequiredService<IAnnouncementNotifier>());

// JWT
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
        policy.WithOrigins("http://localhost:5182", "https://localhost:5182")
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
```

- [ ] **Build**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Telegram.API
  ```
  Expected: Will fail — `TelegramBotService` not yet created. Proceed to next task.

- [ ] **Commit the partial Program.cs**
  ```powershell
  git add src/backend/Marsipan.Membership.Telegram.API/Program.cs
  git commit -m "feat: wire up Program.cs for Telegram API"
  ```

---

## Task 15: Create TelegramBotService

**Files:** Create `Services/TelegramBotService.cs`

- [ ] **Create the service**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using Telegram.Bot.Types.ReplyMarkups;

namespace Marsipan.Membership.Telegram.API.Services;

public class TelegramBotService : IAnnouncementNotifier, IHostedService
{
    private readonly TelegramOptions _opts;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TelegramBotService> _logger;
    private TelegramBotClient? _botClient;

    public TelegramBotService(
        IOptions<TelegramOptions> opts,
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramBotService> logger)
    {
        _opts = opts.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(_opts.BotToken) && _opts.BotToken != "REPLACE_WITH_BOT_TOKEN")
            _botClient = new TelegramBotClient(_opts.BotToken);
        else
            _logger.LogWarning("Telegram BotToken not configured — bot notifications disabled.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

    public async Task NotifyAsync(Announcement announcement, CancellationToken ct = default)
    {
        if (_botClient is null) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();

        var memberFunctionIds = announcement.TargetFunctionId.HasValue
            ? await db.MemberFunctions
                .Where(mf => mf.FunctionId == announcement.TargetFunctionId.Value)
                .Select(mf => mf.MemberId).ToHashSetAsync(ct)
            : null;

        var linksQuery = db.TelegramLinks
            .Include(t => t.Member).ThenInclude(m => m.OrgUnit)
            .Where(t => !t.IsDeleted);

        if (announcement.TargetOrgUnitId.HasValue)
            linksQuery = linksQuery.Where(t => t.Member.OrgUnitId == announcement.TargetOrgUnitId.Value);

        if (announcement.TargetLevel.HasValue)
            linksQuery = linksQuery.Where(t => t.Member.OrgUnit.Type == announcement.TargetLevel.Value);

        var links = await linksQuery.ToListAsync(ct);

        if (memberFunctionIds is not null)
            links = links.Where(t => memberFunctionIds.Contains(t.MemberId)).ToList();

        var button = new InlineKeyboardMarkup(
            InlineKeyboardButton.WithWebApp("Read", new Telegram.Bot.Types.WebAppInfo { Url = _opts.MiniAppUrl }));

        // Telegram Bot API: 30 messages/second max
        var batches = links.Chunk(30);
        foreach (var batch in batches)
        {
            var tasks = batch.Select(link =>
                _botClient.SendMessage(
                    chatId: link.TelegramUserId,
                    text: $"📢 *{EscapeMarkdown(announcement.Title)}*",
                    parseMode: Telegram.Bot.Types.Enums.ParseMode.MarkdownV2,
                    replyMarkup: button,
                    cancellationToken: ct)
                .ContinueWith(t =>
                {
                    if (t.IsFaulted)
                        _logger.LogWarning("Failed to notify TelegramUserId {Id}: {Err}", link.TelegramUserId, t.Exception?.Message);
                }, CancellationToken.None));

            await Task.WhenAll(tasks);
            await Task.Delay(1100, ct); // stay within 30 msg/sec
        }
    }

    private static string EscapeMarkdown(string text) =>
        System.Text.RegularExpressions.Regex.Replace(text, @"([_*\[\]()~`>#+\-=|{}.!\\])", @"\$1");
}
```

- [ ] **Build the Telegram API project**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Telegram.API
  ```
  Expected: Build succeeded.

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs
  git commit -m "feat: implement TelegramBotService as IHostedService + IAnnouncementNotifier"
  ```

---

## Task 16: Implement API controllers

**Files:** Create all four controllers

- [ ] **Create `TelegramAuthController.cs`**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Controllers/TelegramAuthController.cs
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/telegram/auth")]
public class TelegramAuthController : ControllerBase
{
    private readonly ITelegramAuthService _auth;
    public TelegramAuthController(ITelegramAuthService auth) => _auth = auth;

    public record TelegramAuthRequest(string InitData);

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Auth([FromBody] TelegramAuthRequest request, CancellationToken ct)
    {
        var result = await _auth.AuthenticateAsync(request.InitData, ct);
        if (result is null) return Unauthorized();
        return Ok(result);
    }
}
```

- [ ] **Create `AnnouncementsController.cs`**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Controllers/AnnouncementsController.cs
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize(Policy = "ApiPolicy")]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcements;

    public AnnouncementsController(IAnnouncementService announcements) => _announcements = announcements;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpPost]
    public async Task<ActionResult<AnnouncementDto>> Create([FromBody] CreateAnnouncementRequest request, CancellationToken ct)
    {
        var result = await _announcements.CreateAsync(MemberId, request, ct);
        return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
    }

    [HttpPost("{id:int}/like")]
    public async Task<IActionResult> Like(int id, CancellationToken ct)
    {
        await _announcements.LikeAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/like")]
    public async Task<IActionResult> Unlike(int id, CancellationToken ct)
    {
        await _announcements.UnlikeAsync(id, MemberId, ct);
        return NoContent();
    }
}
```

- [ ] **Create `SyncController.cs`**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Controllers/SyncController.cs
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/sync")]
[Authorize(Policy = "ApiPolicy")]
public class SyncController : ControllerBase
{
    private readonly ISyncService _sync;
    public SyncController(ISyncService sync) => _sync = sync;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpGet]
    public async Task<ActionResult<SyncResponseDto>> Sync([FromQuery] DateTime? since, CancellationToken ct)
    {
        var result = await _sync.GetDeltaAsync(MemberId, since, ct);
        return Ok(result);
    }
}
```

- [ ] **Create `AttachmentsController.cs`**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Controllers/AttachmentsController.cs
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize(Policy = "ApiPolicy")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachments;
    public AttachmentsController(IAttachmentService attachments) => _attachments = attachments;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpPost("upload")]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<AttachmentDto>> Upload(IFormFile file, CancellationToken ct)
    {
        var result = await _attachments.SaveAsync(file, MemberId, ct);
        return Ok(result);
    }
}
```

- [ ] **Build the full API project**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.Telegram.API
  ```
  Expected: Build succeeded, 0 errors.

- [ ] **Commit**
  ```powershell
  git add src/backend/Marsipan.Membership.Telegram.API/Controllers/
  git commit -m "feat: implement all four Telegram API controllers"
  ```

---

## Task 17: Apply migrations to the Telegram database

- [ ] **Apply all migrations to the separate Telegram database**
  ```powershell
  dotnet ef database update `
    --project src/backend/Marsipan.Membership.Middleware `
    --startup-project src/backend/Marsipan.Membership.Telegram.API
  ```
  Expected: `MarcipanoTelegramDb` created in LocalDB with all tables including `Announcements`, `TelegramLinks`, etc.

- [ ] **Smoke-test the API starts**
  ```powershell
  dotnet run --project src/backend/Marsipan.Membership.Telegram.API --launch-profile http
  ```
  Open `http://localhost:5147/health` — expect `200 ok`.
  Stop the process with Ctrl+C.

- [ ] **Commit (no file changes — just confirms milestone)**
  ```powershell
  git commit --allow-empty -m "chore: Telegram API migrated and smoke-tested"
  ```

---

## Task 18: Scaffold MarcipanoTelegram React client

**Files:** `package.json`, `vite.config.js`, `index.html`

- [ ] **Create `package.json`**

```json
{
  "name": "marcipano-telegram",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5182",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "dexie": "^4.0.10",
    "dexie-react-hooks": "^1.1.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.5.0",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.7",
    "vite": "^6.3.5",
    "@tailwindcss/vite": "^4.1.7"
  }
}
```

- [ ] **Create `vite.config.js`**

```js
// src/client/MarcipanoTelegram/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5182, strictPort: true },
});
```

- [ ] **Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Marcipano</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Install dependencies**
  ```powershell
  cd src/client/MarcipanoTelegram
  npm install
  cd ../../..
  ```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/package.json `
          src/client/MarcipanoTelegram/vite.config.js `
          src/client/MarcipanoTelegram/index.html `
          src/client/MarcipanoTelegram/package-lock.json
  git commit -m "feat: scaffold MarcipanoTelegram client"
  ```

---

## Task 19: Add framework layer (api.js, auth.js, telegram.js)

**Files:** Create `src/framework/api.js`, `auth.js`, `telegram.js`

- [ ] **Create `src/framework/api.js`**

```js
// src/client/MarcipanoTelegram/src/framework/api.js
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5147';

async function request(method, path, body) {
  const token = sessionStorage.getItem('access_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/';
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  delete: (path) => request('DELETE', path),
  upload: async (path, file) => {
    const token = sessionStorage.getItem('access_token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
```

- [ ] **Create `src/framework/auth.js`**

```js
// src/client/MarcipanoTelegram/src/framework/auth.js
export const auth = {
  isAuthenticated: () => !!sessionStorage.getItem('access_token'),
  getToken: () => sessionStorage.getItem('access_token'),
  getMemberId: () => {
    const id = sessionStorage.getItem('user_id');
    return id ? parseInt(id, 10) : null;
  },
  getDisplayName: () => sessionStorage.getItem('user_name') ?? '',
  getFunctionIds: () => {
    const raw = sessionStorage.getItem('function_ids');
    return raw ? JSON.parse(raw) : [];
  },
  store: ({ token, memberId, displayName, orgUnitId, functionIds }) => {
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('user_id', String(memberId));
    sessionStorage.setItem('user_name', displayName);
    sessionStorage.setItem('org_unit_id', String(orgUnitId));
    sessionStorage.setItem('function_ids', JSON.stringify(functionIds));
  },
  clear: () => sessionStorage.clear(),
};
```

- [ ] **Create `src/framework/telegram.js`**

```js
// src/client/MarcipanoTelegram/src/framework/telegram.js
import { api } from './api.js';
import { auth } from './auth.js';

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export async function initTelegramAuth() {
  const tg = getTelegramWebApp();

  // Dev fallback: skip Telegram auth if no initData available
  if (!tg || !tg.initData) {
    console.warn('No Telegram WebApp initData — running in dev mode without auth.');
    return false;
  }

  tg.ready();
  tg.expand();

  try {
    const result = await api.post('/api/telegram/auth', { initData: tg.initData });
    auth.store({
      token: result.token,
      memberId: result.memberId,
      displayName: result.displayName,
      orgUnitId: result.orgUnitId,
      functionIds: result.functionIds,
    });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/framework/
  git commit -m "feat: add api, auth, and telegram framework modules"
  ```

---

## Task 20: Add Dexie schema and hooks

**Files:** Create `src/db/schema.js`, `src/db/hooks.js`

- [ ] **Create `src/db/schema.js`**

```js
// src/client/MarcipanoTelegram/src/db/schema.js
import Dexie from 'dexie';

export const db = new Dexie('MarcipanoTelegram');

db.version(1).stores({
  announcements: 'id, createdDate, authorId, targetOrgUnitId, targetLevel',
  announcementLikes: '[announcementId+memberId], announcementId, memberId',
  outbox: '++id, action, status, createdAt',
  syncMeta: 'key',
});

/** @typedef {{ id: number, title: string, body: string, authorId: number, authorName: string, targetLevel: string|null, targetOrgUnitId: number|null, targetFunctionId: number|null, createdDate: string, likeCount: number, likedByMe: boolean, attachments: Array }} Announcement */
/** @typedef {{ announcementId: number, memberId: number }} AnnouncementLike */
/** @typedef {{ id?: number, action: string, payload: object, status: 'pending'|'failed', createdAt: number }} OutboxItem */
/** @typedef {{ key: string, value: string }} SyncMeta */
```

- [ ] **Create `src/db/hooks.js`**

```js
// src/client/MarcipanoTelegram/src/db/hooks.js
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema.js';
import { auth } from '../framework/auth.js';

export function useAnnouncements() {
  return useLiveQuery(() => db.announcements.orderBy('createdDate').reverse().toArray(), []);
}

export function useAnnouncement(id) {
  return useLiveQuery(() => db.announcements.get(id), [id]);
}

export function useUnreadCount() {
  return useLiveQuery(async () => {
    const meta = await db.syncMeta.get('lastSeen');
    if (!meta) return 0;
    const lastSeen = parseInt(meta.value, 10);
    return db.announcements.where('createdDate').above(new Date(lastSeen).toISOString()).count();
  }, []);
}

export function useAnnouncementLike(announcementId) {
  const memberId = auth.getMemberId();
  return useLiveQuery(
    () => db.announcementLikes.get([announcementId, memberId]),
    [announcementId, memberId]
  );
}

export function useSyncMeta() {
  return useLiveQuery(() => db.syncMeta.get('lastSync'), []);
}

export function useOutboxCount() {
  return useLiveQuery(() => db.outbox.where('status').equals('pending').count(), []);
}

export async function toggleLike(announcement) {
  const memberId = auth.getMemberId();
  const key = [announcement.id, memberId];
  const existing = await db.announcementLikes.get(key);

  if (existing) {
    await db.announcementLikes.delete(key);
    await db.announcements.update(announcement.id, { likedByMe: false, likeCount: Math.max(0, announcement.likeCount - 1) });
    await db.outbox.add({ action: 'UNLIKE_ANNOUNCEMENT', payload: { id: announcement.id }, status: 'pending', createdAt: Date.now() });
  } else {
    await db.announcementLikes.put({ announcementId: announcement.id, memberId });
    await db.announcements.update(announcement.id, { likedByMe: true, likeCount: announcement.likeCount + 1 });
    await db.outbox.add({ action: 'LIKE_ANNOUNCEMENT', payload: { id: announcement.id }, status: 'pending', createdAt: Date.now() });
  }
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/db/
  git commit -m "feat: add Dexie schema and hooks"
  ```

---

## Task 21: Add sync engine

**Files:** Create `src/sync/syncEngine.js`

- [ ] **Create `src/sync/syncEngine.js`**

```js
// src/client/MarcipanoTelegram/src/sync/syncEngine.js
import { api } from '../framework/api.js';
import { auth } from '../framework/auth.js';
import { db } from '../db/schema.js';

let syncing = false;

export async function sync() {
  if (syncing || !auth.isAuthenticated()) return;
  syncing = true;
  try {
    const meta = await db.syncMeta.get('lastSync');
    const since = meta?.value ?? null;

    const data = await api.get(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`);

    await db.transaction('rw', [db.announcements, db.announcementLikes, db.syncMeta], async () => {
      for (const ann of data.announcements) {
        await db.announcements.put(ann);
      }
      for (const like of data.announcementLikes) {
        await db.announcementLikes.put(like);
      }
      await db.syncMeta.put({ key: 'lastSync', value: data.serverTime });
    });

    await flushOutbox();
  } catch (err) {
    console.warn('Sync failed:', err);
  } finally {
    syncing = false;
  }
}

async function flushOutbox() {
  const pending = await db.outbox.where('status').equals('pending').toArray();
  for (const item of pending) {
    try {
      if (item.action === 'LIKE_ANNOUNCEMENT') {
        await api.post(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'UNLIKE_ANNOUNCEMENT') {
        await api.delete(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'CREATE_ANNOUNCEMENT') {
        await api.post('/api/announcements', item.payload);
      }
      await db.outbox.delete(item.id);
    } catch {
      await db.outbox.update(item.id, { status: 'failed' });
    }
  }
}

export function startSyncLoop(intervalMs = 30_000) {
  sync();
  return setInterval(() => {
    if (navigator.onLine) sync();
  }, intervalMs);
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/sync/syncEngine.js
  git commit -m "feat: add syncEngine with delta sync and outbox flush"
  ```

---

## Task 22: Add global CSS and App shell

**Files:** Create `src/index.css`, `src/main.jsx`, `src/App.jsx`

- [ ] **Create `src/index.css`**

```css
/* src/client/MarcipanoTelegram/src/index.css */
@import "tailwindcss";

@theme {
  --color-bg: var(--tg-theme-bg-color, #0f1729);
  --color-surface: var(--tg-theme-secondary-bg-color, #1a2744);
  --color-accent: var(--tg-theme-button-color, #e8b84b);
  --color-accent-text: var(--tg-theme-button-text-color, #ffffff);
  --color-text: var(--tg-theme-text-color, #ffffff);
  --color-hint: var(--tg-theme-hint-color, #8a9ab5);
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
}

.page-content {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

- [ ] **Create `src/main.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Create `src/App.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initTelegramAuth } from './framework/telegram.js';
import { auth } from './framework/auth.js';
import { startSyncLoop } from './sync/syncEngine.js';
import AppHeader from './components/AppHeader.jsx';
import SyncStatusBar from './components/SyncStatusBar.jsx';
import FeedPage from './pages/FeedPage.jsx';
import AnnouncementDetailPage from './pages/AnnouncementDetailPage.jsx';
import ComposePage from './pages/ComposePage.jsx';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(auth.isAuthenticated());

  useEffect(() => {
    if (!authed) {
      initTelegramAuth().then((ok) => {
        setAuthed(ok || auth.isAuthenticated());
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const id = startSyncLoop(30_000);
    return () => clearInterval(id);
  }, [authed]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-hint)' }}>Loading…</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-hint)' }}>Unable to authenticate. Please open this app inside Telegram.</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppHeader />
      <SyncStatusBar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/index.css `
          src/client/MarcipanoTelegram/src/main.jsx `
          src/client/MarcipanoTelegram/src/App.jsx
  git commit -m "feat: add global CSS and App shell for MarcipanoTelegram"
  ```

---

## Task 23: Add AppHeader and SyncStatusBar components

**Files:** Create `src/components/AppHeader.jsx`, `src/components/SyncStatusBar.jsx`

- [ ] **Create `src/components/AppHeader.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/components/AppHeader.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../framework/auth.js';
import { getTelegramWebApp } from '../framework/telegram.js';
import { useUnreadCount } from '../db/hooks.js';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadCount() ?? 0;
  const isDetail = location.pathname.startsWith('/announcement/');
  const isCompose = location.pathname === '/compose';
  const tg = getTelegramWebApp();

  useEffect(() => {
    if (!tg) return;
    if (isDetail || isCompose) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => navigate('/'));
    } else {
      tg.BackButton.hide();
    }
    return () => tg.BackButton.offClick(() => navigate('/'));
  }, [location.pathname, tg, navigate]);

  const initials = auth.getDisplayName().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--color-surface)' }}>
      {isDetail || isCompose ? (
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {isCompose ? 'New Announcement' : 'Announcement'}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Marcipano</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!isDetail && !isCompose && (
          <button onClick={() => navigate('/compose')} className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            + New
          </button>
        )}
        <div className="relative">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            {initials || '?'}
          </div>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: '#e53935', color: '#fff' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Create `src/components/SyncStatusBar.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/components/SyncStatusBar.jsx
import React, { useEffect, useState } from 'react';
import { useSyncMeta, useOutboxCount } from '../db/hooks.js';

export default function SyncStatusBar() {
  const [online, setOnline] = useState(navigator.onLine);
  const syncMeta = useSyncMeta();
  const outboxCount = useOutboxCount() ?? 0;

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  if (online && outboxCount === 0) return null;

  const message = !online
    ? 'Offline — changes will sync when connected'
    : `Syncing ${outboxCount} pending change${outboxCount !== 1 ? 's' : ''}…`;

  return (
    <div className="px-4 py-2 text-xs text-center"
      style={{ backgroundColor: online ? 'var(--color-accent)' : '#b71c1c', color: online ? 'var(--color-accent-text)' : '#fff' }}>
      {message}
    </div>
  );
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/components/
  git commit -m "feat: add AppHeader and SyncStatusBar components"
  ```

---

## Task 24: Implement FeedPage

**Files:** Create `src/pages/FeedPage.jsx`

- [ ] **Create `src/pages/FeedPage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/FeedPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnouncements } from '../db/hooks.js';
import { sync } from '../sync/syncEngine.js';

export default function FeedPage() {
  const navigate = useNavigate();
  const announcements = useAnnouncements() ?? [];

  return (
    <div className="px-4 pt-3 space-y-3">
      {announcements.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-hint)' }}>
          No announcements yet.
        </p>
      )}
      {announcements.map((ann) => (
        <button
          key={ann.id}
          onClick={() => navigate(`/announcement/${ann.id}`)}
          className="w-full text-left rounded-xl p-4 transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            {ann.title}
          </p>
          <p className="text-xs line-clamp-2" style={{ color: 'var(--color-hint)' }}>
            {ann.body}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs" style={{ color: 'var(--color-hint)' }}>
              {new Date(ann.createdDate).toLocaleDateString()}
            </span>
            <span className="text-xs" style={{ color: ann.likedByMe ? 'var(--color-accent)' : 'var(--color-hint)' }}>
              ♥ {ann.likeCount}
            </span>
            {ann.attachments?.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-hint)' }}>
                📎 {ann.attachments.length}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/pages/FeedPage.jsx
  git commit -m "feat: implement FeedPage"
  ```

---

## Task 25: Implement AnnouncementDetailPage

**Files:** Create `src/pages/AnnouncementDetailPage.jsx`

- [ ] **Create `src/pages/AnnouncementDetailPage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/AnnouncementDetailPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAnnouncement, toggleLike } from '../db/hooks.js';

export default function AnnouncementDetailPage() {
  const { id } = useParams();
  const ann = useAnnouncement(parseInt(id, 10));

  if (!ann) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span style={{ color: 'var(--color-hint)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {ann.title}
      </h1>
      <p className="text-xs mb-4" style={{ color: 'var(--color-hint)' }}>
        {ann.authorName} · {new Date(ann.createdDate).toLocaleDateString()}
      </p>
      <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
        {ann.body}
      </p>

      {ann.attachments?.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-hint)' }}>
            Attachments
          </p>
          {ann.attachments.map((att) => (
            <a
              key={att.id}
              href={att.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <span>📎</span>
              <span className="truncate">{att.fileName}</span>
              <span className="ml-auto text-xs" style={{ color: 'var(--color-hint)' }}>
                {(att.fileSize / 1024).toFixed(0)} KB
              </span>
            </a>
          ))}
        </div>
      )}

      <button
        onClick={() => toggleLike(ann)}
        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity active:opacity-70"
        style={{
          backgroundColor: ann.likedByMe ? 'var(--color-accent)' : 'var(--color-surface)',
          color: ann.likedByMe ? 'var(--color-accent-text)' : 'var(--color-text)',
        }}
      >
        ♥ {ann.likeCount} {ann.likedByMe ? 'Liked' : 'Like'}
      </button>
    </div>
  );
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/pages/AnnouncementDetailPage.jsx
  git commit -m "feat: implement AnnouncementDetailPage"
  ```

---

## Task 26: Implement ComposePage

**Files:** Create `src/pages/ComposePage.jsx`

- [ ] **Create `src/pages/ComposePage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/ComposePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../framework/api.js';
import { db } from '../db/schema.js';
import { auth } from '../framework/auth.js';
import { sync } from '../sync/syncEngine.js';

export default function ComposePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetLevel, setTargetLevel] = useState('');
  const [targetOrgUnitId, setTargetOrgUnitId] = useState('');
  const [targetFunctionId, setTargetFunctionId] = useState('');
  const [attachmentIds, setAttachmentIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await api.upload('/api/attachments/upload', file);
      setAttachmentIds((prev) => [...prev, result.id]);
    } catch {
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await db.outbox.add({
        action: 'CREATE_ANNOUNCEMENT',
        payload: {
          title: title.trim(),
          body: body.trim(),
          targetLevel: targetLevel || null,
          targetOrgUnitId: targetOrgUnitId ? parseInt(targetOrgUnitId, 10) : null,
          targetFunctionId: targetFunctionId ? parseInt(targetFunctionId, 10) : null,
          attachmentIds,
        },
        status: 'pending',
        createdAt: Date.now(),
      });
      await sync();
      navigate('/');
    } catch {
      setError('Failed to submit announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.5rem',
    padding: '0.6rem 0.75rem',
    width: '100%',
    fontSize: '0.875rem',
  };

  const labelStyle = { fontSize: '0.75rem', color: 'var(--color-hint)', marginBottom: '0.25rem', display: 'block' };

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
        </div>

        <div>
          <label style={labelStyle}>Body *</label>
          <textarea
            style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement…"
          />
        </div>

        <div>
          <label style={labelStyle}>Target Level (optional)</label>
          <select style={inputStyle} value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="City">City</option>
            <option value="Municipal">Municipal</option>
            <option value="MainCommittee">Main Committee</option>
            <option value="ExecutiveCommittee">Executive Committee</option>
            <option value="Presidency">Presidency</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Target Org Unit ID (optional)</label>
          <input style={inputStyle} type="number" value={targetOrgUnitId}
            onChange={(e) => setTargetOrgUnitId(e.target.value)} placeholder="Leave blank for all units" />
        </div>

        <div>
          <label style={labelStyle}>Target Function ID (optional)</label>
          <input style={inputStyle} type="number" value={targetFunctionId}
            onChange={(e) => setTargetFunctionId(e.target.value)} placeholder="Leave blank for all functions" />
        </div>

        <div>
          <label style={labelStyle}>Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} disabled={uploading}
            style={{ ...inputStyle, cursor: 'pointer' }} />
          {attachmentIds.length > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
              {attachmentIds.length} file{attachmentIds.length !== 1 ? 's' : ''} attached
            </p>
          )}
        </div>

        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
        >
          {submitting ? 'Sending…' : 'Publish Announcement'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Commit**
  ```powershell
  git add src/client/MarcipanoTelegram/src/pages/ComposePage.jsx
  git commit -m "feat: implement ComposePage"
  ```

---

## Task 27: Run full build and verify

- [ ] **Build the full .NET solution**
  ```powershell
  dotnet build src/backend/Marsipan.Membership.sln
  ```
  Expected: All projects build successfully, 0 errors.

- [ ] **Run all tests**
  ```powershell
  dotnet test src/backend/Marsipan.Membership.sln
  ```
  Expected: 6 tests pass.

- [ ] **Build the React client**
  ```powershell
  cd src/client/MarcipanoTelegram && npm run build && cd ../../..
  ```
  Expected: Build succeeds, `dist/` folder created.

- [ ] **Start the API and client dev servers**
  ```powershell
  # Terminal 1
  dotnet run --project src/backend/Marsipan.Membership.Telegram.API --launch-profile http
  # Terminal 2
  cd src/client/MarcipanoTelegram && npm run dev
  ```
  Open `http://localhost:5182` — the app should show the "Loading…" spinner and then the auth-failed message (expected since there's no Telegram context in a browser).
  Open `http://localhost:5147/health` — expect `200 ok`.

- [ ] **Final commit**
  ```powershell
  git add .
  git commit -m "chore: full build verified — Marcipano Telegram Mini App complete"
  ```

---

## .env template (create locally, do not commit)

```
# src/client/MarcipanoTelegram/.env.local
VITE_API_URL=http://localhost:5147
```
