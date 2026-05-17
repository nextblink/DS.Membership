using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class FunctionsSeeder
{
    private record FunctionRecord(string Name);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        if (await context.Functions.AnyAsync())
            return;

        var records = SeedDataLoader.Load<FunctionRecord[]>("functions.json");
        var now = DateTime.UtcNow;

        var functions = records.Select(r => new Function
        {
            Name = r.Name,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = systemUserId,
            LastModifiedByUserId = systemUserId
        }).ToList();

        context.Functions.AddRange(functions);
        await context.SaveChangesAsync();
    }
}
