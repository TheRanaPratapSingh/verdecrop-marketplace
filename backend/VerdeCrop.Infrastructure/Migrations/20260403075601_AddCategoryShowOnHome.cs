using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VerdeCrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryShowOnHome : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PinCode",
                table: "FarmerProfiles",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<bool>(
                name: "ShowOnHome",
                table: "Categories",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "PinCode",
                table: "Addresses",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowOnHome",
                table: "Categories");

            migrationBuilder.AlterColumn<string>(
                name: "PinCode",
                table: "FarmerProfiles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PinCode",
                table: "Addresses",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8141));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8143));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8145));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8146));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8148));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 25, 17, 46, 18, 449, DateTimeKind.Utc).AddTicks(8150));
        }
    }
}
