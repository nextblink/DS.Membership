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
            .Include(m => m.Committee)
            .Include(m => m.MemberFunctions)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct)
            ?? throw new KeyNotFoundException($"Member {memberId} not found.");

        var memberFunctionIds = member.MemberFunctions.Select(mf => mf.FunctionId).ToHashSet();

        var query = _db.Announcements
            .Include(a => a.Attachments)
            .Include(a => a.Author)
            .Include(a => a.Likes)
            .Where(a =>
                (a.TargetCommitteeId == null || a.TargetCommitteeId == member.CommitteeId) &&
                (a.TargetLevel == null || a.TargetLevel == member.Committee.Type) &&
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
            a.TargetCommitteeId,
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
