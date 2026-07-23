using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallPoolService : ICallPoolService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallPoolService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<CallPoolDto>> ListAsync(int? campaignId, CancellationToken ct = default)
    {
        var q = _db.CallPools.AsQueryable();
        if (campaignId is not null) q = q.Where(p => p.CampaignId == campaignId);
        return await q.OrderByDescending(p => p.Id).Select(ToDto()).ToListAsync(ct);
    }

    public async Task<CallPoolDto?> GetByIdAsync(int id, CancellationToken ct = default)
        => await _db.CallPools.Where(p => p.Id == id).Select(ToDto()).FirstOrDefaultAsync(ct);

    public async Task<CallPoolDto> CreateAsync(CreateCallPoolRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var pool = new CallPool
        {
            Name = request.Name,
            CampaignId = request.CampaignId,
            IsActive = true,
            FilterCity = request.FilterCity,
            FilterMunicipalityId = request.FilterMunicipalityId,
            FilterOutcome = request.FilterOutcome,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        };
        _db.CallPools.Add(pool);
        await _db.SaveChangesAsync(ct);

        await StampMatchingContactsAsync(pool, ct);

        return (await GetByIdAsync(pool.Id, ct))!;
    }

    public async Task UpdateAsync(int id, UpdateCallPoolRequest request, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        pool.Name = request.Name;
        pool.IsActive = request.IsActive;
        pool.FilterCity = request.FilterCity;
        pool.FilterMunicipalityId = request.FilterMunicipalityId;
        pool.FilterOutcome = request.FilterOutcome;
        pool.LastModifiedDate = DateTime.UtcNow;
        pool.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        // Release contacts back to the unassigned queue.
        var contacts = await _db.CallContacts.Where(c => c.PoolId == id).ToListAsync(ct);
        foreach (var c in contacts) c.PoolId = null;
        pool.IsDeleted = true;
        pool.LastModifiedDate = DateTime.UtcNow;
        pool.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task<RefreshResultDto> RefreshAsync(int id, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        var added = await StampMatchingContactsAsync(pool, ct);
        var total = await _db.CallContacts.CountAsync(c => c.PoolId == id, ct);
        return new RefreshResultDto(added, total);
    }

    // Creates one CallPool per distinct municipality found among the campaign's currently-unassigned
    // contacts. Unlike single-pool creation (CreateAsync/StampMatchingContactsAsync), this batches the
    // contact fetch, pool inserts, and PoolId stamping into O(1) round trips instead of looping a
    // per-municipality create+stamp+reselect — important once a campaign spans dozens of municipalities.
    // Municipalities that already have a pool for this campaign are not re-created (that part stays
    // idempotent), but their unassigned contacts are still stamped onto the existing pool rather than
    // left stranded. The whole create+stamp operation runs in one transaction (via the DbContext's
    // execution strategy, since EnableRetryOnFailure is configured and a manual transaction otherwise
    // can't be retried safely) so a failure partway through doesn't leave pools created without their
    // contacts stamped, or vice versa.
    public async Task<BulkCreateByMunicipalityResultDto> BulkCreateByMunicipalityAsync(int campaignId, CancellationToken ct = default)
    {
        var unassignedContacts = await _db.CallContacts
            .Where(c => c.CampaignId == campaignId && c.PoolId == null && c.MunicipalityId != null)
            .Select(c => new { c.Id, MunicipalityId = c.MunicipalityId!.Value })
            .ToListAsync(ct);

        if (unassignedContacts.Count == 0)
            return new BulkCreateByMunicipalityResultDto(0, []);

        var contactsByMunicipality = unassignedContacts
            .GroupBy(c => c.MunicipalityId)
            .ToDictionary(g => g.Key, g => g.Select(c => c.Id).ToList());

        var existingPools = await _db.CallPools
            .Where(p => p.CampaignId == campaignId && p.FilterMunicipalityId != null
                && contactsByMunicipality.Keys.Contains(p.FilterMunicipalityId!.Value))
            .Select(p => new { p.Id, MunicipalityId = p.FilterMunicipalityId!.Value })
            .ToListAsync(ct);
        // If a municipality somehow has more than one pool, stamp its leftover contacts onto the first.
        var existingPoolIdByMunicipality = existingPools
            .GroupBy(p => p.MunicipalityId)
            .ToDictionary(g => g.Key, g => g.First().Id);

        var toCreate = contactsByMunicipality.Keys.Except(existingPoolIdByMunicipality.Keys).ToList();

        // Relational providers get a real transaction (via the execution strategy, since
        // EnableRetryOnFailure is configured and a manually-managed transaction can't be
        // retried safely otherwise). The in-memory provider used by tests doesn't support
        // transactions at all, so skip wrapping there rather than fail with
        // TransactionIgnoredWarning.
        var useTransaction = _db.Database.IsRelational();

        var created = new List<BulkPoolCreatedDto>();
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            created.Clear();
            await using var tx = useTransaction
                ? await _db.Database.BeginTransactionAsync(ct)
                : null;

            var municipalities = toCreate.Count == 0
                ? new Dictionary<int, Municipality>()
                : await _db.Municipalities.Where(m => toCreate.Contains(m.Id)).ToDictionaryAsync(m => m.Id, ct);

            var now = DateTime.UtcNow;
            var uid = _user.Id ?? "system";
            var newPools = new List<(CallPool Pool, int MunicipalityId)>();

            foreach (var municipalityId in toCreate)
            {
                if (!municipalities.TryGetValue(municipalityId, out var municipality)) continue;

                var pool = new CallPool
                {
                    Name = municipality.Name,
                    CampaignId = campaignId,
                    IsActive = true,
                    FilterMunicipalityId = municipalityId,
                    CreatedDate = now,
                    LastModifiedDate = now,
                    CreatedByUserId = uid,
                    LastModifiedByUserId = uid
                };
                _db.CallPools.Add(pool);
                newPools.Add((pool, municipalityId));
            }

            if (newPools.Count > 0)
                await _db.SaveChangesAsync(ct);

            var contactIdToPoolId = new Dictionary<int, int>();
            foreach (var (pool, municipalityId) in newPools)
                foreach (var contactId in contactsByMunicipality[municipalityId])
                    contactIdToPoolId[contactId] = pool.Id;

            // Existing pools also get their unassigned contacts stamped, not just newly-created ones.
            foreach (var (municipalityId, poolId) in existingPoolIdByMunicipality)
                if (contactsByMunicipality.TryGetValue(municipalityId, out var contactIds))
                    foreach (var contactId in contactIds)
                        contactIdToPoolId[contactId] = poolId;

            if (contactIdToPoolId.Count > 0)
            {
                var contactIdsToStamp = contactIdToPoolId.Keys.ToList();
                var contactsToStamp = await _db.CallContacts
                    .Where(c => contactIdsToStamp.Contains(c.Id))
                    .ToListAsync(ct);
                foreach (var c in contactsToStamp)
                    c.PoolId = contactIdToPoolId[c.Id];
                await _db.SaveChangesAsync(ct);
            }

            if (tx is not null)
                await tx.CommitAsync(ct);

            created.AddRange(newPools.Select(p =>
                new BulkPoolCreatedDto(p.Pool.Id, municipalities[p.MunicipalityId].Name, contactsByMunicipality[p.MunicipalityId].Count)));
        });

        return new BulkCreateByMunicipalityResultDto(created.Count, created);
    }

    public async Task SetOperatorsAsync(int id, List<string> userIds, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.Include(p => p.Operators)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");

        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var existing = pool.Operators.Select(o => o.UserId).ToHashSet();

        foreach (var userId in userIds.Distinct())
        {
            if (existing.Contains(userId)) continue;
            pool.Operators.Add(new CallPoolOperator
            {
                CallPoolId = id,
                UserId = userId,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = uid,
                LastModifiedByUserId = uid
            });
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveOperatorAsync(int id, string userId, CancellationToken ct = default)
    {
        var op = await _db.CallPoolOperators
            .FirstOrDefaultAsync(o => o.CallPoolId == id && o.UserId == userId, ct);
        if (op is null) return;
        _db.CallPoolOperators.Remove(op);
        await _db.SaveChangesAsync(ct);
    }

    // Stamps PoolId on matching contacts of the campaign that are not already in a pool.
    private async Task<int> StampMatchingContactsAsync(CallPool pool, CancellationToken ct)
    {
        var q = _db.CallContacts.Where(c => c.CampaignId == pool.CampaignId && c.PoolId == null);
        if (!string.IsNullOrWhiteSpace(pool.FilterCity))
            q = q.Where(c => c.City == pool.FilterCity);
        if (pool.FilterMunicipalityId is not null)
            q = q.Where(c => c.MunicipalityId == pool.FilterMunicipalityId);
        if (pool.FilterOutcome is not null)
            q = q.Where(c => c.LastOutcome == pool.FilterOutcome);

        var matches = await q.ToListAsync(ct);
        foreach (var c in matches) c.PoolId = pool.Id;
        await _db.SaveChangesAsync(ct);
        return matches.Count;
    }

    private static System.Linq.Expressions.Expression<Func<CallPool, CallPoolDto>> ToDto() =>
        p => new CallPoolDto(
            p.Id, p.Name, p.CampaignId, p.IsActive,
            p.FilterCity, p.FilterMunicipalityId, p.FilterOutcome,
            p.Contacts.Count,
            p.Operators.Select(o => new PoolOperatorDto(o.UserId, o.User.UserName!)).ToList());
}
