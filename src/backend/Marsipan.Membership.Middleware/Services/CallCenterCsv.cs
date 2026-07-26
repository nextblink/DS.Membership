using System.Text;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Shared CSV formatting for the call-centre exports (contacts and reports).
///
/// Comma-separated per RFC 4180 — every field is quoted, so embedded commas, quotes and
/// newlines in addresses and free-text suggestions survive intact.
///
/// The Serbian labels live here rather than in the client's locales/*/enums.json because a
/// server-generated file has no client to translate it; the call centre operates in Serbian
/// (docs/callcenter.docx), so the exports are Serbian regardless of the UI language.
/// </summary>
public static class CallCenterCsv
{
    public const char Separator = ',';

    public static readonly Dictionary<CallOutcome, string> OutcomeLabels = new()
    {
        [CallOutcome.ValidContact] = "Успостављен контакт",
        [CallOutcome.WrongNumber] = "Погрешан број",
        [CallOutcome.NotInService] = "Није у употреби",
        [CallOutcome.NoAnswer] = "Није се јавио/ла",
        [CallOutcome.Refused] = "Одбио/ла разговор",
    };

    public static readonly Dictionary<ContactFinalStatus, string> FinalStatusLabels = new()
    {
        [ContactFinalStatus.ActiveMember] = "Активан члан",
        [ContactFinalStatus.InactiveMember] = "Неактиван члан",
        [ContactFinalStatus.Sympathizer] = "Симпатизер",
        [ContactFinalStatus.NoCooperation] = "Без сарадње",
    };

    public static readonly Dictionary<PartyRelation, string> RelationLabels = new()
    {
        [PartyRelation.StayMember] = "Остаје члан",
        [PartyRelation.Sympathizer] = "Симпатизер",
        [PartyRelation.NoCooperation] = "Без сарадње",
    };

    public static readonly Dictionary<ActivityLevel, string> ActivityLabels = new()
    {
        [ActivityLevel.Active] = "Активан",
        [ActivityLevel.Occasional] = "Повремено активан",
        [ActivityLevel.Inactive] = "Неактиван",
    };

    public static readonly Dictionary<EngagementArea, string> AreaLabels = new()
    {
        [EngagementArea.MunicipalBoard] = "Општински одбор",
        [EngagementArea.DepartmentalBoards] = "Ресорни одбори",
        [EngagementArea.CentralOffice] = "Централа",
        [EngagementArea.OrganizationalExecutive] = "Организациони / извршни послови",
        [EngagementArea.ElectionCampaign] = "Изборна кампања",
        [EngagementArea.ElectionMonitor] = "Контролор на изборима",
    };

    /// <summary>Quotes one field. Everything is quoted — cheaper than deciding per value.</summary>
    public static string Field(string? value) => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";

    public static void AppendRow(StringBuilder sb, params string?[] values)
        => sb.AppendLine(string.Join(Separator, values.Select(Field)));

    public static string? Bool(bool? v) => v is null ? null : v.Value ? "Да" : "Не";

    /// <summary>
    /// UTF-8 *with* BOM — Excel otherwise reads the Cyrillic content as the ANSI codepage.
    /// </summary>
    public static byte[] ToBytes(string csv) => new UTF8Encoding(true).GetBytes(csv);
}
