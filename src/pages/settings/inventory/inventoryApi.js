import axios from 'axios';

// Use same API URL detection logic as App.jsx
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'https://localhost:4001';
  const hostname = window.location.hostname;
  
  const isLocalNetworkIP = 
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname);
  
  if (isLocalNetworkIP) {
    return `https://${hostname}:4001`;
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://localhost:4001';
  }
  
  const isProduction = import.meta.env?.PROD || 
    import.meta.env?.MODE === 'production' || 
    hostname.includes('vercel.app') ||
    hostname.includes('railway.app');
  
  if (isProduction) {
    return 'https://posback-production-2407.up.railway.app';
  }
  
  return 'https://localhost:4001';
};

const API_BASE_URL = `${getBackendUrl()}/api/inventory`;

// Helper to add userEmail to requests (tenant scoping)
const withUserEmail = (paramsOrData, userEmail) => {
  if (!userEmail) {
    throw new Error('userEmail is required for inventory API calls');
  }
  const result = paramsOrData || {};
  if (typeof result === 'object' && !Array.isArray(result)) {
    return { ...result, userEmail };
  }
  return { userEmail, ...result };
};

export const inventoryApi = {
  // Overview
  getOverview: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/overview`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Items
  getItems: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/items`, {
      params: { userEmail }
    });
    return response.data;
  },

  getItem: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/items/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  createItem: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/items`, withUserEmail(data, userEmail));
    return response.data;
  },

  updateItem: async (id, data, userEmail) => {
    const response = await axios.put(`${API_BASE_URL}/items/${id}`, withUserEmail(data, userEmail));
    return response.data;
  },

  deleteItem: async (id, userEmail) => {
    const response = await axios.delete(`${API_BASE_URL}/items/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Locations
  getLocations: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/locations`, {
      params: { userEmail }
    });
    return response.data;
  },

  getLocation: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/locations/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  getLocationItems: async (locationId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/locations/${locationId}/items`, {
      params: { userEmail }
    });
    return response.data;
  },

  createLocation: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/locations`, withUserEmail(data, userEmail));
    return response.data;
  },

  updateLocation: async (id, data, userEmail) => {
    const response = await axios.put(`${API_BASE_URL}/locations/${id}`, withUserEmail(data, userEmail));
    return response.data;
  },

  deleteLocation: async (id, userEmail) => {
    const response = await axios.delete(`${API_BASE_URL}/locations/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  assignItemToLocation: async (locationId, data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/locations/${locationId}/items`, withUserEmail(data, userEmail));
    return response.data;
  },

  reorderLocationItems: async (locationId, items, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/locations/${locationId}/items/reorder`, withUserEmail({ items }, userEmail));
    return response.data;
  },

  // Vendors
  getVendors: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/vendors`, {
      params: { userEmail }
    });
    return response.data;
  },

  getVendor: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/vendors/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  createVendor: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/vendors`, withUserEmail(data, userEmail));
    return response.data;
  },

  updateVendor: async (id, data, userEmail) => {
    const response = await axios.put(`${API_BASE_URL}/vendors/${id}`, withUserEmail(data, userEmail));
    return response.data;
  },

  deleteVendor: async (id, userEmail, force = true) => {
    const response = await axios.delete(`${API_BASE_URL}/vendors/${id}`, {
      params: { userEmail, force: force.toString() }
    });
    return response.data;
  },

  importOrderGuide: async (vendorId, file, userEmail) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/import/order-guide`, formData, {
      params: { userEmail },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getImportJob: async (jobId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/import-jobs/${jobId}`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Invoices / Receiving
  getInvoices: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/invoices`, {
      params: { userEmail }
    });
    return response.data;
  },

  getInvoice: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/invoices/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  createInvoice: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/invoices`, withUserEmail(data, userEmail));
    return response.data;
  },

  addInvoiceLine: async (invoiceId, data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/invoices/${invoiceId}/lines`, withUserEmail(data, userEmail));
    return response.data;
  },

  postInvoice: async (invoiceId, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/invoices/${invoiceId}/post`, null, {
      params: { userEmail }
    });
    return response.data;
  },

  // Counts
  getCounts: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/counts`, {
      params: { userEmail }
    });
    return response.data;
  },

  getCount: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/counts/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  createCount: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/counts`, withUserEmail(data, userEmail));
    return response.data;
  },

  updateCountLines: async (countId, lines, userEmail) => {
    const response = await axios.put(`${API_BASE_URL}/counts/${countId}/lines`, withUserEmail({ lines }, userEmail));
    return response.data;
  },

  submitCount: async (countId, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/counts/${countId}/submit`, null, {
      params: { userEmail }
    });
    return response.data;
  },

  postCount: async (countId, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/counts/${countId}/post`, null, {
      params: { userEmail }
    });
    return response.data;
  },

  // Ordering
  getReorderSuggestions: async (locationId, userEmail) => {
    const params = { userEmail };
    if (locationId) params.location_id = locationId;
    const response = await axios.get(`${API_BASE_URL}/ordering/suggestions`, { params });
    return response.data;
  },

  // On-hand
  getOnHand: async (locationId, userEmail) => {
    const params = { userEmail };
    if (locationId) params.location_id = locationId;
    const response = await axios.get(`${API_BASE_URL}/on-hand`, { params });
    return response.data;
  },

  // Movements
  createMovement: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/movements`, withUserEmail(data, userEmail));
    return response.data;
  },

  createTransfer: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/transfers`, withUserEmail(data, userEmail));
    return response.data;
  },

  // Recipes
  getRecipes: async (targetType, targetId, userEmail) => {
    const params = { userEmail };
    if (targetType) params.target_type = targetType;
    if (targetId) params.target_id = targetId;
    const response = await axios.get(`${API_BASE_URL}/recipes`, { params });
    return response.data;
  },

  getRecipe: async (id, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/recipes/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  createRecipe: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/recipes`, withUserEmail(data, userEmail));
    return response.data;
  },

  updateRecipe: async (id, data, userEmail) => {
    const response = await axios.put(`${API_BASE_URL}/recipes/${id}`, withUserEmail(data, userEmail));
    return response.data;
  },

  deleteRecipe: async (id, userEmail) => {
    const response = await axios.delete(`${API_BASE_URL}/recipes/${id}`, {
      params: { userEmail }
    });
    return response.data;
  },

  addRecipeIngredient: async (recipeId, data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/recipes/${recipeId}/ingredients`, withUserEmail(data, userEmail));
    return response.data;
  },

  deleteRecipeIngredient: async (recipeId, ingredientId, userEmail) => {
    const response = await axios.delete(`${API_BASE_URL}/recipes/${recipeId}/ingredients/${ingredientId}`, {
      params: { userEmail }
    });
    return response.data;
  },

  getProductionCapacity: async (recipeId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/production-capacity`, {
      params: { userEmail, recipe_id: recipeId }
    });
    return response.data;
  },

  computeVariance: async (recipeId, startDate, endDate, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/variance/compute`, {
      recipe_id: recipeId,
      start_date: startDate,
      end_date: endDate,
      userEmail
    });
    return response.data;
  },

  // Lots (FIFO/expiry)
  getLots: async (inventoryItemId, locationId, userEmail) => {
    const params = { userEmail };
    if (inventoryItemId) params.inventory_item_id = inventoryItemId;
    if (locationId) params.location_id = locationId;
    const response = await axios.get(`${API_BASE_URL}/lots`, { params });
    return response.data;
  },

  createLot: async (data, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/lots`, {
      ...data,
      userEmail,
      userRole
    });
    return response.data;
  },

  // Waste Reasons
  getWasteReasons: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/waste-reasons`, {
      params: { userEmail }
    });
    return response.data;
  },

  createWasteReason: async (data, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/waste-reasons`, {
      ...data,
      userEmail,
      userRole
    });
    return response.data;
  },

  createWaste: async (data, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/waste`, {
      ...data,
      userEmail,
      userRole
    });
    return response.data;
  },

  // Count Approvals
  submitCountForApproval: async (countId, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/counts/${countId}/submit-for-approval`, null, {
      params: { userEmail, userRole }
    });
    return response.data;
  },

  approveCount: async (countId, approved, comments, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/counts/${countId}/approve`, {
      approved,
      comments,
      userEmail,
      userRole
    });
    return response.data;
  },

  getCountApprovals: async (countId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/counts/${countId}/approvals`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Audit Trail
  getAuditTrail: async (filters, userEmail) => {
    const params = { userEmail, ...filters };
    const response = await axios.get(`${API_BASE_URL}/audit-trail`, { params });
    return response.data;
  },

  // AvT Variance
  computeAvTVariance: async (recipeId, startDate, endDate, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/variance/avt`, {
      recipe_id: recipeId,
      start_date: startDate,
      end_date: endDate,
      userEmail
    });
    return response.data;
  },

  // UOM Conversions
  getUomConversions: async (userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/uom-conversions`, {
      params: { userEmail }
    });
    return response.data;
  },

  createUomConversion: async (data, userEmail, userRole = null) => {
    const response = await axios.post(`${API_BASE_URL}/uom-conversions`, {
      ...data,
      userEmail,
      userRole
    });
    return response.data;
  },

  // Bootstrap endpoint to create missing tables
  bootstrap: async (userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/bootstrap`, { userEmail });
    return response.data;
  },

  // Period Analytics
  getPeriods: async (userEmail, locationId = null) => {
    const response = await axios.get(`${API_BASE_URL}/analytics/periods`, {
      params: { userEmail, ...(locationId ? { location_id: locationId } : {}) }
    });
    return response.data;
  },

  closePeriod: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/analytics/periods/close`, {
      ...data,
      userEmail
    });
    return response.data;
  },

  getPeriodSummary: async (periodId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/analytics/periods/${periodId}/summary`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Forecasting / Ordering
  getMonthlyForecast: async (periodStart, periodEnd, userEmail, locationId = null, leadTimeDays = 7, reorderCycleDays = 30) => {
    const response = await axios.get(`${API_BASE_URL}/ordering/monthly-forecast`, {
      params: {
        userEmail,
        period_start: periodStart,
        period_end: periodEnd,
        ...(locationId ? { location_id: locationId } : {}),
        lead_time_days: leadTimeDays,
        reorder_cycle_days: reorderCycleDays
      }
    });
    return response.data;
  },

  saveOrderingPlan: async (data, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/ordering/monthly-plan`, {
      ...data,
      userEmail
    });
    return response.data;
  },

  getOrderingPlan: async (planId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/ordering/plans/${planId}`, {
      params: { userEmail }
    });
    return response.data;
  },

  // Invoice Import
  importInvoice: async (file, userEmail) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/invoices/import`, formData, {
      params: { userEmail },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getInvoiceImportStatus: async (jobId, userEmail) => {
    const response = await axios.get(`${API_BASE_URL}/invoices/import/${jobId}`, {
      params: { userEmail }
    });
    return response.data;
  },

  resolveInvoiceImport: async (jobId, resolutions, userEmail) => {
    const response = await axios.post(`${API_BASE_URL}/invoices/import/${jobId}/resolve`, {
      resolutions
    }, {
      params: { userEmail }
    });
    return response.data;
  }
};

