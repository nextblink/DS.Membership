using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class RemoveScanDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScanDate",
                table: "Forms");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ScanDate",
                table: "Forms",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));
        }
    }
}
