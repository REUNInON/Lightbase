using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Lightbase.Models.inventory
{
    [Table("ProductTransaction")]
    public partial class ProductTransaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }

        [Column("code")]
        public long? Code { get; set; }

        [Column("type")]
        public string Type { get; set; }

        [Column("quantity")]
        public double? Quantity { get; set; }

        [Column("price")]
        public double? Price { get; set; }

        [Column("product_id")]
        public long? ProductId { get; set; }

        public Product Product { get; set; }

        [Column("date")]
        public long? Date { get; set; }
    }
}