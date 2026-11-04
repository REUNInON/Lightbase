using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Lightbase.Models.inventory
{
    [Table("CurrentAccount")]
    public partial class CurrentAccount
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }

        [Column("description")]
        public string Description { get; set; }

        [Column("balance")]
        public double? Balance { get; set; }

        [Column("updated_on")]
        public long? UpdatedOn { get; set; }

        public ICollection<Catransaction> Catransactions { get; set; }
    }
}