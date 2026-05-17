using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class RenameFunctionOrgUnitTypeToCommitteeType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "OrgUnitType",
                table: "Functions",
                newName: "CommitteeType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CommitteeType",
                table: "Functions",
                newName: "OrgUnitType");
        }
    }
}
