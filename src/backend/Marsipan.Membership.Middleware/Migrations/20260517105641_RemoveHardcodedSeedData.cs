using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class RemoveHardcodedSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Functions",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "OrgUnits",
                keyColumn: "Id",
                keyValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Functions",
                columns: new[] { "Id", "CreatedByUserId", "CreatedDate", "IsDeleted", "LastModifiedByUserId", "LastModifiedDate", "Name" },
                values: new object[,]
                {
                    { 1, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Члан главног одбора" },
                    { 2, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Председник" },
                    { 3, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Потпредседник" },
                    { 4, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Секретар" },
                    { 5, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Благајник" },
                    { 6, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, null, null, "Member EC" }
                });

            migrationBuilder.InsertData(
                table: "OrgUnits",
                columns: new[] { "Id", "CreatedByUserId", "CreatedDate", "IsDeleted", "IsTrustful", "LastModifiedByUserId", "LastModifiedDate", "MunicipalityId", "Name", "ParentId", "TrusteeId", "Type", "VoterCount" },
                values: new object[,]
                {
                    { 1, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, true, null, null, null, "Belgrade", null, null, 0, 0 },
                    { 3, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, true, null, null, null, "Novi Sad", null, null, 0, 0 },
                    { 2, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, true, null, null, null, "Lazarevac", 1, null, 1, 0 }
                });
        }
    }
}
