using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VerdeCrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCategorySeedShowOnHome : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5493), true });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5495), true });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5497), true });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5499), true });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5501), true });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 8, 29, 34, 442, DateTimeKind.Utc).AddTicks(5503), true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6756), false });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6758), false });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6761), false });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6763), false });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6765), false });

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CreatedAt", "ShowOnHome" },
                values: new object[] { new DateTime(2026, 4, 3, 7, 55, 59, 220, DateTimeKind.Utc).AddTicks(6766), false });
        }
    }
}
