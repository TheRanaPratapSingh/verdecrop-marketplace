using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VerdeCrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReferralCodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UsageCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferralCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReferralCodes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Referrals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReferralCodeId = table.Column<int>(type: "int", nullable: false),
                    ReferrerId = table.Column<int>(type: "int", nullable: false),
                    ReferredUserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreditsAwarded = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Referrals_ReferralCodes_ReferralCodeId",
                        column: x => x.ReferralCodeId,
                        principalTable: "ReferralCodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Referrals_Users_ReferredUserId",
                        column: x => x.ReferredUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Referrals_Users_ReferrerId",
                        column: x => x.ReferrerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WalletCredits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferralId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WalletCredits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WalletCredits_Referrals_ReferralId",
                        column: x => x.ReferralId,
                        principalTable: "Referrals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WalletCredits_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5788));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5792));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5794));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5796));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5797));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 14, 32, 5, 260, DateTimeKind.Utc).AddTicks(5799));

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCodes_Code",
                table: "ReferralCodes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferralCodes_UserId",
                table: "ReferralCodes",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferralCodeId",
                table: "Referrals",
                column: "ReferralCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferredUserId",
                table: "Referrals",
                column: "ReferredUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferrerId",
                table: "Referrals",
                column: "ReferrerId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletCredits_ReferralId",
                table: "WalletCredits",
                column: "ReferralId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletCredits_UserId",
                table: "WalletCredits",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WalletCredits");

            migrationBuilder.DropTable(
                name: "Referrals");

            migrationBuilder.DropTable(
                name: "ReferralCodes");

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7804));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7807));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7809));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7812));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7813));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 5, 13, 49, 51, 106, DateTimeKind.Utc).AddTicks(7815));
        }
    }
}
