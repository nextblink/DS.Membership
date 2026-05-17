using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class SyncCascadeDeleteConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AnnouncementLikes_Members_MemberId",
                table: "AnnouncementLikes");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Committees_TargetCommitteeId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Functions_TargetFunctionId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Members_AuthorId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_FcmSubscriptions_Members_MemberId",
                table: "FcmSubscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinks_Members_MemberId",
                table: "TelegramLinks");

            migrationBuilder.AddForeignKey(
                name: "FK_AnnouncementLikes_Members_MemberId",
                table: "AnnouncementLikes",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Committees_TargetCommitteeId",
                table: "Announcements",
                column: "TargetCommitteeId",
                principalTable: "Committees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Functions_TargetFunctionId",
                table: "Announcements",
                column: "TargetFunctionId",
                principalTable: "Functions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Members_AuthorId",
                table: "Announcements",
                column: "AuthorId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FcmSubscriptions_Members_MemberId",
                table: "FcmSubscriptions",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinks_Members_MemberId",
                table: "TelegramLinks",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AnnouncementLikes_Members_MemberId",
                table: "AnnouncementLikes");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Committees_TargetCommitteeId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Functions_TargetFunctionId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Members_AuthorId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_FcmSubscriptions_Members_MemberId",
                table: "FcmSubscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinks_Members_MemberId",
                table: "TelegramLinks");

            migrationBuilder.AddForeignKey(
                name: "FK_AnnouncementLikes_Members_MemberId",
                table: "AnnouncementLikes",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Committees_TargetCommitteeId",
                table: "Announcements",
                column: "TargetCommitteeId",
                principalTable: "Committees",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Functions_TargetFunctionId",
                table: "Announcements",
                column: "TargetFunctionId",
                principalTable: "Functions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Members_AuthorId",
                table: "Announcements",
                column: "AuthorId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FcmSubscriptions_Members_MemberId",
                table: "FcmSubscriptions",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinks_Members_MemberId",
                table: "TelegramLinks",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
