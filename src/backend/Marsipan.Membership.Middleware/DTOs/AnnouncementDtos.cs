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
    CommitteeType? TargetLevel,
    int? TargetCommitteeId,
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
    CommitteeType? TargetLevel,
    int? TargetCommitteeId,
    int? TargetFunctionId,
    IReadOnlyList<int> AttachmentIds);

public record TelegramAuthResultDto(string Token, int MemberId, string DisplayName, int CommitteeId, IReadOnlyList<int> FunctionIds);
