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
    public partial class EditProductTransaction
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

        [Parameter]
        public long Id { get; set; }

        protected override async Task OnInitializedAsync()
        {
            productTransaction = await inventoryService.GetProductTransactionById(Id);

            productsForProductId = await inventoryService.GetProducts();
        }
        protected bool errorVisible;
        protected Lightbase.Models.inventory.ProductTransaction productTransaction;

        protected IEnumerable<Lightbase.Models.inventory.Product> productsForProductId;

        protected async Task FormSubmit()
        {
            try
            {
                await inventoryService.UpdateProductTransaction(Id, productTransaction);
                DialogService.Close(productTransaction);
            }
            catch (Exception ex)
            {
                errorVisible = true;
            }
        }

        protected async Task CancelButtonClick(MouseEventArgs args)
        {
            DialogService.Close(null);
        }
    }
}