using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Lightbase.Models.inventory
{
    [Table("CATransaction")]
    public partial class Catransaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }

        [Column("code")]
        public long? Code { get; set; }

        [Column("type")]
        public string Type { get; set; }

        [Column("amount")]
        public double? Amount { get; set; }

        [Column("current_account_id")]
        public long? CurrentAccountId { get; set; }

        public CurrentAccount CurrentAccount { get; set; }

        [Column("date")]
        public long? Date { get; set; }
    }
}