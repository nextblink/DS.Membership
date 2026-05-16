using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddMunicipalityForeignKeyToOrgUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MunicipalityId",
                table: "OrgUnits",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 1,
                column: "MunicipalityId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 2,
                column: "MunicipalityId",
                value: null);

            migrationBuilder.UpdateData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 3,
                column: "MunicipalityId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_OrgUnits_MunicipalityId",
                table: "OrgUnits",
                column: "MunicipalityId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrgUnits_Municipalities_MunicipalityId",
                table: "OrgUnits",
                column: "MunicipalityId",
                principalTable: "Municipalities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrgUnits_Municipalities_MunicipalityId",
                table: "OrgUnits");

            migrationBuilder.DropIndex(
                name: "IX_OrgUnits_MunicipalityId",
                table: "OrgUnits");

            migrationBuilder.DropColumn(
                name: "MunicipalityId",
                table: "OrgUnits");
        }
    }
}
