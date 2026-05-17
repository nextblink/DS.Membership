using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class FunctionsSeeder
{
    private record FunctionRecord(string Name, int? CommitteeType, int? MaxNumberOfPeople);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        if (await context.Functions.AnyAsync())
            return;

        var records = SeedDataLoader.Load<FunctionRecord[]>("functions.json");
        var now = DateTime.UtcNow;

        var functions = records.Select(r => new Function
        {
            Name = r.Name,
            CommitteeType = r.CommitteeType.HasValue ? (CommitteeType)r.CommitteeType.Value : null,
            MaxNumberOfPeople = r.MaxNumberOfPeople,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = systemUserId,
            LastModifiedByUserId = systemUserId
        }).ToList();

        context.Functions.AddRange(functions);
        await context.SaveChangesAsync();
    }
}
