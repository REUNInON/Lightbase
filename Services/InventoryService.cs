using System;
using System.Data;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Components;
using Microsoft.EntityFrameworkCore;
using Radzen;

using Lightbase.Data;

namespace Lightbase
{
    public partial class inventoryService
    {
        inventoryContext Context
        {
           get
           {
             return this.context;
           }
        }

        private readonly inventoryContext context;
        private readonly NavigationManager navigationManager;

        public inventoryService(inventoryContext context, NavigationManager navigationManager)
        {
            this.context = context;
            this.navigationManager = navigationManager;
        }

        public void Reset() => Context.ChangeTracker.Entries().Where(e => e.Entity != null).ToList().ForEach(e => e.State = EntityState.Detached);

        public void ApplyQuery<T>(ref IQueryable<T> items, Query query = null)
        {
            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.Filter))
                {
                    if (query.FilterParameters != null)
                    {
                        items = items.Where(query.Filter, query.FilterParameters);
                    }
                    else
                    {
                        items = items.Where(query.Filter);
                    }
                }

                if (!string.IsNullOrEmpty(query.OrderBy))
                {
                    items = items.OrderBy(query.OrderBy);
                }

                if (query.Skip.HasValue)
                {
                    items = items.Skip(query.Skip.Value);
                }

                if (query.Top.HasValue)
                {
                    items = items.Take(query.Top.Value);
                }
            }
        }


        public async Task ExportCatransactionsToExcel(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/catransactions/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/catransactions/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        public async Task ExportCatransactionsToCSV(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/catransactions/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/catransactions/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        partial void OnCatransactionsRead(ref IQueryable<Lightbase.Models.inventory.Catransaction> items);

        public async Task<IQueryable<Lightbase.Models.inventory.Catransaction>> GetCatransactions(Query query = null)
        {
            var items = Context.Catransactions.AsQueryable();

            items = items.Include(i => i.CurrentAccount);

            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.Expand))
                {
                    var propertiesToExpand = query.Expand.Split(',');
                    foreach(var p in propertiesToExpand)
                    {
                        items = items.Include(p.Trim());
                    }
                }

                ApplyQuery(ref items, query);
            }

            OnCatransactionsRead(ref items);

            return await Task.FromResult(items);
        }

        partial void OnCatransactionGet(Lightbase.Models.inventory.Catransaction item);
        partial void OnGetCatransactionById(ref IQueryable<Lightbase.Models.inventory.Catransaction> items);


        public async Task<Lightbase.Models.inventory.Catransaction> GetCatransactionById(long id)
        {
            var items = Context.Catransactions
                              .AsNoTracking()
                              .Where(i => i.Id == id);

            items = items.Include(i => i.CurrentAccount);
 
            OnGetCatransactionById(ref items);

            var itemToReturn = items.FirstOrDefault();

            OnCatransactionGet(itemToReturn);

            return await Task.FromResult(itemToReturn);
        }

        partial void OnCatransactionCreated(Lightbase.Models.inventory.Catransaction item);
        partial void OnAfterCatransactionCreated(Lightbase.Models.inventory.Catransaction item);

        public async Task<Lightbase.Models.inventory.Catransaction> CreateCatransaction(Lightbase.Models.inventory.Catransaction catransaction)
        {
            OnCatransactionCreated(catransaction);

            var existingItem = Context.Catransactions
                              .Where(i => i.Id == catransaction.Id)
                              .FirstOrDefault();

            if (existingItem != null)
            {
               throw new Exception("Item already available");
            }            

            try
            {
                Context.Catransactions.Add(catransaction);
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(catransaction).State = EntityState.Detached;
                throw;
            }

            OnAfterCatransactionCreated(catransaction);

            return catransaction;
        }

        public async Task<Lightbase.Models.inventory.Catransaction> CancelCatransactionChanges(Lightbase.Models.inventory.Catransaction item)
        {
            var entityToCancel = Context.Entry(item);
            if (entityToCancel.State == EntityState.Modified)
            {
              entityToCancel.CurrentValues.SetValues(entityToCancel.OriginalValues);
              entityToCancel.State = EntityState.Unchanged;
            }

            return item;
        }

        partial void OnCatransactionUpdated(Lightbase.Models.inventory.Catransaction item);
        partial void OnAfterCatransactionUpdated(Lightbase.Models.inventory.Catransaction item);

        public async Task<Lightbase.Models.inventory.Catransaction> UpdateCatransaction(long id, Lightbase.Models.inventory.Catransaction catransaction)
        {
            OnCatransactionUpdated(catransaction);

            var itemToUpdate = Context.Catransactions
                              .Where(i => i.Id == catransaction.Id)
                              .FirstOrDefault();

            if (itemToUpdate == null)
            {
               throw new Exception("Item no longer available");
            }
                
            var entryToUpdate = Context.Entry(itemToUpdate);
            entryToUpdate.CurrentValues.SetValues(catransaction);
            entryToUpdate.State = EntityState.Modified;

            Context.SaveChanges();

            OnAfterCatransactionUpdated(catransaction);

            return catransaction;
        }

        partial void OnCatransactionDeleted(Lightbase.Models.inventory.Catransaction item);
        partial void OnAfterCatransactionDeleted(Lightbase.Models.inventory.Catransaction item);

        public async Task<Lightbase.Models.inventory.Catransaction> DeleteCatransaction(long id)
        {
            var itemToDelete = Context.Catransactions
                              .Where(i => i.Id == id)
                              .FirstOrDefault();

            if (itemToDelete == null)
            {
               throw new Exception("Item no longer available");
            }

            OnCatransactionDeleted(itemToDelete);


            Context.Catransactions.Remove(itemToDelete);

            try
            {
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(itemToDelete).State = EntityState.Unchanged;
                throw;
            }

            OnAfterCatransactionDeleted(itemToDelete);

            return itemToDelete;
        }
    
        public async Task ExportCurrentAccountsToExcel(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/currentaccounts/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/currentaccounts/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        public async Task ExportCurrentAccountsToCSV(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/currentaccounts/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/currentaccounts/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        partial void OnCurrentAccountsRead(ref IQueryable<Lightbase.Models.inventory.CurrentAccount> items);

        public async Task<IQueryable<Lightbase.Models.inventory.CurrentAccount>> GetCurrentAccounts(Query query = null)
        {
            var items = Context.CurrentAccounts.AsQueryable();


            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.Expand))
                {
                    var propertiesToExpand = query.Expand.Split(',');
                    foreach(var p in propertiesToExpand)
                    {
                        items = items.Include(p.Trim());
                    }
                }

                ApplyQuery(ref items, query);
            }

            OnCurrentAccountsRead(ref items);

            return await Task.FromResult(items);
        }

        partial void OnCurrentAccountGet(Lightbase.Models.inventory.CurrentAccount item);
        partial void OnGetCurrentAccountById(ref IQueryable<Lightbase.Models.inventory.CurrentAccount> items);


        public async Task<Lightbase.Models.inventory.CurrentAccount> GetCurrentAccountById(long id)
        {
            var items = Context.CurrentAccounts
                              .AsNoTracking()
                              .Where(i => i.Id == id);

 
            OnGetCurrentAccountById(ref items);

            var itemToReturn = items.FirstOrDefault();

            OnCurrentAccountGet(itemToReturn);

            return await Task.FromResult(itemToReturn);
        }

        partial void OnCurrentAccountCreated(Lightbase.Models.inventory.CurrentAccount item);
        partial void OnAfterCurrentAccountCreated(Lightbase.Models.inventory.CurrentAccount item);

        public async Task<Lightbase.Models.inventory.CurrentAccount> CreateCurrentAccount(Lightbase.Models.inventory.CurrentAccount currentaccount)
        {
            OnCurrentAccountCreated(currentaccount);

            var existingItem = Context.CurrentAccounts
                              .Where(i => i.Id == currentaccount.Id)
                              .FirstOrDefault();

            if (existingItem != null)
            {
               throw new Exception("Item already available");
            }            

            try
            {
                Context.CurrentAccounts.Add(currentaccount);
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(currentaccount).State = EntityState.Detached;
                throw;
            }

            OnAfterCurrentAccountCreated(currentaccount);

            return currentaccount;
        }

        public async Task<Lightbase.Models.inventory.CurrentAccount> CancelCurrentAccountChanges(Lightbase.Models.inventory.CurrentAccount item)
        {
            var entityToCancel = Context.Entry(item);
            if (entityToCancel.State == EntityState.Modified)
            {
              entityToCancel.CurrentValues.SetValues(entityToCancel.OriginalValues);
              entityToCancel.State = EntityState.Unchanged;
            }

            return item;
        }

        partial void OnCurrentAccountUpdated(Lightbase.Models.inventory.CurrentAccount item);
        partial void OnAfterCurrentAccountUpdated(Lightbase.Models.inventory.CurrentAccount item);

        public async Task<Lightbase.Models.inventory.CurrentAccount> UpdateCurrentAccount(long id, Lightbase.Models.inventory.CurrentAccount currentaccount)
        {
            OnCurrentAccountUpdated(currentaccount);

            var itemToUpdate = Context.CurrentAccounts
                              .Where(i => i.Id == currentaccount.Id)
                              .FirstOrDefault();

            if (itemToUpdate == null)
            {
               throw new Exception("Item no longer available");
            }
                
            var entryToUpdate = Context.Entry(itemToUpdate);
            entryToUpdate.CurrentValues.SetValues(currentaccount);
            entryToUpdate.State = EntityState.Modified;

            Context.SaveChanges();

            OnAfterCurrentAccountUpdated(currentaccount);

            return currentaccount;
        }

        partial void OnCurrentAccountDeleted(Lightbase.Models.inventory.CurrentAccount item);
        partial void OnAfterCurrentAccountDeleted(Lightbase.Models.inventory.CurrentAccount item);

        public async Task<Lightbase.Models.inventory.CurrentAccount> DeleteCurrentAccount(long id)
        {
            var itemToDelete = Context.CurrentAccounts
                              .Where(i => i.Id == id)
                              .Include(i => i.Catransactions)
                              .FirstOrDefault();

            if (itemToDelete == null)
            {
               throw new Exception("Item no longer available");
            }

            OnCurrentAccountDeleted(itemToDelete);


            Context.CurrentAccounts.Remove(itemToDelete);

            try
            {
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(itemToDelete).State = EntityState.Unchanged;
                throw;
            }

            OnAfterCurrentAccountDeleted(itemToDelete);

            return itemToDelete;
        }
    
        public async Task ExportProductsToExcel(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/products/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/products/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        public async Task ExportProductsToCSV(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/products/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/products/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        partial void OnProductsRead(ref IQueryable<Lightbase.Models.inventory.Product> items);

        public async Task<IQueryable<Lightbase.Models.inventory.Product>> GetProducts(Query query = null)
        {
            var items = Context.Products.AsQueryable();


            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.Expand))
                {
                    var propertiesToExpand = query.Expand.Split(',');
                    foreach(var p in propertiesToExpand)
                    {
                        items = items.Include(p.Trim());
                    }
                }

                ApplyQuery(ref items, query);
            }

            OnProductsRead(ref items);

            return await Task.FromResult(items);
        }

        partial void OnProductGet(Lightbase.Models.inventory.Product item);
        partial void OnGetProductById(ref IQueryable<Lightbase.Models.inventory.Product> items);


        public async Task<Lightbase.Models.inventory.Product> GetProductById(long id)
        {
            var items = Context.Products
                              .AsNoTracking()
                              .Where(i => i.Id == id);

 
            OnGetProductById(ref items);

            var itemToReturn = items.FirstOrDefault();

            OnProductGet(itemToReturn);

            return await Task.FromResult(itemToReturn);
        }

        partial void OnProductCreated(Lightbase.Models.inventory.Product item);
        partial void OnAfterProductCreated(Lightbase.Models.inventory.Product item);

        public async Task<Lightbase.Models.inventory.Product> CreateProduct(Lightbase.Models.inventory.Product product)
        {
            OnProductCreated(product);

            var existingItem = Context.Products
                              .Where(i => i.Id == product.Id)
                              .FirstOrDefault();

            if (existingItem != null)
            {
               throw new Exception("Item already available");
            }            

            try
            {
                Context.Products.Add(product);
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(product).State = EntityState.Detached;
                throw;
            }

            OnAfterProductCreated(product);

            return product;
        }

        public async Task<Lightbase.Models.inventory.Product> CancelProductChanges(Lightbase.Models.inventory.Product item)
        {
            var entityToCancel = Context.Entry(item);
            if (entityToCancel.State == EntityState.Modified)
            {
              entityToCancel.CurrentValues.SetValues(entityToCancel.OriginalValues);
              entityToCancel.State = EntityState.Unchanged;
            }

            return item;
        }

        partial void OnProductUpdated(Lightbase.Models.inventory.Product item);
        partial void OnAfterProductUpdated(Lightbase.Models.inventory.Product item);

        public async Task<Lightbase.Models.inventory.Product> UpdateProduct(long id, Lightbase.Models.inventory.Product product)
        {
            OnProductUpdated(product);

            var itemToUpdate = Context.Products
                              .Where(i => i.Id == product.Id)
                              .FirstOrDefault();

            if (itemToUpdate == null)
            {
               throw new Exception("Item no longer available");
            }
                
            var entryToUpdate = Context.Entry(itemToUpdate);
            entryToUpdate.CurrentValues.SetValues(product);
            entryToUpdate.State = EntityState.Modified;

            Context.SaveChanges();

            OnAfterProductUpdated(product);

            return product;
        }

        partial void OnProductDeleted(Lightbase.Models.inventory.Product item);
        partial void OnAfterProductDeleted(Lightbase.Models.inventory.Product item);

        public async Task<Lightbase.Models.inventory.Product> DeleteProduct(long id)
        {
            var itemToDelete = Context.Products
                              .Where(i => i.Id == id)
                              .Include(i => i.ProductTransactions)
                              .FirstOrDefault();

            if (itemToDelete == null)
            {
               throw new Exception("Item no longer available");
            }

            OnProductDeleted(itemToDelete);


            Context.Products.Remove(itemToDelete);

            try
            {
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(itemToDelete).State = EntityState.Unchanged;
                throw;
            }

            OnAfterProductDeleted(itemToDelete);

            return itemToDelete;
        }
    
        public async Task ExportProductTransactionsToExcel(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/producttransactions/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/producttransactions/excel(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        public async Task ExportProductTransactionsToCSV(Query query = null, string fileName = null)
        {
            navigationManager.NavigateTo(query != null ? query.ToUrl($"export/inventory/producttransactions/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')") : $"export/inventory/producttransactions/csv(fileName='{(!string.IsNullOrEmpty(fileName) ? UrlEncoder.Default.Encode(fileName) : "Export")}')", true);
        }

        partial void OnProductTransactionsRead(ref IQueryable<Lightbase.Models.inventory.ProductTransaction> items);

        public async Task<IQueryable<Lightbase.Models.inventory.ProductTransaction>> GetProductTransactions(Query query = null)
        {
            var items = Context.ProductTransactions.AsQueryable();

            items = items.Include(i => i.Product);

            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.Expand))
                {
                    var propertiesToExpand = query.Expand.Split(',');
                    foreach(var p in propertiesToExpand)
                    {
                        items = items.Include(p.Trim());
                    }
                }

                ApplyQuery(ref items, query);
            }

            OnProductTransactionsRead(ref items);

            return await Task.FromResult(items);
        }

        partial void OnProductTransactionGet(Lightbase.Models.inventory.ProductTransaction item);
        partial void OnGetProductTransactionById(ref IQueryable<Lightbase.Models.inventory.ProductTransaction> items);


        public async Task<Lightbase.Models.inventory.ProductTransaction> GetProductTransactionById(long id)
        {
            var items = Context.ProductTransactions
                              .AsNoTracking()
                              .Where(i => i.Id == id);

            items = items.Include(i => i.Product);
 
            OnGetProductTransactionById(ref items);

            var itemToReturn = items.FirstOrDefault();

            OnProductTransactionGet(itemToReturn);

            return await Task.FromResult(itemToReturn);
        }

        partial void OnProductTransactionCreated(Lightbase.Models.inventory.ProductTransaction item);
        partial void OnAfterProductTransactionCreated(Lightbase.Models.inventory.ProductTransaction item);

        public async Task<Lightbase.Models.inventory.ProductTransaction> CreateProductTransaction(Lightbase.Models.inventory.ProductTransaction producttransaction)
        {
            OnProductTransactionCreated(producttransaction);

            var existingItem = Context.ProductTransactions
                              .Where(i => i.Id == producttransaction.Id)
                              .FirstOrDefault();

            if (existingItem != null)
            {
               throw new Exception("Item already available");
            }            

            try
            {
                Context.ProductTransactions.Add(producttransaction);
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(producttransaction).State = EntityState.Detached;
                throw;
            }

            OnAfterProductTransactionCreated(producttransaction);

            return producttransaction;
        }

        public async Task<Lightbase.Models.inventory.ProductTransaction> CancelProductTransactionChanges(Lightbase.Models.inventory.ProductTransaction item)
        {
            var entityToCancel = Context.Entry(item);
            if (entityToCancel.State == EntityState.Modified)
            {
              entityToCancel.CurrentValues.SetValues(entityToCancel.OriginalValues);
              entityToCancel.State = EntityState.Unchanged;
            }

            return item;
        }

        partial void OnProductTransactionUpdated(Lightbase.Models.inventory.ProductTransaction item);
        partial void OnAfterProductTransactionUpdated(Lightbase.Models.inventory.ProductTransaction item);

        public async Task<Lightbase.Models.inventory.ProductTransaction> UpdateProductTransaction(long id, Lightbase.Models.inventory.ProductTransaction producttransaction)
        {
            OnProductTransactionUpdated(producttransaction);

            var itemToUpdate = Context.ProductTransactions
                              .Where(i => i.Id == producttransaction.Id)
                              .FirstOrDefault();

            if (itemToUpdate == null)
            {
               throw new Exception("Item no longer available");
            }
                
            var entryToUpdate = Context.Entry(itemToUpdate);
            entryToUpdate.CurrentValues.SetValues(producttransaction);
            entryToUpdate.State = EntityState.Modified;

            Context.SaveChanges();

            OnAfterProductTransactionUpdated(producttransaction);

            return producttransaction;
        }

        partial void OnProductTransactionDeleted(Lightbase.Models.inventory.ProductTransaction item);
        partial void OnAfterProductTransactionDeleted(Lightbase.Models.inventory.ProductTransaction item);

        public async Task<Lightbase.Models.inventory.ProductTransaction> DeleteProductTransaction(long id)
        {
            var itemToDelete = Context.ProductTransactions
                              .Where(i => i.Id == id)
                              .FirstOrDefault();

            if (itemToDelete == null)
            {
               throw new Exception("Item no longer available");
            }

            OnProductTransactionDeleted(itemToDelete);


            Context.ProductTransactions.Remove(itemToDelete);

            try
            {
                Context.SaveChanges();
            }
            catch
            {
                Context.Entry(itemToDelete).State = EntityState.Unchanged;
                throw;
            }

            OnAfterProductTransactionDeleted(itemToDelete);

            return itemToDelete;
        }
        }
}