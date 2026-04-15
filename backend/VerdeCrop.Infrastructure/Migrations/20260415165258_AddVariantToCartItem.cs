using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VerdeCrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantToCartItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedVariant",
                table: "CartItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VariantPrice",
                table: "CartItems",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9619));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9622));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9624));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9626));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9628));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 16, 52, 55, 956, DateTimeKind.Utc).AddTicks(9630));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedVariant",
                table: "CartItems");

            migrationBuilder.DropColumn(
                name: "VariantPrice",
                table: "CartItems");

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1105));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1107));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1110));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1112));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1114));

            migrationBuilder.UpdateData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 15, 9, 20, 27, 288, DateTimeKind.Utc).AddTicks(1116));
        }
    }
}
