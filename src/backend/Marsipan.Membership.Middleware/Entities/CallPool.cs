using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallPools")]
public class CallPool : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public int CampaignId { get; set; }

    [ForeignKey(nameof(CampaignId))]
    public Campaign Campaign { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    // Stored filter criteria (snapshot re-runnable)
    [MaxLength(200)]
    public string? FilterCity { get; set; }

    public CallOutcome? FilterOutcome { get; set; }

    [MaxLength(2000)]
    public string? FilterJson { get; set; }

    public ICollection<CallPoolMunicipality> FilterMunicipalities { get; set; } = [];

    public ICollection<CallPoolOperator> Operators { get; set; } = [];

    public ICollection<CallContact> Contacts { get; set; } = [];
}
