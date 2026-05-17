using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class RenameOrgUnitsToCommittees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys that reference OrgUnits
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_OrgUnits_OrgUnitId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_MemberFunctions_OrgUnits_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropForeignKey(
                name: "FK_Members_OrgUnits_OrgUnitId",
                table: "Members");

            migrationBuilder.DropForeignKey(
                name: "FK_Municipalities_OrgUnits_OoId",
                table: "Municipalities");

            migrationBuilder.DropForeignKey(
                name: "FK_OrgUnits_OrgUnits_ParentId",
                table: "OrgUnits");

            // Drop indexes that reference OrgUnitId
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_OrgUnitId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_Members_OrgUnitId",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_OrgUnits_ParentId",
                table: "OrgUnits");

            // Rename OrgUnitId columns to CommitteeId in dependent tables
            migrationBuilder.RenameColumn(
                name: "OrgUnitId",
                table: "Members",
                newName: "CommitteeId");

            migrationBuilder.RenameColumn(
                name: "OrgUnitId",
                table: "MemberFunctions",
                newName: "CommitteeId");

            migrationBuilder.RenameColumn(
                name: "OrgUnitId",
                table: "AspNetUsers",
                newName: "CommitteeId");

            // Rename the OrgUnits table to Committees
            migrationBuilder.RenameTable(
                name: "OrgUnits",
                newName: "Committees");

            // Rename ParentOrgUnitId to ParentId in the Committees table (already done in entity, just ensure consistency)
            // Note: ParentId is already correctly named in the OrgUnits table schema

            // Recreate indexes with new names
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CommitteeId",
                table: "AspNetUsers",
                column: "CommitteeId");

            migrationBuilder.CreateIndex(
                name: "IX_Members_CommitteeId",
                table: "Members",
                column: "CommitteeId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_CommitteeId",
                table: "MemberFunctions",
                column: "CommitteeId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_CommitteeId",
                table: "MemberFunctions",
                columns: new[] { "MemberId", "FunctionId", "CommitteeId" },
                unique: true,
                filter: "[CommitteeId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Committees_ParentId",
                table: "Committees",
                column: "ParentId");

            // Recreate foreign keys with new names and table
            migrationBuilder.AddForeignKey(
                name: "FK_Committees_Committees_ParentId",
                table: "Committees",
                column: "ParentId",
                principalTable: "Committees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Committees_CommitteeId",
                table: "AspNetUsers",
                column: "CommitteeId",
                principalTable: "Committees",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MemberFunctions_Committees_CommitteeId",
                table: "MemberFunctions",
                column: "CommitteeId",
                principalTable: "Committees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Members_Committees_CommitteeId",
                table: "Members",
                column: "CommitteeId",
                principalTable: "Committees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Municipalities_Committees_OoId",
                table: "Municipalities",
                column: "OoId",
                principalTable: "Committees",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys that reference Committees
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Committees_CommitteeId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_MemberFunctions_Committees_CommitteeId",
                table: "MemberFunctions");

            migrationBuilder.DropForeignKey(
                name: "FK_Members_Committees_CommitteeId",
                table: "Members");

            migrationBuilder.DropForeignKey(
                name: "FK_Municipalities_Committees_OoId",
                table: "Municipalities");

            migrationBuilder.DropForeignKey(
                name: "FK_Committees_Committees_ParentId",
                table: "Committees");

            // Drop indexes
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_CommitteeId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_Members_CommitteeId",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_CommitteeId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_CommitteeId",
                table: "MemberFunctions");

            migrationBuilder.DropIndex(
                name: "IX_Committees_ParentId",
                table: "Committees");

            // Rename CommitteeId columns back to OrgUnitId
            migrationBuilder.RenameColumn(
                name: "CommitteeId",
                table: "Members",
                newName: "OrgUnitId");

            migrationBuilder.RenameColumn(
                name: "CommitteeId",
                table: "MemberFunctions",
                newName: "OrgUnitId");

            migrationBuilder.RenameColumn(
                name: "CommitteeId",
                table: "AspNetUsers",
                newName: "OrgUnitId");

            // Rename the Committees table back to OrgUnits
            migrationBuilder.RenameTable(
                name: "Committees",
                newName: "OrgUnits");

            // Recreate indexes with old names
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_OrgUnitId",
                table: "AspNetUsers",
                column: "OrgUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Members_OrgUnitId",
                table: "Members",
                column: "OrgUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_OrgUnitId",
                table: "MemberFunctions",
                column: "OrgUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId",
                table: "MemberFunctions",
                columns: new[] { "MemberId", "FunctionId", "OrgUnitId" },
                unique: true,
                filter: "[OrgUnitId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_OrgUnits_ParentId",
                table: "OrgUnits",
                column: "ParentId");

            // Recreate foreign keys with old names
            migrationBuilder.AddForeignKey(
                name: "FK_OrgUnits_OrgUnits_ParentId",
                table: "OrgUnits",
                column: "ParentId",
                principalTable: "OrgUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_OrgUnits_OrgUnitId",
                table: "AspNetUsers",
                column: "OrgUnitId",
                principalTable: "OrgUnits",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MemberFunctions_OrgUnits_OrgUnitId",
                table: "MemberFunctions",
                column: "OrgUnitId",
                principalTable: "OrgUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Members_OrgUnits_OrgUnitId",
                table: "Members",
                column: "OrgUnitId",
                principalTable: "OrgUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Municipalities_OrgUnits_OoId",
                table: "Municipalities",
                column: "OoId",
                principalTable: "OrgUnits",
                principalColumn: "Id");
        }
    }
}
