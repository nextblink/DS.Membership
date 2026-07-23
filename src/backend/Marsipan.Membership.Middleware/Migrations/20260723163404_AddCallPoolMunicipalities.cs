using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Marsipan.Membership.Middleware.Migrations
{
    /// <inheritdoc />
    public partial class AddCallPoolMunicipalities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CallPoolMunicipalities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CallPoolId = table.Column<int>(type: "int", nullable: false),
                    MunicipalityId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LastModifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CallPoolMunicipalities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CallPoolMunicipalities_CallPools_CallPoolId",
                        column: x => x.CallPoolId,
                        principalTable: "CallPools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CallPoolMunicipalities_Municipalities_MunicipalityId",
                        column: x => x.MunicipalityId,
                        principalTable: "Municipalities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CallPoolMunicipalities_CallPoolId_MunicipalityId",
                table: "CallPoolMunicipalities",
                columns: new[] { "CallPoolId", "MunicipalityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CallPoolMunicipalities_MunicipalityId",
                table: "CallPoolMunicipalities",
                column: "MunicipalityId");

            // Preserve existing single-municipality filters as join rows before dropping the column.
            migrationBuilder.Sql(@"
                INSERT INTO [CallPoolMunicipalities] ([CallPoolId], [MunicipalityId], [CreatedDate], [LastModifiedDate], [CreatedByUserId], [LastModifiedByUserId], [IsDeleted])
                SELECT [Id], [FilterMunicipalityId], [CreatedDate], [LastModifiedDate], [CreatedByUserId], [LastModifiedByUserId], 0
                FROM [CallPools]
                WHERE [FilterMunicipalityId] IS NOT NULL;
            ");

            migrationBuilder.DropColumn(
                name: "FilterMunicipalityId",
                table: "CallPools");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CallPoolMunicipalities");

            migrationBuilder.AddColumn<int>(
                name: "FilterMunicipalityId",
                table: "CallPools",
                type: "int",
                nullable: true);
        }
    }
}
