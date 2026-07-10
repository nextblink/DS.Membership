using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddCallCenter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Campaigns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Campaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CallPools",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CampaignId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    FilterCity = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FilterMunicipalityId = table.Column<int>(type: "int", nullable: true),
                    FilterOutcome = table.Column<int>(type: "int", nullable: true),
                    FilterJson = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallPools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallPools_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CallContacts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    City = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MunicipalityId = table.Column<int>(type: "int", nullable: true),
                    CampaignId = table.Column<int>(type: "int", nullable: false),
                    PoolId = table.Column<int>(type: "int", nullable: true),
                    ClaimedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    ClaimedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    LastCalledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MatchedMemberId = table.Column<int>(type: "int", nullable: true),
                    ConvertedMemberId = table.Column<int>(type: "int", nullable: true),
                    LastOutcome = table.Column<int>(type: "int", nullable: true),
                    PartyRelation = table.Column<int>(type: "int", nullable: true),
                    ActivityLevel = table.Column<int>(type: "int", nullable: true),
                    WantsToBeActive = table.Column<bool>(type: "bit", nullable: true),
                    SuggestionNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    KnowsPotentialMembers = table.Column<bool>(type: "bit", nullable: true),
                    WillingToEnroll = table.Column<bool>(type: "bit", nullable: true),
                    FinalStatus = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallContacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallContacts_CallPools_PoolId",
                        column: x => x.PoolId,
                        principalTable: "CallPools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CallContacts_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CallContacts_Members_ConvertedMemberId",
                        column: x => x.ConvertedMemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CallContacts_Members_MatchedMemberId",
                        column: x => x.MatchedMemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CallContacts_Municipalities_MunicipalityId",
                        column: x => x.MunicipalityId,
                        principalTable: "Municipalities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CallPoolOperators",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CallPoolId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallPoolOperators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallPoolOperators_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CallPoolOperators_CallPools_CallPoolId",
                        column: x => x.CallPoolId,
                        principalTable: "CallPools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CallAttempts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CallContactId = table.Column<int>(type: "int", nullable: false),
                    Outcome = table.Column<int>(type: "int", nullable: false),
                    CalledByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CalledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallAttempts_CallContacts_CallContactId",
                        column: x => x.CallContactId,
                        principalTable: "CallContacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContactEngagementAreas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CallContactId = table.Column<int>(type: "int", nullable: false),
                    Area = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactEngagementAreas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactEngagementAreas_CallContacts_CallContactId",
                        column: x => x.CallContactId,
                        principalTable: "CallContacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CallAttempts_CallContactId",
                table: "CallAttempts",
                column: "CallContactId");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_CampaignId",
                table: "CallContacts",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_ConvertedMemberId",
                table: "CallContacts",
                column: "ConvertedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_FinalStatus",
                table: "CallContacts",
                column: "FinalStatus");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_MatchedMemberId",
                table: "CallContacts",
                column: "MatchedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_MunicipalityId",
                table: "CallContacts",
                column: "MunicipalityId");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_PhoneNumber",
                table: "CallContacts",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_CallContacts_PoolId",
                table: "CallContacts",
                column: "PoolId");

            migrationBuilder.CreateIndex(
                name: "IX_CallPoolOperators_CallPoolId_UserId",
                table: "CallPoolOperators",
                columns: new[] { "CallPoolId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CallPoolOperators_UserId",
                table: "CallPoolOperators",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CallPools_CampaignId",
                table: "CallPools",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactEngagementAreas_CallContactId_Area",
                table: "ContactEngagementAreas",
                columns: new[] { "CallContactId", "Area" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CallAttempts");

            migrationBuilder.DropTable(
                name: "CallPoolOperators");

            migrationBuilder.DropTable(
                name: "ContactEngagementAreas");

            migrationBuilder.DropTable(
                name: "CallContacts");

            migrationBuilder.DropTable(
                name: "CallPools");

            migrationBuilder.DropTable(
                name: "Campaigns");
        }
    }
}
