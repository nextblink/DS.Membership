using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallPoolMunicipalities")]
public class CallPoolMunicipality : BaseEntity
{
    [Required]
    public int CallPoolId { get; set; }

    [ForeignKey(nameof(CallPoolId))]
    public CallPool CallPool { get; set; } = null!;

    [Required]
    public int MunicipalityId { get; set; }

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality Municipality { get; set; } = null!;
}
