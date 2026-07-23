using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallContacts")]
public class CallContact : BaseEntity
{
    // Imported / basic
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = null!;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = null!;

    [MaxLength(30)]
    public string? PhoneNumber { get; set; }

    [MaxLength(30)]
    public string? SecondaryPhone { get; set; }

    [MaxLength(13)]
    public string? Jmbg { get; set; }

    [MaxLength(200), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(200)]
    public string? City { get; set; }

    /// <summary>Outcome recorded by a previous, external campaign at import time (e.g. "DA", "NIJE_DOBAR_BROJ"). Informational only — never written by this app's own call flow.</summary>
    [MaxLength(50)]
    public string? ImportedOutcome { get; set; }

    /// <summary>Free-text note carried over from an import (source comment / "member since" / municipality-specific flags).</summary>
    [MaxLength(2000)]
    public string? ImportNote { get; set; }

    /// <summary>Date this contact previously became a member, per the source campaign (e.g. imported "MemberSince" column). Contacts are former members being re-contacted to check current status — this is historical, not set by this app's own enrollment flow.</summary>
    public DateOnly? MemberSince { get; set; }

    public int? MunicipalityId { get; set; }

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality? Municipality { get; set; }

    [Required]
    public int CampaignId { get; set; }

    [ForeignKey(nameof(CampaignId))]
    public Campaign Campaign { get; set; } = null!;

    // Assignment
    public int? PoolId { get; set; }

    [ForeignKey(nameof(PoolId))]
    public CallPool? Pool { get; set; }

    [MaxLength(450)]
    public string? ClaimedByUserId { get; set; }

    public DateTime? ClaimedAt { get; set; }

    public int AttemptCount { get; set; }

    public DateTime? LastCalledAt { get; set; }

    // Linking / conversion
    public int? MatchedMemberId { get; set; }

    [ForeignKey(nameof(MatchedMemberId))]
    public Member? MatchedMember { get; set; }

    public int? ConvertedMemberId { get; set; }

    [ForeignKey(nameof(ConvertedMemberId))]
    public Member? ConvertedMember { get; set; }

    // Call outcome (nullable until called)
    public CallOutcome? LastOutcome { get; set; }

    public PartyRelation? PartyRelation { get; set; }

    public ActivityLevel? ActivityLevel { get; set; }

    public bool? WantsToBeActive { get; set; }

    [MaxLength(2000)]
    public string? SuggestionNote { get; set; }

    public bool? KnowsPotentialMembers { get; set; }

    public bool? WillingToEnroll { get; set; }

    public ContactFinalStatus? FinalStatus { get; set; }

    public ICollection<CallAttempt> Attempts { get; set; } = [];

    public ICollection<ContactEngagementArea> EngagementAreas { get; set; } = [];

    /// <summary>
    /// Concurrency token guarding the claim race between operators (#80). SQL Server manages
    /// this column automatically (type `rowversion`); nullable here purely so EF Core's
    /// InMemory provider — used by the unit tests in Marsipan.Membership.Tests — doesn't
    /// require test code to populate a value it can't itself generate.
    /// </summary>
    [Timestamp]
    public byte[]? RowVersion { get; set; }
}
