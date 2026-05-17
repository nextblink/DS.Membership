using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddPartyHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_MemberId",
                table: "MemberFunctions");

            migrationBuilder.AddColumn<int>(
                name: "MaxMembers",
                table: "OrgUnits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrgUnitId",
                table: "MemberFunctions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxNumberOfPeople",
                table: "Functions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrgUnitType",
                table: "Functions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId",
                table: "MemberFunctions",
                columns: new[] { "MemberId", "FunctionId", "OrgUnitId" },
                unique: true,
                filter: "[OrgUnitId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_OrgUnitId",
                table: "MemberFunctions",
                column: "OrgUnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_MemberFunctions_OrgUnits_OrgUnitId",
                table: "MemberFunctions",
                column: "OrgUnitId",
                principalTable: "OrgUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MemberFunctions_OrgUnits_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropColumn(
                name: "MaxMembers",
                table: "OrgUnits");

            migrationBuilder.DropColumn(
                name: "OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropColumn(
                name: "MaxNumberOfPeople",
                table: "Functions");

            migrationBuilder.DropColumn(
                name: "OrgUnitType",
                table: "Functions");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_MemberId",
                table: "MemberFunctions",
                column: "MemberId");
        }
    }
}
