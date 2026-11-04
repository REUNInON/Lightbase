using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Lightbase.Models.inventory
{
    [Table("Product")]
    public partial class Product
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }

        [Column("code")]
        [Required]
        public string Code { get; set; }

        [Column("description")]
        public string Description { get; set; }

        [Column("origin")]
        public string Origin { get; set; }

        [Column("stock")]
        public double? Stock { get; set; }

        [Column("category")]
        public string Category { get; set; }

        [Column("added_on")]
        public long? AddedOn { get; set; }

        [Column("updated_on")]
        public long? UpdatedOn { get; set; }

        public ICollection<ProductTransaction> ProductTransactions { get; set; }
    }
}