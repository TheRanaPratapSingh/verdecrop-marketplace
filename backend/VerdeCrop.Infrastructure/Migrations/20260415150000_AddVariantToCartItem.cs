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
        }
    }
}
