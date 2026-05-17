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

    public CommitteeType? TargetLevel { get; set; }

    public int? TargetCommitteeId { get; set; }

    [ForeignKey(nameof(TargetCommitteeId))]
    public Committee? TargetCommittee { get; set; }

    public int? TargetFunctionId { get; set; }

    [ForeignKey(nameof(TargetFunctionId))]
    public Function? TargetFunction { get; set; }

    public ICollection<Attachment> Attachments { get; set; } = [];
    public ICollection<AnnouncementLike> Likes { get; set; } = [];
}
