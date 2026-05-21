using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Municipalities")]
public class Municipality : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public bool IsCity { get; set; }

    [MaxLength(10)]
    public string? PostalCode { get; set; }

    public int VoterCount { get; set; }

    public int? ParentId { get; set; }

    [ForeignKey(nameof(ParentId))]
    public Municipality? Parent { get; set; }

    public ICollection<Municipality> Children { get; set; } = [];

    /// <summary>
    /// FK to the Committee that serves as the OO (Opštinski odbor) for this municipality.
    /// Null means no OO unit exists. Set by CommitteesSeeder after units are created.
    /// </summary>
    public int? OoId { get; set; }

    public double? Lat { get; set; }
    public double? Lng { get; set; }
}
