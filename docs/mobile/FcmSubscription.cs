namespace Marcipano.Domain.Entities;

public class FcmSubscription
{
    public int Id { get; set; }
    public string MemberId { get; set; } = default!;
    public string FcmToken { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Member Member { get; set; } = default!;
}
