using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <summary>
    /// Data-only migration (#90). The call script used to collect "would you like to be active",
    /// "do you know potential members" and "would you let us enrol them" as checkboxes, so an
    /// explicit "No" was saved as NULL and became indistinguishable from "never asked". Now that
    /// those are Да/Не radios, backfill the historical NULLs to false — but only for contacts
    /// that actually reached the question, mirroring the script's own branching in
    /// client/services/callScript.js. Contacts that were never called, never answered, or ended
    /// the conversation earlier keep NULL, because for them the question genuinely wasn't asked.
    /// </summary>
    public partial class BackfillCallScriptYesNoAnswers : Migration
    {
        // Enum ordinals (Enums.cs): CallOutcome.ValidContact = 0;
        // PartyRelation StayMember = 0, Sympathizer = 1; ActivityLevel.Inactive = 2.
        private const string ValidContact = "0";
        private const string ActivityInactive = "2";
        private const string RelationStayMember = "0";
        private const string RelationSympathizer = "1";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 3 follow-up: only shown to members who said they are Inactive.
            migrationBuilder.Sql($@"
                UPDATE [CallContacts]
                SET [WantsToBeActive] = 0
                WHERE [WantsToBeActive] IS NULL
                  AND [LastOutcome] = {ValidContact}
                  AND [PartyRelation] = {RelationStayMember}
                  AND [ActivityLevel] = {ActivityInactive};");

            // Step 7: reached by everyone who stayed on the call — i.e. members and
            // sympathizers, but not 'no cooperation' (that ends the conversation).
            migrationBuilder.Sql($@"
                UPDATE [CallContacts]
                SET [KnowsPotentialMembers] = 0
                WHERE [KnowsPotentialMembers] IS NULL
                  AND [LastOutcome] = {ValidContact}
                  AND [PartyRelation] IN ({RelationStayMember}, {RelationSympathizer});");

            // The enrolment follow-up is only asked of people who said they know someone,
            // so it stays NULL unless KnowsPotentialMembers is true.
            migrationBuilder.Sql(@"
                UPDATE [CallContacts]
                SET [WillingToEnroll] = 0
                WHERE [WillingToEnroll] IS NULL
                  AND [KnowsPotentialMembers] = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Not reversible: once backfilled, a stored false is indistinguishable from a
            // false the operator actually recorded, so reverting would discard real answers.
        }
    }
}
