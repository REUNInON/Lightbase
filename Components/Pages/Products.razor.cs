using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.JSInterop;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Radzen;
using Radzen.Blazor;

namespace Lightbase.Components.Pages
{
    public partial class Products
    {
        [Inject]
        protected IJSRuntime JSRuntime { get; set; }

        [Inject]
        protected NavigationManager NavigationManager { get; set; }

        [Inject]
        protected DialogService DialogService { get; set; }

        [Inject]
        protected TooltipService TooltipService { get; set; }

        [Inject]
        protected ContextMenuService ContextMenuService { get; set; }

        [Inject]
        protected NotificationService NotificationService { get; set; }

        [Inject]
        public inventoryService inventoryService { get; set; }

        protected IEnumerable<Lightbase.Models.inventory.Product> products;

        protected RadzenDataGrid<Lightbase.Models.inventory.Product> grid0;

        protected string search = "";

        protected async Task Search(ChangeEventArgs args)
        {
            search = $"{args.Value}";

            await grid0.GoToPage(0);

            products = await inventoryService.GetProducts(new Query { Filter = $@"i => i.Code.Contains(@0) || i.Description.Contains(@0) || i.Origin.Contains(@0) || i.Category.Contains(@0)", FilterParameters = new object[] { search } });
        }
        protected override async Task OnInitializedAsync()
        {
            products = await inventoryService.GetProducts(new Query { Filter = $@"i => i.Code.Contains(@0) || i.Description.Contains(@0) || i.Origin.Contains(@0) || i.Category.Contains(@0)", FilterParameters = new object[] { search } });
        }

        protected async Task AddButtonClick(MouseEventArgs args)
        {
            await DialogService.OpenAsync<AddProduct>("Add Product", options: new DialogOptions { Resizable = true, Draggable = true });
            await grid0.Reload();
        }

        protected async Task EditRow(DataGridRowMouseEventArgs<Lightbase.Models.inventory.Product> args)
        {
            await DialogService.OpenAsync<EditProduct>("Edit Product", new Dictionary<string, object> { {"Id", args.Data.Id} }, new DialogOptions { Resizable = true, Draggable = true });
        }

        protected async Task GridDeleteButtonClick(MouseEventArgs args, Lightbase.Models.inventory.Product product)
        {
            try
            {
                if (await DialogService.Confirm("Are you sure you want to delete this record?") == true)
                {
                    var deleteResult = await inventoryService.DeleteProduct(product.Id);

                    if (deleteResult != null)
                    {
                        await grid0.Reload();
                    }
                }
            }
            catch (Exception ex)
            {
                NotificationService.Notify(new NotificationMessage
                {
                    Severity = NotificationSeverity.Error,
                    Summary = $"Error",
                    Detail = $"Unable to delete Product"
                });
            }
        }

        protected async Task ExportClick(RadzenSplitButtonItem args)
        {
            if (args?.Value == "csv")
            {
                await inventoryService.ExportProductsToCSV(new Query
                {
                    Filter = $@"{(string.IsNullOrEmpty(grid0.Query.Filter)? "true" : grid0.Query.Filter)}",
                    OrderBy = $"{grid0.Query.OrderBy}",
                    Expand = "",
                    Select = string.Join(",", grid0.ColumnsCollection.Where(c => c.GetVisible() && !string.IsNullOrEmpty(c.Property)).Select(c => c.Property.Contains(".") ? c.Property + " as " + c.Property.Replace(".", "") : c.Property))
                }, "Products");
            }

            if (args == null || args.Value == "xlsx")
            {
                await inventoryService.ExportProductsToExcel(new Query
                {
                    Filter = $@"{(string.IsNullOrEmpty(grid0.Query.Filter)? "true" : grid0.Query.Filter)}",
                    OrderBy = $"{grid0.Query.OrderBy}",
                    Expand = "",
                    Select = string.Join(",", grid0.ColumnsCollection.Where(c => c.GetVisible() && !string.IsNullOrEmpty(c.Property)).Select(c => c.Property.Contains(".") ? c.Property + " as " + c.Property.Replace(".", "") : c.Property))
                }, "Products");
            }
        }
    }
}