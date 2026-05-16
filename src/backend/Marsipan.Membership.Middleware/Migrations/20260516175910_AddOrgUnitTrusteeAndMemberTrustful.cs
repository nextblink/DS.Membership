using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddOrgUnitTrusteeAndMemberTrustful : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TrusteeId",
                table: "OrgUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsTrustful",
                table: "OrgUnits",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 1,
                column: "TrusteeId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 2,
                column: "TrusteeId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 3,
                column: "TrusteeId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_OrgUnits_TrusteeId",
                table: "OrgUnits",
                column: "TrusteeId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrgUnits_Members_TrusteeId",
                table: "OrgUnits",
                column: "TrusteeId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrgUnits_Members_TrusteeId",
                table: "OrgUnits");

            migrationBuilder.DropIndex(
                name: "IX_OrgUnits_TrusteeId",
                table: "OrgUnits");

            migrationBuilder.DropColumn(
                name: "TrusteeId",
                table: "OrgUnits");

            migrationBuilder.DropColumn(
                name: "IsTrustful",
                table: "OrgUnits");
        }
    }
}
