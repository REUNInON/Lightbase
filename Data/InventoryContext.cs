using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Lightbase.Models.inventory;

namespace Lightbase.Data
{
    public partial class inventoryContext : DbContext
    {
        public inventoryContext()
        {
        }

        public inventoryContext(DbContextOptions<inventoryContext> options) : base(options)
        {
        }

        partial void OnModelBuilding(ModelBuilder builder);

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Lightbase.Models.inventory.Catransaction>()
              .HasOne(i => i.CurrentAccount)
              .WithMany(i => i.Catransactions)
              .HasForeignKey(i => i.CurrentAccountId)
              .HasPrincipalKey(i => i.Id);

            builder.Entity<Lightbase.Models.inventory.ProductTransaction>()
              .HasOne(i => i.Product)
              .WithMany(i => i.ProductTransactions)
              .HasForeignKey(i => i.ProductId)
              .HasPrincipalKey(i => i.Id);
            this.OnModelBuilding(builder);
        }

        public DbSet<Lightbase.Models.inventory.Catransaction> Catransactions { get; set; }

        public DbSet<Lightbase.Models.inventory.CurrentAccount> CurrentAccounts { get; set; }

        public DbSet<Lightbase.Models.inventory.Product> Products { get; set; }

        public DbSet<Lightbase.Models.inventory.ProductTransaction> ProductTransactions { get; set; }
        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Conventions.Add(_ => new BlankTriggerAddingConvention());
        }
    }
}