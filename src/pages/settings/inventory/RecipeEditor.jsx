import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';

export default function RecipeEditor({ menuItemName, userEmail, onClose, onSave }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [onHandInventory, setOnHandInventory] = useState([]);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    qty_per_batch: 1,
    uom: 'each',
    yield_per_unit: null
  });

  useEffect(() => {
    if (menuItemName && userEmail) {
      loadRecipe();
      loadAllItems();
      loadOnHandInventory();
    }
  }, [menuItemName, userEmail]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Find recipe by menu item name - try multiple methods
      let foundRecipe = null;
      
      // Method 1: Try to find by name directly (most reliable)
      const allRecipes = await inventoryApi.getRecipes('MENU_ITEM', null, userEmail);
      foundRecipe = allRecipes.find(r => r.name === menuItemName || r.name?.toLowerCase() === menuItemName?.toLowerCase());
      
      // Method 2: If not found, try hash-based lookup (using simple hash for browser compatibility)
      if (!foundRecipe) {
        // Simple MD5-like hash for browser (not cryptographically secure, but matches backend pattern)
        const simpleHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash).toString(16).substring(0, 32);
        };
        const menuItemId = `menu_${simpleHash(menuItemName)}`;
        const recipesByHash = await inventoryApi.getRecipes('MENU_ITEM', menuItemId, userEmail);
        if (recipesByHash.length > 0) {
          foundRecipe = recipesByHash[0];
        }
      }
      
      if (foundRecipe) {
        // Load full recipe with ingredients
        const recipeData = await inventoryApi.getRecipe(foundRecipe.id, userEmail);
        setRecipe(recipeData);
        setIngredients(recipeData.ingredients || []);
      } else {
        // Create new recipe if it doesn't exist
        const simpleHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash).toString(16).substring(0, 32);
        };
        const menuItemId = `menu_${simpleHash(menuItemName)}`;
        const newRecipe = await inventoryApi.createRecipe({
          target_type: 'MENU_ITEM',
          target_id: menuItemId,
          name: menuItemName,
          yield_qty: 1,
          yield_uom: 'each'
        }, userEmail);
        setRecipe(newRecipe);
        setIngredients([]);
      }
    } catch (err) {
      console.error('Error loading recipe:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const loadAllItems = async () => {
    try {
      const data = await inventoryApi.getItems(userEmail);
      setAllItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const loadOnHandInventory = async () => {
    try {
      const data = await inventoryApi.getOnHand(null, userEmail);
      setOnHandInventory(data || []);
    } catch (err) {
      console.error('Error loading on-hand inventory:', err);
      setOnHandInventory([]);
    }
  };

  const getOnHandQty = (inventoryItemId) => {
    const onHand = onHandInventory.find(oh => oh.inventory_item_id === inventoryItemId);
    return onHand ? { qty: onHand.on_hand_qty || 0, uom: onHand.base_uom } : null;
  };

  const handleAddIngredient = () => {
    setEditingIngredient({ id: null, isNew: true });
    setFormData({ qty_per_batch: 1, uom: 'each', yield_per_unit: null });
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      qty_per_batch: ingredient.qty_per_batch || 1,
      uom: ingredient.uom || 'each',
      yield_per_unit: ingredient.yield_per_unit || null
    });
  };

  const handleSaveIngredient = async () => {
    if (!editingIngredient || !formData.qty_per_batch) {
      alert('Please fill in all required fields');
      return;
    }

    if (!recipe || !recipe.id) {
      alert('Recipe not loaded. Please try again.');
      return;
    }

    try {
      setLoading(true);
      
      if (editingIngredient.isNew) {
        // Need to select an inventory item first
        if (!editingIngredient.inventory_item_id) {
          alert('Please select an inventory item');
          setLoading(false);
          return;
        }
        await inventoryApi.addRecipeIngredient(recipe.id, {
          inventory_item_id: editingIngredient.inventory_item_id,
          qty_per_batch: formData.qty_per_batch,
          uom: formData.uom,
          yield_per_unit: formData.yield_per_unit || null
        }, userEmail);
      } else {
        // Update existing ingredient using the update endpoint
        if (!editingIngredient.id || !editingIngredient.inventory_item_id) {
          alert('Invalid ingredient data');
          setLoading(false);
          return;
        }
        await inventoryApi.updateRecipeIngredient(recipe.id, editingIngredient.id, {
          qty_per_batch: formData.qty_per_batch,
          uom: formData.uom,
          yield_per_unit: formData.yield_per_unit || null
        }, userEmail);
      }
      
      // Reload recipe by ID instead of re-hashing to avoid losing ingredients
      const updatedRecipe = await inventoryApi.getRecipe(recipe.id, userEmail);
      setRecipe(updatedRecipe);
      setIngredients(updatedRecipe.ingredients || []);
      setEditingIngredient(null);
      setFormData({ qty_per_batch: 1, uom: 'each', yield_per_unit: null });
    } catch (err) {
      console.error('Error saving ingredient:', err);
      alert(err.response?.data?.error || err.message || 'Failed to save ingredient');
      // Try to reload recipe to restore state
      if (recipe && recipe.id) {
        try {
          const reloadedRecipe = await inventoryApi.getRecipe(recipe.id, userEmail);
          setRecipe(reloadedRecipe);
          setIngredients(reloadedRecipe.ingredients || []);
        } catch (reloadErr) {
          console.error('Error reloading recipe after save failure:', reloadErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngredient = async (ingredientId) => {
    if (!confirm('Remove this ingredient from the recipe?')) return;
    
    try {
      setLoading(true);
      await inventoryApi.deleteRecipeIngredient(recipe.id, ingredientId, userEmail);
      await loadRecipe();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete ingredient');
    } finally {
      setLoading(false);
    }
  };

  const calculateYieldConversion = async (inventoryItemId, recipeUom) => {
    if (!inventoryItemId || !recipeUom) return null;
    
    try {
      const selectedItem = allItems.find(i => i.id === inventoryItemId);
      if (!selectedItem) return null;
      
      const baseUom = selectedItem.base_uom;
      
      // If recipe UOM matches base UOM, no conversion needed
      if (recipeUom.toLowerCase() === baseUom.toLowerCase()) {
        return null;
      }
      
      // UOM conversion factors (same as backend)
      const UOM_CONVERSIONS = {
        'g': { base: 'g', factor: 1 },
        'kg': { base: 'g', factor: 1000 },
        'oz': { base: 'g', factor: 28.3495 },
        'lb': { base: 'g', factor: 453.592 },
        'lbs': { base: 'g', factor: 453.592 },
        'ml': { base: 'ml', factor: 1 },
        'l': { base: 'ml', factor: 1000 },
        'liter': { base: 'ml', factor: 1000 },
        'gal': { base: 'ml', factor: 3785.41 },
        'gallon': { base: 'ml', factor: 3785.41 },
        'fl oz': { base: 'ml', factor: 29.5735 },
        'floz': { base: 'ml', factor: 29.5735 },
        'each': { base: 'each', factor: 1 },
        'ea': { base: 'each', factor: 1 },
        'piece': { base: 'each', factor: 1 },
        'pc': { base: 'each', factor: 1 },
        'case': { base: 'each', factor: 1 },
        'pack': { base: 'each', factor: 1 },
        'box': { base: 'each', factor: 1 },
      };
      
      // Try to get invoice data for this item
      const invoices = await inventoryApi.getInvoices(userEmail);
      
      // Find the most recent invoice line for this inventory item
      let mostRecentLine = null;
      let mostRecentDate = null;
      let vendorItem = null;
      
      for (const invoice of invoices) {
        if (invoice.status !== 'POSTED') continue;
        
        try {
          const invoiceData = await inventoryApi.getInvoice(invoice.id, userEmail);
          if (!invoiceData.lines) continue;
          
          for (const line of invoiceData.lines) {
            if (line.mapped_inventory_item_id === inventoryItemId) {
              const invoiceDate = new Date(invoice.invoice_date);
              if (!mostRecentDate || invoiceDate > mostRecentDate) {
                mostRecentDate = invoiceDate;
                mostRecentLine = line;
                
                // Try to get vendor item data if available
                if (invoice.vendor_id && line.vendor_item_code) {
                  try {
                    const vendor = await inventoryApi.getVendor(invoice.vendor_id, userEmail);
                    if (vendor.items) {
                      vendorItem = vendor.items.find(
                        vi => vi.vendor_item_code === line.vendor_item_code && 
                               vi.inventory_item_id === inventoryItemId
                      );
                    }
                  } catch (e) {
                    // Ignore vendor fetch errors
                  }
                }
              }
            }
          }
        } catch (e) {
          // Continue to next invoice if this one fails
          continue;
        }
      }
      
      // If we found an invoice line, calculate yield conversion
      // The yield conversion answers: "How many recipe units are in 1 purchase unit?"
      // Example: If you buy 1 case = 40 lb, and use oz in recipe, then 1 case = 640 oz
      if (mostRecentLine) {
        const invoiceUom = mostRecentLine.uom?.toLowerCase();
        const invoiceQty = mostRecentLine.qty;
        
        // Determine the actual purchase quantity and unit
        // If invoice shows "case" and vendor item has pack_size/pack_uom, use that
        // Example: invoice shows "1 case", vendor shows pack_size=40, pack_uom="lb"
        // This means: 1 case = 40 lb
        let purchaseQty = invoiceQty;
        let purchaseUom = invoiceUom;
        
        // Check if invoice UOM is a container unit (case, pack, box)
        const isContainerUnit = ['case', 'pack', 'box', 'cs'].includes(invoiceUom);
        
        if (isContainerUnit && vendorItem && vendorItem.pack_size && vendorItem.pack_uom) {
          // Use vendor pack data: 1 case = pack_size pack_uom
          purchaseQty = vendorItem.pack_size;
          purchaseUom = vendorItem.pack_uom.toLowerCase();
        } else if (!isContainerUnit) {
          // Invoice UOM is not a container, use invoice data directly
          purchaseQty = invoiceQty;
          purchaseUom = invoiceUom;
        } else {
          // Invoice shows container unit but no vendor pack data - can't calculate
          return null;
        }
        
        const purchaseConv = UOM_CONVERSIONS[purchaseUom];
        const recipeConv = UOM_CONVERSIONS[recipeUom?.toLowerCase()];
        
        if (purchaseConv && recipeConv) {
          // Check if they're compatible (same base type: weight, volume, or count)
          if (purchaseConv.base === recipeConv.base) {
            // Convert purchase quantity to recipe units
            // Example: purchaseQty = 40, purchaseUom = "lb", recipeUom = "oz"
            // 40 lb = 40 * 453.592 g = 18143.68 g
            // 18143.68 g / 28.3495 = 640 oz
            // So yield_per_unit = 640 (how many oz in 1 case)
            const purchaseQtyInRecipe = purchaseQty * purchaseConv.factor / recipeConv.factor;
            
            // Yield conversion: how many recipe units are in 1 purchase unit
            // This answers: "How many oz are in 1 case?" = 640
            return purchaseQtyInRecipe;
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error calculating yield conversion:', err);
      return null;
    }
  };

  const handleSelectItem = async (itemId) => {
    setEditingIngredient({ ...editingIngredient, inventory_item_id: itemId });
    
    // Auto-calculate yield conversion when item is selected
    // This will use the most recent invoice data to populate the yield conversion
    if (itemId && formData.uom) {
      const yieldConversion = await calculateYieldConversion(itemId, formData.uom);
      if (yieldConversion !== null && yieldConversion > 0) {
        setFormData({ ...formData, yield_per_unit: yieldConversion });
      } else {
        // Clear yield conversion if calculation returns null or invalid value
        setFormData({ ...formData, yield_per_unit: null });
      }
    }
  };

  if (loading && !recipe) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading recipe...</div>;
  }

  if (!recipe) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Recipe not found</div>;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Recipe: {menuItemName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '8px', marginBottom: '1rem', color: '#c62828' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Ingredients</h3>
            <div style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#e7f3ff', 
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#1565c0',
              fontWeight: '500'
            }}>
              💡 Inventory is shared across all menu items
            </div>
          </div>
          {ingredients.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ingredient</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>In Inventory</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Used per {menuItemName}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Yield (Optional)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ing => {
                    const item = allItems.find(i => i.id === ing.inventory_item_id);
                    const onHand = getOnHandQty(ing.inventory_item_id);
                    
                    // Calculate how much of inventory this item uses (for display only)
                    let usageInfo = null;
                    if (onHand && ing.qty_per_batch) {
                      let usageInBaseUnits = ing.qty_per_batch;
                      if (ing.yield_per_unit && ing.yield_per_unit > 0) {
                        // Convert recipe unit to base unit
                        usageInBaseUnits = ing.qty_per_batch / ing.yield_per_unit;
                      } else if (item && ing.uom !== item.base_uom) {
                        // Would need UOM conversion, but for now just show the recipe unit
                        usageInBaseUnits = null;
                      }
                      
                      if (usageInBaseUnits && onHand.qty > 0) {
                        const usagePercent = ((usageInBaseUnits / onHand.qty) * 100).toFixed(4);
                        usageInfo = { 
                          baseUnits: usageInBaseUnits,
                          percent: parseFloat(usagePercent),
                          uom: item?.base_uom || onHand.uom
                        };
                      }
                    }
                    
                    return (
                      <tr key={ing.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{item?.name || 'Unknown'}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {onHand ? (
                            <div>
                              <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                                {onHand.qty.toFixed(2)} {onHand.uom}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                (shared across all menu items)
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>No inventory</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: '600' }}>{ing.qty_per_batch} {ing.uom}</div>
                          {ing.yield_per_unit && item && (
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                              = {(ing.qty_per_batch / ing.yield_per_unit).toFixed(4)} {item.base_uom}
                            </div>
                          )}
                          {usageInfo && usageInfo.percent < 1 && (
                            <div style={{ fontSize: '0.8rem', color: '#28a745', marginTop: '0.25rem' }}>
                              ({usageInfo.percent}% of inventory per item)
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', color: '#666' }}>
                          {ing.yield_per_unit && item ? (
                            <div>
                              <div>1 {item.base_uom} = {ing.yield_per_unit} {ing.uom}</div>
                              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                                (e.g., 1 case = {ing.yield_per_unit} {ing.uom})
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>Not set</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditIngredient(ing)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '0.5rem'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(ing.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No ingredients added yet</p>
          )}
          
          <button
            onClick={handleAddIngredient}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Ingredient Edit Modal */}
        {editingIngredient && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }} onClick={() => setEditingIngredient(null)}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>{editingIngredient.isNew ? 'Add' : 'Edit'} Ingredient</h3>
              
              {editingIngredient.isNew && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Inventory Item *</label>
                  <select
                    value={editingIngredient.inventory_item_id || ''}
                    onChange={(e) => handleSelectItem(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select item...</option>
                    {allItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.base_uom})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  How much is used per {menuItemName}? *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.qty_per_batch === 0 ? '' : formData.qty_per_batch}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Remove leading zeros and handle empty input
                      const numValue = value === '' ? 0 : parseFloat(value);
                      setFormData({ ...formData, qty_per_batch: isNaN(numValue) ? 0 : numValue });
                    }}
                    onBlur={(e) => {
                      // Ensure we don't have leading zeros on blur
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setFormData({ ...formData, qty_per_batch: value });
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="0.5"
                  />
                  <select
                    value={formData.uom}
                    onChange={async (e) => {
                      const newUom = e.target.value;
                      setFormData({ ...formData, uom: newUom });
                      
                      // Recalculate yield conversion when UOM changes
                      // This will use the most recent invoice data to recalculate
                      if (editingIngredient?.inventory_item_id) {
                        const yieldConversion = await calculateYieldConversion(
                          editingIngredient.inventory_item_id, 
                          newUom
                        );
                        if (yieldConversion !== null && yieldConversion > 0) {
                          setFormData({ ...formData, uom: newUom, yield_per_unit: yieldConversion });
                        } else {
                          setFormData({ ...formData, uom: newUom, yield_per_unit: null });
                        }
                      } else {
                        // Just update UOM if no item selected yet
                        setFormData({ ...formData, uom: newUom });
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="each">Each</option>
                    <option value="slice">Slice</option>
                    <option value="oz">Ounce (oz)</option>
                    <option value="lb">Pound (lb)</option>
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="l">Liter (l)</option>
                  </select>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  <strong>Example:</strong> If your Chicken Melt uses 0.5oz of chicken, enter <strong>0.5</strong> and select <strong>oz</strong>
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Yield Conversion (Optional)
                </label>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '6px',
                  marginBottom: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                    How many {formData.uom} are in 1 {editingIngredient.inventory_item_id ? allItems.find(i => i.id === editingIngredient.inventory_item_id)?.base_uom || 'case' : 'case'}?
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem' }}>1 {editingIngredient.inventory_item_id ? allItems.find(i => i.id === editingIngredient.inventory_item_id)?.base_uom || 'case' : 'case'} =</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.yield_per_unit === null || formData.yield_per_unit === undefined ? '' : formData.yield_per_unit}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Remove leading zeros and handle empty input
                        const numValue = value === '' ? null : parseFloat(value);
                        setFormData({ ...formData, yield_per_unit: isNaN(numValue) ? null : numValue });
                      }}
                      onBlur={(e) => {
                        // Ensure we don't have leading zeros on blur
                        const value = e.target.value;
                        if (value === '') {
                          setFormData({ ...formData, yield_per_unit: null });
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            setFormData({ ...formData, yield_per_unit: numValue });
                          }
                        }
                      }}
                      placeholder="e.g., 640"
                      style={{
                        width: '120px',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{formData.uom}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  <strong>Example:</strong> If you buy 40lb of chicken per case, and you're using ounces:
                  <br />• 1 case = 40lb = 640oz (enter <strong>640</strong>)
                  <br />• The system will automatically calculate: 0.5oz per melt = 0.00078 cases per melt
                </p>
                <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Leave blank if you buy and use in the same unit (e.g., buy by oz, use by oz)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingIngredient(null)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIngredient}
                  disabled={loading || (editingIngredient.isNew && !editingIngredient.inventory_item_id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (loading || (editingIngredient.isNew && !editingIngredient.inventory_item_id)) ? 'not-allowed' : 'pointer',
                    opacity: (loading || (editingIngredient.isNew && !editingIngredient.inventory_item_id)) ? 0.5 : 1
                  }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

