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

        var q = BuildFilteredQuery(query);

        var total = await q.CountAsync(ct);
        IOrderedQueryable<CallContact> ordered = (query.SortBy == "name", query.SortDesc) switch
        {
            (true, false) => q.OrderBy(c => c.LastName).ThenBy(c => c.FirstName),
            (true, true) => q.OrderByDescending(c => c.LastName).ThenByDescending(c => c.FirstName),
            (false, false) => q.OrderBy(c => c.Address),
            (false, true) => q.OrderByDescending(c => c.Address),
        };
        var items = await ordered.ThenBy(c => c.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CallContactListItemDto(
                c.Id, c.FirstName, c.LastName, c.PhoneNumber, c.SecondaryPhone, c.Address, c.City,
                c.MunicipalityId, c.Municipality != null ? c.Municipality.Name : null,
                c.CampaignId, c.PoolId, c.Pool != null ? c.Pool.Name : null, c.AttemptCount, c.LastOutcome, c.FinalStatus,
                c.MatchedMemberId, c.ConvertedMemberId, c.ImportedOutcome, c.MemberSince,
                c.ClaimedByUserId,
                c.ClaimedByUserId == null ? null : _db.Users
                    .Where(u => u.Id == c.ClaimedByUserId)
                    .Select(u => u.FirstName != null && u.LastName != null ? u.FirstName + " " + u.LastName : u.Email)
                    .FirstOrDefault(),
                c.ClaimedAt))
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

    // Shared by SearchAsync (paged list) and ExportCsvAsync (every matching row) so the two
    // can never drift — an export that filtered differently from the grid it was launched
    // from would be worse than no export at all.
    private IQueryable<CallContact> BuildFilteredQuery(CallContactQuery query)
    {
        var q = _db.CallContacts.ApplyCallContactScope(_user);
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (!string.IsNullOrWhiteSpace(query.City)) q = q.Where(c => c.City == query.City);
        if (query.MunicipalityId is not null) q = q.Where(c => c.MunicipalityId == query.MunicipalityId);
        if (query.FinalStatus is not null) q = q.Where(c => c.FinalStatus == query.FinalStatus);
        if (query.LastOutcome is not null) q = q.Where(c => c.LastOutcome == query.LastOutcome);
        if (query.UnresolvedOnly && query.FinalStatus is null
            && (query.LastOutcome is null || query.LastOutcome == CallOutcome.NoAnswer))
        {
            // Same "still callable" definition as GetNextForOperatorAsync — excludes
            // contacts with a final status, a conversion, a non-NoAnswer outcome, or no phone.
            // Skipped when FinalStatus is explicitly requested — the two would otherwise
            // always AND to zero rows (FinalStatus can't be both null and a specific value).
            // Likewise skipped when LastOutcome is explicitly requested as anything other than
            // NoAnswer — this block's own LastOutcome clause (null-or-NoAnswer) would otherwise
            // always AND to zero rows against a LastOutcome filter for e.g. ValidContact/WrongNumber.
            q = q.Where(c => c.FinalStatus == null
                && c.ConvertedMemberId == null
                && c.PhoneNumber != null && c.PhoneNumber != ""
                && (c.LastOutcome == null || c.LastOutcome == CallOutcome.NoAnswer));
        }
        if (query.EngagementArea is not null)
        {
            q = q.Where(c => c.EngagementAreas.Any(e => e.Area == query.EngagementArea));
        }
        if (query.WantsToBeActive is not null)
        {
            q = q.Where(c => c.WantsToBeActive == query.WantsToBeActive);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(c => c.FirstName.Contains(s) || c.LastName.Contains(s) || (c.PhoneNumber != null && c.PhoneNumber.Contains(s)));
        }

        return q;
    }

    public async Task<string> ExportCsvAsync(CallContactQuery query, CancellationToken ct = default)
    {
        var rows = await BuildFilteredQuery(query)
            .OrderBy(c => c.LastName).ThenBy(c => c.FirstName).ThenBy(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.FirstName,
                c.LastName,
                c.PhoneNumber,
                c.SecondaryPhone,
                c.Email,
                c.Address,
                MunicipalityName = c.Municipality != null ? c.Municipality.Name : c.City,
                PoolName = c.Pool != null ? c.Pool.Name : null,
                CampaignName = c.Campaign.Name,
                c.AttemptCount,
                c.LastCalledAt,
                c.LastOutcome,
                c.FinalStatus,
                c.PartyRelation,
                c.ActivityLevel,
                c.WantsToBeActive,
                Areas = c.EngagementAreas.Select(e => e.Area).ToList(),
                c.SuggestionNote,
                c.KnowsPotentialMembers,
                c.WillingToEnroll,
            })
            .ToListAsync(ct);

        var sb = new System.Text.StringBuilder();
        CallCenterCsv.AppendRow(sb,
            "Име", "Презиме", "Телефон", "Други телефон", "Email", "Адреса", "Општина",
            "Кампања", "Листа", "Број покушаја", "Последњи позив", "Исход", "Статус",
            "Однос према странци", "Активност", "Жели да буде активан",
            "Области ангажовања", "Сугестија", "Познаје потенцијалне чланове", "Спреман да их учланимо");

        foreach (var r in rows)
        {
            CallCenterCsv.AppendRow(sb,
                r.FirstName,
                r.LastName,
                r.PhoneNumber,
                r.SecondaryPhone,
                r.Email,
                r.Address,
                r.MunicipalityName,
                r.CampaignName,
                r.PoolName,
                r.AttemptCount.ToString(),
                r.LastCalledAt?.ToString("yyyy-MM-dd HH:mm"),
                r.LastOutcome is null ? null : CallCenterCsv.OutcomeLabels[r.LastOutcome.Value],
                r.FinalStatus is null ? null : CallCenterCsv.FinalStatusLabels[r.FinalStatus.Value],
                r.PartyRelation is null ? null : CallCenterCsv.RelationLabels[r.PartyRelation.Value],
                r.ActivityLevel is null ? null : CallCenterCsv.ActivityLabels[r.ActivityLevel.Value],
                CallCenterCsv.Bool(r.WantsToBeActive),
                // Areas share one cell, so join with "; " — a comma would read as a column break.
                string.Join("; ", r.Areas.Select(a => CallCenterCsv.AreaLabels[a])),
                r.SuggestionNote,
                CallCenterCsv.Bool(r.KnowsPotentialMembers),
                CallCenterCsv.Bool(r.WillingToEnroll));
        }

        return sb.ToString();
    }

    public async Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .Include(x => x.Municipality)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDetail(c);
    }

    // Read-then-write claims raced (#80): two concurrent requests could both read the
    // contact as unclaimed and both write a claim. Both methods below still read then
    // write, but the RowVersion concurrency token on CallContact (populated by SQL Server
    // and re-checked by EF on every SaveChangesAsync) means the second writer's UPDATE
    // affects 0 rows and EF throws DbUpdateConcurrencyException instead of silently
    // overwriting the first writer's claim. We catch that and retry once against a fresh
    // read. (An ExecuteUpdateAsync-based atomic claim was considered but rejected: it is
    // not supported by the EF Core InMemory provider this project's test suite runs
    // against, so it would leave the fix effectively untestable.)
    private const int MaxClaimAttempts = 2;

    public async Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default)
    {
        var uid = _user.Id;
        if (string.IsNullOrEmpty(uid)) return null;

        // One active claim per operator (same rule ClaimAsync enforces): if they already have
        // an active claim, hand that back instead of picking up a second one.
        var staleCutoffForExisting = DateTime.UtcNow.AddMinutes(-StaleClaimMinutes);
        var existingClaim = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .Include(x => x.Municipality)
            .FirstOrDefaultAsync(c => c.ClaimedByUserId == uid && c.ClaimedAt >= staleCutoffForExisting, ct);
        if (existingClaim is not null) return ToDetail(existingClaim);

        for (var attempt = 0; attempt < MaxClaimAttempts; attempt++)
        {
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
            try
            {
                await _db.SaveChangesAsync(ct);
                return ToDetail(next);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another operator (or a resolve) claimed this exact row between our read
                // and our write — the RowVersion mismatch proves it. Detach the stale
                // entity and retry: the next pass's WHERE clause will no longer match this
                // row (it's now claimed by someone else and fresh), so we'll be offered a
                // different candidate.
                _db.Entry(next).State = EntityState.Detached;
            }
        }

        return null;
    }

    public async Task<CallContactDetailDto> ClaimAsync(int id, CancellationToken ct = default)
    {
        var uid = _user.Id;
        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleClaimMinutes);

        // One active claim per operator: claiming a new contact while already mid-call on a
        // different one auto-releases that other claim (its script answers only ever lived in
        // the operator's browser state, never persisted, so there's nothing to lose) instead of
        // blocking the operator until they explicitly Save/Cancel it. Re-claiming the SAME
        // contact id (x.Id != id below) is exempt — that's just resuming your own in-progress
        // call, not switching to a second one.
        var myOtherActiveClaim = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id != id && x.ClaimedByUserId == uid && x.ClaimedAt >= staleCutoff, ct);
        if (myOtherActiveClaim is not null)
        {
            myOtherActiveClaim.ClaimedByUserId = null;
            myOtherActiveClaim.ClaimedAt = null;
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Already changed by someone/something else (e.g. its own stale-claim cutoff
                // elapsed, or it got resolved) — nothing to release, safe to ignore and proceed.
                _db.Entry(myOtherActiveClaim).State = EntityState.Detached;
            }
        }

        for (var attempt = 0; attempt < MaxClaimAttempts; attempt++)
        {
            var c = await _db.CallContacts.ApplyCallContactScope(_user)
                .Include(x => x.EngagementAreas)
                .Include(x => x.Municipality)
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new KeyNotFoundException($"Contact {id} not found.");

            if (IsResolved(c)) throw new InvalidOperationException("already_resolved");

            var activelyClaimedByOther = c.ClaimedByUserId is not null
                && c.ClaimedByUserId != uid
                && c.ClaimedAt >= staleCutoff;
            if (activelyClaimedByOther) throw new InvalidOperationException("already_claimed");

            c.ClaimedByUserId = uid;
            c.ClaimedAt = DateTime.UtcNow;
            try
            {
                await _db.SaveChangesAsync(ct);
                return ToDetail(c);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Someone else (another claim, a release, or a resolve) modified this exact
                // row between our read and our write — the race #80 was filed for. Detach
                // the stale entity and retry once against a fresh read, which will report
                // the up-to-date already_claimed/already_resolved state.
                _db.Entry(c).State = EntityState.Detached;
            }
        }

        // Both attempts hit a concurrency conflict — report it the same way an
        // actively-claimed contact would be reported rather than looping indefinitely.
        throw new InvalidOperationException("already_claimed");
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

        // Same ownership/resolved-state guard ClaimAsync enforces (#81) — without it, any
        // in-scope operator could post an outcome on a contact actively claimed by someone
        // else (double-incrementing AttemptCount, overwriting the claimant's script answers,
        // and clearing a claim that isn't theirs) or silently re-outcome an already-resolved
        // contact, corrupting CallCenterReportService's data.
        if (IsResolved(c)) throw new InvalidOperationException("already_resolved");

        var staleCutoff = now.AddMinutes(-StaleClaimMinutes);
        var activelyClaimedByOther = c.ClaimedByUserId is not null
            && c.ClaimedByUserId != uid
            && c.ClaimedAt >= staleCutoff;
        if (activelyClaimedByOther) throw new InvalidOperationException("already_claimed");

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
            .ApplyMemberScope(_user)
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
        c.SecondaryPhone, c.Jmbg, c.ImportedOutcome, c.ImportNote, c.MemberSince);

    // Pools the current user can drive the calling queue through: Operators see only pools
    // they're assigned to (matching ApplyCallContactScope's Operator branch); SuperAdmin/Admin
    // see all active pools (matching that same filter's unrestricted branch for those roles).
    public async Task<List<PoolOptionDto>> ListMyPoolsAsync(CancellationToken ct = default)
    {
        var q = _db.CallPools.Where(p => p.IsActive);
        if (string.Equals(_user.Role, ScopeFilters.RoleOperator, StringComparison.Ordinal))
        {
            var uid = _user.Id;
            q = q.Where(p => p.Operators.Any(o => o.UserId == uid));
        }
        return await q.OrderBy(p => p.Name)
            .Select(p => new PoolOptionDto(p.Id, p.Name, p.CampaignId))
            .ToListAsync(ct);
    }

    // One-time cleanup (no repeat-run guard needed — it's idempotent, a second run just finds
    // no groups). Two contacts in the same campaign are duplicates if they share a normalized
    // (FirstName, LastName) plus either the same PhoneNumber or the same Address. Matching is
    // transitive via union-find, so A~B (same phone) and B~C (same address) group A, B, and C
    // together even though A and C alone wouldn't match. Within a group, the contact with the
    // most call progress (AttemptCount) survives; ties keep the lowest Id. Losers are hard-deleted,
    // cascading to their CallAttempt/ContactEngagementArea rows — safe here because this cleanup
    // runs before any calling has started on this data.
    public async Task<DedupeResultDto> RemoveDuplicatesAsync(CancellationToken ct = default)
    {
        var contacts = await _db.CallContacts
            .Select(c => new { c.Id, c.CampaignId, c.FirstName, c.LastName, c.PhoneNumber, c.Address, c.AttemptCount })
            .ToListAsync(ct);

        var removedIds = new List<int>();
        var groupsAffected = 0;

        foreach (var campaignItems in contacts.GroupBy(c => c.CampaignId))
        {
            var items = campaignItems.ToList();
            var parent = items.ToDictionary(c => c.Id, c => c.Id);

            int Find(int x) => parent[x] == x ? x : (parent[x] = Find(parent[x]));
            void Union(int a, int b)
            {
                var ra = Find(a);
                var rb = Find(b);
                if (ra != rb) parent[ra] = rb;
            }

            var byNamePhone = new Dictionary<string, List<int>>();
            var byNameAddress = new Dictionary<string, List<int>>();
            foreach (var c in items)
            {
                var name = NormalizeText(c.FirstName) + "|" + NormalizeText(c.LastName);
                var phone = NormalizePhone(c.PhoneNumber);
                var address = NormalizeText(c.Address);

                if (phone.Length > 0)
                {
                    var key = name + "|" + phone;
                    if (!byNamePhone.TryGetValue(key, out var list)) byNamePhone[key] = list = [];
                    list.Add(c.Id);
                }
                if (address.Length > 0)
                {
                    var key = name + "|" + address;
                    if (!byNameAddress.TryGetValue(key, out var list)) byNameAddress[key] = list = [];
                    list.Add(c.Id);
                }
            }

            foreach (var bucket in byNamePhone.Values.Concat(byNameAddress.Values))
                for (var i = 1; i < bucket.Count; i++)
                    Union(bucket[0], bucket[i]);

            var groups = items.GroupBy(c => Find(c.Id)).Where(g => g.Count() > 1);
            foreach (var group in groups)
            {
                groupsAffected++;
                var keeper = group.OrderByDescending(c => c.AttemptCount).ThenBy(c => c.Id).First();
                removedIds.AddRange(group.Where(c => c.Id != keeper.Id).Select(c => c.Id));
            }
        }

        if (removedIds.Count > 0)
        {
            var toRemove = await _db.CallContacts.Where(c => removedIds.Contains(c.Id)).ToListAsync(ct);
            _db.CallContacts.RemoveRange(toRemove);
            await _db.SaveChangesAsync(ct);
        }

        return new DedupeResultDto(removedIds.Count, groupsAffected);
    }

    private static string NormalizeText(string? s) => s?.Trim().ToUpperInvariant() ?? "";

    private static string NormalizePhone(string? s) => s is null ? "" : new string(s.Where(char.IsDigit).ToArray());

    public async Task<PhoneNormalizationResultDto> NormalizePhoneNumbersAsync(CancellationToken ct = default)
    {
        // Batched rather than a single bulk UPDATE: the rules (extension stripping, country-code
        // handling, length checks) live in PhoneNormalizer so the import path and this pass can
        // never disagree, and they don't express well in SQL.
        const int BatchSize = 2000;
        var primaryFixed = 0;
        var secondaryFixed = 0;
        var unfixable = 0;
        var lastId = 0;

        while (true)
        {
            var batch = await _db.CallContacts
                .Where(c => c.Id > lastId)
                .OrderBy(c => c.Id)
                .Take(BatchSize)
                .ToListAsync(ct);
            if (batch.Count == 0) break;

            foreach (var c in batch)
            {
                var primary = PhoneNormalizer.Normalize(c.PhoneNumber, out var primaryChanged);
                if (primaryChanged)
                {
                    c.PhoneNumber = primary;
                    primaryFixed++;
                }

                var secondary = PhoneNormalizer.Normalize(c.SecondaryPhone, out var secondaryChanged);
                if (secondaryChanged)
                {
                    c.SecondaryPhone = secondary;
                    secondaryFixed++;
                }

                if (!PhoneNormalizer.IsValid(c.PhoneNumber) || !PhoneNormalizer.IsValid(c.SecondaryPhone))
                {
                    unfixable++;
                }
            }

            await _db.SaveChangesAsync(ct);
            // Detach the batch so the change tracker doesn't grow across ~50k rows.
            foreach (var c in batch) _db.Entry(c).State = EntityState.Detached;
            lastId = batch[^1].Id;
        }

        return new PhoneNormalizationResultDto(primaryFixed, secondaryFixed, unfixable);
    }

    public async Task<ResetContactsResultDto> ResetAllToNeverCalledAsync(CancellationToken ct = default)
    {
        // Per-attempt/per-area history has no meaning once the parent contact is reset — wipe it
        // first so nothing orphaned lingers after the bulk update below.
        await _db.ContactEngagementAreas.ExecuteDeleteAsync(ct);
        await _db.CallAttempts.ExecuteDeleteAsync(ct);

        var affected = await _db.CallContacts.ExecuteUpdateAsync(s => s
            .SetProperty(c => c.AttemptCount, 0)
            .SetProperty(c => c.LastCalledAt, (DateTime?)null)
            .SetProperty(c => c.LastOutcome, (CallOutcome?)null)
            .SetProperty(c => c.FinalStatus, (ContactFinalStatus?)null)
            .SetProperty(c => c.ClaimedByUserId, (string?)null)
            .SetProperty(c => c.ClaimedAt, (DateTime?)null)
            .SetProperty(c => c.PartyRelation, (Enums.PartyRelation?)null)
            .SetProperty(c => c.ActivityLevel, (Enums.ActivityLevel?)null)
            .SetProperty(c => c.WantsToBeActive, (bool?)null)
            .SetProperty(c => c.SuggestionNote, (string?)null)
            .SetProperty(c => c.KnowsPotentialMembers, (bool?)null)
            .SetProperty(c => c.WillingToEnroll, (bool?)null)
            .SetProperty(c => c.MatchedMemberId, (int?)null)
            .SetProperty(c => c.ConvertedMemberId, (int?)null),
            ct);

        return new ResetContactsResultDto(affected);
    }
}
