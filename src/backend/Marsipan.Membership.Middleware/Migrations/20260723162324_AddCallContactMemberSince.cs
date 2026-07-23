using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddCallContactMemberSince : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "MemberSince",
                table: "CallContacts",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MemberSince",
                table: "CallContacts");
        }
    }
}
