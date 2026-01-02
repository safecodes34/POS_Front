import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';
import InvoiceImport from './InvoiceImport';
import RecipeEditor from './RecipeEditor';

// Get backend URL (same logic as App.jsx)
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port || '3001';
    
    // Check if we're on a local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalNetworkIP = 
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname);
    
    // If accessed via network IP, use that IP for backend
    if (isLocalNetworkIP) {
      return `https://${hostname}:4001`;
    }
    
    // If accessed via localhost, use localhost backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://localhost:4001';
    }
    
    // Check for environment variable
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL.replace('/api', '');
    }
    
    // Check if production (Railway)
    const isProduction = import.meta.env.PROD || 
      import.meta.env.MODE === 'production' || 
      hostname.includes('vercel.app') ||
      hostname.includes('railway.app');
    
    if (isProduction) {
      return 'https://posback-production-2407.up.railway.app';
    }
    
    // Default to localhost
    return 'https://localhost:4001';
  }
  return 'https://localhost:4001';
};

const getApiBaseUrl = () => {
  return `${getBackendUrl()}/api`;
};

export default function SimpleInventory({ userEmail }) {
  const [activeSection, setActiveSection] = useState('upload'); // 'upload', 'restock', or 'recipes'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  // Upload section state
  const [showImport, setShowImport] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Restock section state
  const [onHand, setOnHand] = useState([]);
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  // Recipes section state
  const [menuItems, setMenuItems] = useState([]); // All products from menu
  const [recipes, setRecipes] = useState([]); // Existing recipes
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    if (userEmail) {
      if (activeSection === 'upload') {
        loadInvoices();
      } else if (activeSection === 'restock') {
        loadOnHand();
        loadItems();
      } else if (activeSection === 'recipes') {
        loadRecipes();
      }
    }
  }, [userEmail, activeSection]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getInvoices(userEmail);
      setInvoices(data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load invoices';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadOnHand = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load all inventory without location filter
      const data = await inventoryApi.getOnHand(null, userEmail);
      setOnHand(data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load inventory';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await inventoryApi.getItems(userEmail);
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all menu items (products) - with error handling
      let products = [];
      try {
        const apiBaseUrl = getApiBaseUrl();
        console.log('📡 Loading products from:', `${apiBaseUrl}/products`, 'for user:', userEmail);
        const productsResponse = await axios.get(`${apiBaseUrl}/products`, {
          params: { userEmail }
        });
        console.log('✅ Products response:', productsResponse.data);
        products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        console.log('✅ Loaded', products.length, 'products');
        if (products.length > 0) {
          console.log('📋 Products:', products.map(p => p.name).join(', '));
        }
      } catch (productsErr) {
        console.error('❌ Error loading products:', productsErr);
        console.error('   Error details:', productsErr.response?.data || productsErr.message);
        console.error('   URL attempted:', `${getApiBaseUrl()}/products`);
        // Continue without products - recipes can still be loaded
        products = [];
      }
      setMenuItems(products);
      
      // Load existing recipes
      let recipesData = [];
      try {
        recipesData = await inventoryApi.getRecipes('MENU_ITEM', null, userEmail);
        if (!Array.isArray(recipesData)) {
          recipesData = [];
        }
      } catch (recipesErr) {
        console.error('Error loading recipes:', recipesErr);
        recipesData = [];
      }
      
      // Load full recipe data with ingredients for each recipe
      const recipesWithIngredients = await Promise.all(
        recipesData.map(async (recipe) => {
          try {
            const fullRecipe = await inventoryApi.getRecipe(recipe.id, userEmail);
            return { ...recipe, ingredients: fullRecipe?.ingredients || [] };
          } catch (err) {
            console.error('Error loading recipe details:', err);
            return { ...recipe, ingredients: [] };
          }
        })
      );
      setRecipes(recipesWithIngredients);
    } catch (err) {
      console.error('Error in loadRecipes:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load recipes';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Match menu items to recipes
  const getRecipeForMenuItem = (menuItemName) => {
    return recipes.find(r => r.name === menuItemName || r.name?.toLowerCase() === menuItemName?.toLowerCase());
  };

  const handleBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      await inventoryApi.bootstrap(userEmail);
      setError(null);
      if (activeSection === 'upload') {
        await loadInvoices();
      } else {
        await loadOnHand();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize database');
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleImportComplete = async (result) => {
    await loadInvoices();
    if (result?.invoiceId) {
      const fullInvoice = await inventoryApi.getInvoice(result.invoiceId, userEmail);
      setSelectedInvoice(fullInvoice);
    }
    setShowImport(false);
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const fullInvoice = await inventoryApi.getInvoice(invoice.id, userEmail);
      setSelectedInvoice(fullInvoice);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load invoice');
    }
  };

  const handleRestock = async (item) => {
    if (!restockQty || parseFloat(restockQty) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      const qty = parseFloat(restockQty);
      // Use the item's location_id (from on-hand data) or let backend use default
      await inventoryApi.createMovement({
        inventory_item_id: item.inventory_item_id || item.id,
        location_id: item.location_id || null, // Backend will use default if null
        type: 'MANUAL_ADJUST',
        qty_delta: qty
      }, userEmail);
      
      alert('Inventory restocked successfully!');
      setRestockQty('');
      setEditingItem(null);
      await loadOnHand();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to restock inventory');
    } finally {
      setLoading(false);
    }
  };

  const isTableMissingError = error && (
    typeof error === 'string' && (
      error.includes('no such table') ||
      error.includes('Setup Required')
    )
  );


  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', color: '#1e3a5f' }}>
        Inventory Management
      </h1>

      {/* Section Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveSection('upload')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'upload' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'upload' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'upload' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          Upload Invoice
        </button>
        <button
          onClick={() => setActiveSection('restock')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'restock' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'restock' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'restock' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          Inventory Restock
        </button>
        <button
          onClick={() => setActiveSection('recipes')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'recipes' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'recipes' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'recipes' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          Menu Recipes
        </button>
      </div>

      <InventoryErrorDisplay 
        error={error} 
        onRetry={isTableMissingError ? handleBootstrap : (activeSection === 'upload' ? loadInvoices : activeSection === 'restock' ? loadOnHand : loadRecipes)}
        onDismiss={() => setError(null)}
      />

      {/* Upload Invoice / Count Section */}
      {activeSection === 'upload' && !isTableMissingError && (
        <div>
          {/* Invoice Upload */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#1e3a5f' }}>Upload Invoice</h2>
              {!showImport && (
                <button
                  onClick={() => setShowImport(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Upload Invoice
                </button>
              )}
            </div>
            
            {showImport && (
              <div style={{ marginBottom: '2rem' }}>
                <InvoiceImport 
                  userEmail={userEmail} 
                  onComplete={handleImportComplete}
                />
              </div>
            )}

            {!showImport && invoices.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Invoice #</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Vendor</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '1rem' }}>{invoice.invoice_number || '-'}</td>
                        <td style={{ padding: '1rem' }}>{invoice.vendor_name || 'Unknown'}</td>
                        <td style={{ padding: '1rem' }}>{invoice.invoice_date}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '12px', 
                            fontSize: '0.85rem', 
                            backgroundColor: invoice.status === 'POSTED' ? '#d4edda' : '#fff3cd', 
                            color: invoice.status === 'POSTED' ? '#155724' : '#856404' 
                          }}>
                            {invoice.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleViewInvoice(invoice)} 
                            style={{ 
                              padding: '0.5rem 1rem', 
                              backgroundColor: '#1e3a5f', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px', 
                              cursor: 'pointer' 
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showImport && invoices.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '1.1rem' }}>
                  No invoices found. Upload your first invoice to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Restock Section */}
      {activeSection === 'restock' && !isTableMissingError && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, marginBottom: '1rem', color: '#1e3a5f' }}>Restock Inventory</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              View and adjust inventory quantities. Click "Restock" on any item to add inventory.
            </p>

            {/* On-Hand Inventory Table */}
            {onHand.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Current Quantity</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onHand.map(item => (
                      <tr key={`${item.inventory_item_id}-${item.location_id}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{item.item_name}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.1rem' }}>
                          <strong>{item.on_hand_qty || 0}</strong> <span style={{ color: '#666', fontSize: '0.9rem' }}>{item.base_uom}</span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {editingItem?.id === item.inventory_item_id && editingItem?.locationId === item.location_id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <input
                                type="number"
                                step="0.01"
                                value={restockQty}
                                onChange={(e) => setRestockQty(e.target.value)}
                                placeholder="Qty"
                                style={{
                                  width: '100px',
                                  padding: '0.5rem',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  textAlign: 'right'
                                }}
                              />
                              <button
                                onClick={() => handleRestock(item)}
                                disabled={loading}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  opacity: loading ? 0.5 : 1
                                }}
                              >
                                {loading ? '...' : 'Restock'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItem(null);
                                  setRestockQty('');
                                }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingItem({ id: item.inventory_item_id, locationId: item.location_id });
                                setRestockQty('');
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#1e3a5f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Restock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
                  No inventory items found.
                </p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Upload an invoice or add items to your menu to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <InvoiceDetailDrawer 
          invoice={selectedInvoice} 
          userEmail={userEmail} 
          onClose={() => setSelectedInvoice(null)} 
          onRefresh={loadInvoices} 
        />
      )}

      {/* Recipes Section */}
      {activeSection === 'recipes' && !isTableMissingError && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, marginBottom: '1rem', color: '#1e3a5f' }}>Menu Item Recipes</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Edit how many pieces/quantity of each ingredient is required for each menu item. This controls automatic inventory deduction when orders are placed.
            </p>

            {loading && menuItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Loading menu items...</p>
              </div>
            ) : menuItems.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Menu Item</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Category</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Recipe Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(menuItems) && menuItems.filter(item => item && item.name).map(item => {
                      const recipe = getRecipeForMenuItem(item.name);
                      const hasRecipe = recipe && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;
                      
                      return (
                        <tr key={item.id || item.name} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                          <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                            {item.category || 'Uncategorized'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {hasRecipe ? (
                              <div>
                                <span style={{ 
                                  padding: '0.25rem 0.75rem', 
                                  borderRadius: '12px', 
                                  fontSize: '0.85rem', 
                                  backgroundColor: '#d4edda', 
                                  color: '#155724',
                                  fontWeight: '500'
                                }}>
                                  {recipe.ingredients.length} ingredient(s)
                                </span>
                                {recipe.ingredients.length > 0 && (
                                  <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666' }}>
                                    {recipe.ingredients.slice(0, 2).map((ing, idx) => (ing?.item_name || 'Unknown')).join(', ')}
                                    {recipe.ingredients.length > 2 && '...'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '12px', 
                                fontSize: '0.85rem', 
                                backgroundColor: '#fff3cd', 
                                color: '#856404',
                                fontStyle: 'italic'
                              }}>
                                No recipe
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedRecipe(item.name)}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: hasRecipe ? '#1e3a5f' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              {hasRecipe ? 'Edit Recipe' : 'Create Recipe'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
                  No menu items found.
                </p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Add products to your menu first, then you can create recipes for them.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipe Editor Modal */}
      {selectedRecipe && (
        <RecipeEditor
          menuItemName={selectedRecipe}
          userEmail={userEmail}
          onClose={() => {
            setSelectedRecipe(null);
            loadRecipes();
          }}
          onSave={() => {
            loadRecipes();
          }}
        />
      )}
    </div>
  );
}

// Invoice Detail Drawer Component
function InvoiceDetailDrawer({ invoice, userEmail, onClose, onRefresh }) {
  const [posting, setPosting] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (invoice && userEmail) {
      loadItems();
    }
  }, [invoice, userEmail]);

  const loadItems = async () => {
    try {
      const data = await inventoryApi.getItems(userEmail);
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this invoice? This will create stock movements and update on-hand quantities.')) {
      return;
    }

    try {
      setPosting(true);
      await inventoryApi.postInvoice(invoice.id, userEmail);
      await onRefresh();
      onClose();
      alert('Invoice posted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post invoice');
    } finally {
      setPosting(false);
    }
  };

  const unmappedLines = (invoice.lines || []).filter(line => !line.mapped_inventory_item_id);
  const canPost = invoice.status === 'DRAFT' && unmappedLines.length === 0 && (invoice.lines || []).length > 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '600px',
      maxWidth: '90vw',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1001,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Invoice {invoice.invoice_number || invoice.id.slice(0, 8)}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div><strong>Vendor:</strong> {invoice.vendor_name || 'Unknown'}</div>
        <div><strong>Date:</strong> {invoice.invoice_date}</div>
        <div><strong>Status:</strong> {invoice.status}</div>
      </div>
      {unmappedLines.length > 0 && (
        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong>Warning:</strong> {unmappedLines.length} line(s) are not mapped to inventory items. Map all lines before posting.
        </div>
      )}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Lines</h3>
        {invoice.lines && invoice.lines.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invoice.lines.map(line => (
              <div key={line.id} style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div><strong>{line.description}</strong></div>
                <div>Qty: {line.qty} {line.uom} @ ${line.unit_cost} = ${(line.qty * line.unit_cost).toFixed(2)}</div>
                <div>Mapped to: {line.mapped_item_name || 'Not mapped'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No lines added yet</p>
        )}
      </div>
      {invoice.status === 'DRAFT' && canPost && (
        <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          {posting ? 'Posting...' : 'Post Invoice'}
        </button>
      )}
    </div>
  );
}
