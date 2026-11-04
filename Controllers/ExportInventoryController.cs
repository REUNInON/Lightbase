using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

using Lightbase.Data;

namespace Lightbase.Controllers
{
    public partial class ExportinventoryController : ExportController
    {
        private readonly inventoryContext context;
        private readonly inventoryService service;

        public ExportinventoryController(inventoryContext context, inventoryService service)
        {
            this.service = service;
            this.context = context;
        }

        [HttpGet("/export/inventory/catransactions/csv")]
        [HttpGet("/export/inventory/catransactions/csv(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportCatransactionsToCSV(string fileName = null)
        {
            return ToCSV(ApplyQuery(await service.GetCatransactions(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/catransactions/excel")]
        [HttpGet("/export/inventory/catransactions/excel(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportCatransactionsToExcel(string fileName = null)
        {
            return ToExcel(ApplyQuery(await service.GetCatransactions(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/currentaccounts/csv")]
        [HttpGet("/export/inventory/currentaccounts/csv(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportCurrentAccountsToCSV(string fileName = null)
        {
            return ToCSV(ApplyQuery(await service.GetCurrentAccounts(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/currentaccounts/excel")]
        [HttpGet("/export/inventory/currentaccounts/excel(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportCurrentAccountsToExcel(string fileName = null)
        {
            return ToExcel(ApplyQuery(await service.GetCurrentAccounts(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/products/csv")]
        [HttpGet("/export/inventory/products/csv(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportProductsToCSV(string fileName = null)
        {
            return ToCSV(ApplyQuery(await service.GetProducts(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/products/excel")]
        [HttpGet("/export/inventory/products/excel(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportProductsToExcel(string fileName = null)
        {
            return ToExcel(ApplyQuery(await service.GetProducts(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/producttransactions/csv")]
        [HttpGet("/export/inventory/producttransactions/csv(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportProductTransactionsToCSV(string fileName = null)
        {
            return ToCSV(ApplyQuery(await service.GetProductTransactions(), Request.Query, false), fileName);
        }

        [HttpGet("/export/inventory/producttransactions/excel")]
        [HttpGet("/export/inventory/producttransactions/excel(fileName='{fileName}')")]
        public async Task<FileStreamResult> ExportProductTransactionsToExcel(string fileName = null)
        {
            return ToExcel(ApplyQuery(await service.GetProductTransactions(), Request.Query, false), fileName);
        }
    }
}
