using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class MoveIsTrustfulFromMemberToOrgUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // IsTrustful was already added to OrgUnits in the previous migration
            // This migration just ensures it has the correct default value

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 1,
                column: "IsTrustful",
                value: true);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 2,
                column: "IsTrustful",
                value: true);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 3,
                column: "IsTrustful",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This migration doesn't need a rollback since it's just documentation
        }
    }
}
