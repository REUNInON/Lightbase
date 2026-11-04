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
    public partial class Catransactions
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

        protected IEnumerable<Lightbase.Models.inventory.Catransaction> catransactions;

        protected RadzenDataGrid<Lightbase.Models.inventory.Catransaction> grid0;

        protected string search = "";

        protected async Task Search(ChangeEventArgs args)
        {
            search = $"{args.Value}";

            await grid0.GoToPage(0);

            catransactions = await inventoryService.GetCatransactions(new Query { Filter = $@"i => i.Type.Contains(@0)", FilterParameters = new object[] { search }, Expand = "CurrentAccount" });
        }
        protected override async Task OnInitializedAsync()
        {
            catransactions = await inventoryService.GetCatransactions(new Query { Filter = $@"i => i.Type.Contains(@0)", FilterParameters = new object[] { search }, Expand = "CurrentAccount" });
        }

        protected async Task AddButtonClick(MouseEventArgs args)
        {
            await DialogService.OpenAsync<AddCatransaction>("Add Catransaction", options: new DialogOptions { Resizable = true, Draggable = true });
            await grid0.Reload();
        }

        protected async Task EditRow(DataGridRowMouseEventArgs<Lightbase.Models.inventory.Catransaction> args)
        {
            await DialogService.OpenAsync<EditCatransaction>("Edit Catransaction", new Dictionary<string, object> { {"Id", args.Data.Id} }, new DialogOptions { Resizable = true, Draggable = true });
        }

        protected async Task GridDeleteButtonClick(MouseEventArgs args, Lightbase.Models.inventory.Catransaction catransaction)
        {
            try
            {
                if (await DialogService.Confirm("Are you sure you want to delete this record?") == true)
                {
                    var deleteResult = await inventoryService.DeleteCatransaction(catransaction.Id);

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
                    Detail = $"Unable to delete Catransaction"
                });
            }
        }

        protected async Task ExportClick(RadzenSplitButtonItem args)
        {
            if (args?.Value == "csv")
            {
                await inventoryService.ExportCatransactionsToCSV(new Query
                {
                    Filter = $@"{(string.IsNullOrEmpty(grid0.Query.Filter)? "true" : grid0.Query.Filter)}",
                    OrderBy = $"{grid0.Query.OrderBy}",
                    Expand = "CurrentAccount",
                    Select = string.Join(",", grid0.ColumnsCollection.Where(c => c.GetVisible() && !string.IsNullOrEmpty(c.Property)).Select(c => c.Property.Contains(".") ? c.Property + " as " + c.Property.Replace(".", "") : c.Property))
                }, "Catransactions");
            }

            if (args == null || args.Value == "xlsx")
            {
                await inventoryService.ExportCatransactionsToExcel(new Query
                {
                    Filter = $@"{(string.IsNullOrEmpty(grid0.Query.Filter)? "true" : grid0.Query.Filter)}",
                    OrderBy = $"{grid0.Query.OrderBy}",
                    Expand = "CurrentAccount",
                    Select = string.Join(",", grid0.ColumnsCollection.Where(c => c.GetVisible() && !string.IsNullOrEmpty(c.Property)).Select(c => c.Property.Contains(".") ? c.Property + " as " + c.Property.Replace(".", "") : c.Property))
                }, "Catransactions");
            }
        }
    }
}