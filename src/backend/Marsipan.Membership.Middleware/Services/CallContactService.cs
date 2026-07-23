using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallContactService : ICallContactService
{
    private const int StaleClaimMinutes = 15;

    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;
    private readonly ICallContactImportService _import;

    public CallContactService(ApplicationContext db, ICurrentUserContext user, ICallContactImportService import)
    {
        _db = db;
        _user = user;
        _import = import;
    }

    public async Task<PagedResultDto<CallContactListItemDto>> SearchAsync(CallContactQuery query, CancellationToken ct = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        var q = _db.CallContacts.ApplyCallContactScope(_user);
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (!string.IsNullOrWhiteSpace(query.City)) q = q.Where(c => c.City == query.City);
        if (query.MunicipalityId is not null) q = q.Where(c => c.MunicipalityId == query.MunicipalityId);
        if (query.FinalStatus is not null) q = q.Where(c => c.FinalStatus == query.FinalStatus);
        if (query.LastOutcome is not null) q = q.Where(c => c.LastOutcome == query.LastOutcome);
        if (query.UnresolvedOnly && query.FinalStatus is null)
        {
            // Same "still callable" definition as GetNextForOperatorAsync — excludes
            // contacts with a final status, a conversion, a non-NoAnswer outcome, or no phone.
            // Skipped when FinalStatus is explicitly requested — the two would otherwise
            // always AND to zero rows (FinalStatus can't be both null and a specific value).
            q = q.Where(c => c.FinalStatus == null
                && c.ConvertedMemberId == null
                && c.PhoneNumber != null && c.PhoneNumber != ""
                && (c.LastOutcome == null || c.LastOutcome == CallOutcome.NoAnswer));
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(c => c.FirstName.Contains(s) || c.LastName.Contains(s) || (c.PhoneNumber != null && c.PhoneNumber.Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(c => c.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CallContactListItemDto(
                c.Id, c.FirstName, c.LastName, c.PhoneNumber, c.City,
                c.MunicipalityId, c.Municipality != null ? c.Municipality.Name : null,
                c.CampaignId, c.PoolId, c.AttemptCount, c.LastOutcome, c.FinalStatus,
                c.MatchedMemberId, c.ConvertedMemberId, c.ImportedOutcome))
            .ToListAsync(ct);

        return new PagedResultDto<CallContactListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    public async Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .Include(x => x.Municipality)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDetail(c);
    }

    public async Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default)
    {
        var uid = _user.Id;
        if (string.IsNullOrEmpty(uid)) return null;

        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleClaimMinutes);
        var next = await _db.CallContacts.ApplyCallContactScope(_user)
            .Where(c => c.FinalStatus == null
                && c.ConvertedMemberId == null
                && c.PhoneNumber != null && c.PhoneNumber != ""
                && (c.LastOutcome == null || c.LastOutcome == CallOutcome.NoAnswer)
                && (c.ClaimedByUserId == null || c.ClaimedByUserId == uid || c.ClaimedAt < staleCutoff)
                // Referencing c.Campaign joins the Campaigns table, so EF's global query filter
                // (!IsDeleted) is applied automatically — this query never joins Campaign otherwise,
                // so a soft-deleted campaign's contacts would slip through without this check.
                && c.Campaign.IsActive
                && (c.Pool == null || c.Pool.IsActive))
            .OrderBy(c => c.LastCalledAt ?? DateTime.MinValue)
            .ThenBy(c => c.Id)
            .Include(c => c.EngagementAreas)
            .Include(c => c.Municipality)
            .FirstOrDefaultAsync(ct);

        if (next is null) return null;

        next.ClaimedByUserId = uid;
        next.ClaimedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDetail(next);
    }

    public async Task<CallContactDetailDto> ClaimAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .Include(x => x.Municipality)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        if (IsResolved(c)) throw new InvalidOperationException("already_resolved");

        var uid = _user.Id;
        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleClaimMinutes);
        var activelyClaimedByOther = c.ClaimedByUserId is not null
            && c.ClaimedByUserId != uid
            && c.ClaimedAt >= staleCutoff;
        if (activelyClaimedByOther) throw new InvalidOperationException("already_claimed");

        c.ClaimedByUserId = uid;
        c.ClaimedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDetail(c);
    }

    // Same "resolved" condition GetNextForOperatorAsync excludes contacts on — kept as a
    // single source of truth so ClaimAsync doesn't diverge from the queue's definition.
    private static bool IsResolved(CallContact c) =>
        c.FinalStatus != null
        || c.ConvertedMemberId != null
        || (c.LastOutcome != null && c.LastOutcome != CallOutcome.NoAnswer);

    public async Task SaveOutcomeAsync(int id, SaveCallOutcomeRequest request, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";

        // 1. Log the dial attempt.
        _db.CallAttempts.Add(new CallAttempt
        {
            CallContactId = id,
            Outcome = request.Outcome,
            CalledByUserId = uid,
            CalledAt = now,
            Note = request.AttemptNote,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        });
        c.AttemptCount += 1;
        c.LastCalledAt = now;
        c.LastOutcome = request.Outcome;

        if (request.Outcome == CallOutcome.ValidContact)
        {
            if (request.PartyRelation is null)
                throw new ArgumentException("PartyRelation is required when Outcome is ValidContact.");

            // 2. Script answers.
            c.PartyRelation = request.PartyRelation;
            c.ActivityLevel = request.ActivityLevel;
            c.WantsToBeActive = request.WantsToBeActive;
            c.SuggestionNote = request.SuggestionNote;
            c.KnowsPotentialMembers = request.KnowsPotentialMembers;
            c.WillingToEnroll = request.WillingToEnroll;

            // 3. Update contact data in place.
            if (!string.IsNullOrWhiteSpace(request.UpdatedPhone)) c.PhoneNumber = request.UpdatedPhone!.Trim();
            if (request.UpdatedEmail is not null) c.Email = string.IsNullOrWhiteSpace(request.UpdatedEmail) ? null : request.UpdatedEmail.Trim();
            if (request.UpdatedAddress is not null) c.Address = string.IsNullOrWhiteSpace(request.UpdatedAddress) ? null : request.UpdatedAddress.Trim();

            // 4. Replace engagement areas.
            _db.ContactEngagementAreas.RemoveRange(c.EngagementAreas);
            foreach (var area in (request.EngagementAreas ?? new()).Distinct())
            {
                c.EngagementAreas.Add(new ContactEngagementArea
                {
                    CallContactId = id,
                    Area = area,
                    CreatedDate = now,
                    LastModifiedDate = now,
                    CreatedByUserId = uid,
                    LastModifiedByUserId = uid
                });
            }

            // 5. Derive final status.
            c.FinalStatus = request.PartyRelation switch
            {
                Enums.PartyRelation.NoCooperation => ContactFinalStatus.NoCooperation,
                Enums.PartyRelation.Sympathizer => ContactFinalStatus.Sympathizer,
                Enums.PartyRelation.StayMember =>
                    request.ActivityLevel == Enums.ActivityLevel.Inactive
                        ? ContactFinalStatus.InactiveMember
                        : ContactFinalStatus.ActiveMember,
                _ => c.FinalStatus
            };
        }

        // 6. Release the claim.
        c.ClaimedByUserId = null;
        c.ClaimedAt = null;
        c.LastModifiedDate = now;
        c.LastModifiedByUserId = uid;

        await _db.SaveChangesAsync(ct);
    }

    public async Task ReleaseClaimAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        if (c.ClaimedByUserId == _user.Id)
        {
            c.ClaimedByUserId = null;
            c.ClaimedAt = null;
            c.LastModifiedDate = DateTime.UtcNow;
            c.LastModifiedByUserId = _user.Id ?? "system";
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<List<MemberMatchDto>> SuggestMemberMatchesAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        var phone = c.PhoneNumber?.Trim();
        if (string.IsNullOrEmpty(phone)) return new List<MemberMatchDto>();
        return await _db.Members
            .Where(m => m.Phones.Any(p => p.Number == phone))
            .Select(m => new MemberMatchDto(
                m.Id, m.FirstName + " " + m.LastName,
                m.Phones.Select(p => p.Number).FirstOrDefault(),
                m.Committee.Name))
            .ToListAsync(ct);
    }

    public async Task LinkToMemberAsync(int id, int memberId, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        var exists = await _db.Members.AnyAsync(m => m.Id == memberId, ct);
        if (!exists) throw new KeyNotFoundException($"Member {memberId} not found.");
        c.MatchedMemberId = memberId;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task UnlinkAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        c.MatchedMemberId = null;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task<EnrollmentPrefillDto?> GetEnrollmentPrefillAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : new EnrollmentPrefillDto(
            c.FirstName, c.LastName, c.PhoneNumber, c.Email, c.City, c.MunicipalityId);
    }

    public async Task SetConvertedMemberAsync(int id, int memberId, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        var exists = await _db.Members.AnyAsync(m => m.Id == memberId, ct);
        if (!exists) throw new KeyNotFoundException($"Member {memberId} not found.");
        c.ConvertedMemberId = memberId;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
        => _import.ImportAsync(campaignId, file, fileName, ct);

    private static CallContactDetailDto ToDetail(CallContact c) => new(
        c.Id, c.FirstName, c.LastName, c.PhoneNumber, c.Email, c.Address, c.City,
        c.MunicipalityId, c.Municipality?.Name, c.CampaignId, c.PoolId, c.AttemptCount, c.LastOutcome,
        c.PartyRelation, c.ActivityLevel, c.WantsToBeActive, c.SuggestionNote,
        c.KnowsPotentialMembers, c.WillingToEnroll, c.FinalStatus,
        c.MatchedMemberId, c.ConvertedMemberId,
        c.EngagementAreas.Select(e => e.Area).ToList(),
        c.SecondaryPhone, c.Jmbg, c.ImportedOutcome, c.ImportNote);
}
