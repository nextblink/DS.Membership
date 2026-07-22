using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class ExtendCallContactImportFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PhoneNumber",
                table: "CallContacts",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.AddColumn<string>(
                name: "ImportNote",
                table: "CallContacts",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImportedOutcome",
                table: "CallContacts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Jmbg",
                table: "CallContacts",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryPhone",
                table: "CallContacts",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImportNote",
                table: "CallContacts");

            migrationBuilder.DropColumn(
                name: "ImportedOutcome",
                table: "CallContacts");

            migrationBuilder.DropColumn(
                name: "Jmbg",
                table: "CallContacts");

            migrationBuilder.DropColumn(
                name: "SecondaryPhone",
                table: "CallContacts");

            migrationBuilder.AlterColumn<string>(
                name: "PhoneNumber",
                table: "CallContacts",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }
    }
}
