using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddPostalCodeAndOoIdToMunicipality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OoId",
                table: "Municipalities",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Municipalities",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Municipalities_OoId",
                table: "Municipalities",
                column: "OoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Municipalities_OrgUnits_OoId",
                table: "Municipalities",
                column: "OoId",
                principalTable: "OrgUnits",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Municipalities_OrgUnits_OoId",
                table: "Municipalities");

            migrationBuilder.DropIndex(
                name: "IX_Municipalities_OoId",
                table: "Municipalities");

            migrationBuilder.DropColumn(
                name: "OoId",
                table: "Municipalities");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Municipalities");
        }
    }
}
