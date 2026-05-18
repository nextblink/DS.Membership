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

    public async Task<bool> CanSendAsync(int memberId, CancellationToken ct = default)
    {
        // Stub: Check if member can send announcements (e.g., is an organizer or admin)
        // This will be implemented properly in Task 4
        var member = await _db.Members.FindAsync([memberId], ct);
        return member is not null;
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
            TargetFunctionId = request.TargetFunctionId,
            TargetEventId = request.TargetEventId,
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
            announcement.TargetLevel, announcement.TargetCommitteeId, announcement.TargetFunctionId,
            announcement.TargetEventId,
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
