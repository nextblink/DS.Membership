using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class SeedFunctionsSerbianNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "Члан главног одбора");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 2,
                column: "Name",
                value: "Председник");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 3,
                column: "Name",
                value: "Потпредседник");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 4,
                column: "Name",
                value: "Секретар");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 5,
                column: "Name",
                value: "Благајник");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "Member OB");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 2,
                column: "Name",
                value: "President");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 3,
                column: "Name",
                value: "Vice President");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 4,
                column: "Name",
                value: "Secretary");

            migrationBuilder.UpdateData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 5,
                column: "Name",
                value: "Treasurer");
        }
    }
}
