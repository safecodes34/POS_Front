import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InventoryLayout from './InventoryLayout';
import { InventoryErrorBoundary } from './InventoryErrorBoundary';
import OverviewTab from './OverviewTab';
import ReceivingTab from './ReceivingTab';
import CountsTab from './CountsTab';
import OrderingTab from './OrderingTab';
import CatalogTab from './CatalogTab';
import RecipesTab from './RecipesTab';
import PeriodAnalyticsTab from './PeriodAnalyticsTab';
import ForecastTab from './ForecastTab';

export default function InventoryRoutes({ userEmail }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!userEmail) {
    return (
      <div style={{ 
        padding: '3rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        border: '1px solid #e0e0e0',
        textAlign: 'center'
      }}>
        <p style={{ fontStyle: 'italic', color: '#666', fontSize: '1rem' }}>Please log in to access inventory management.</p>
      </div>
    );
  }

  // Extract the sub-route from the path
  // /settings/inventory -> overview
  // /settings/inventory/items -> items
  const pathParts = location.pathname.toLowerCase().split('/').filter(Boolean);
  const inventoryIndex = pathParts.indexOf('inventory');
  const subRoute = inventoryIndex >= 0 && pathParts.length > inventoryIndex + 1 
    ? pathParts[inventoryIndex + 1] 
    : 'overview';

  // Redirect unknown routes to overview
  // Also handle legacy routes (items, locations, vendors) -> catalog
  React.useEffect(() => {
    const validRoutes = ['overview', 'receiving', 'counts', 'ordering', 'catalog', 'recipes', 'periods', 'forecast'];
    const legacyRoutes = ['items', 'locations', 'vendors'];
    
    if (subRoute && legacyRoutes.includes(subRoute)) {
      // Redirect legacy routes to catalog
      navigate('/settings/inventory/catalog', { replace: true });
    } else if (subRoute && !validRoutes.includes(subRoute)) {
      navigate('/settings/inventory/overview', { replace: true });
    }
  }, [subRoute, navigate]);

  // Get contextual actions based on route - simplified to core actions only
  const getActions = () => {
    switch (subRoute) {
      case 'overview':
        // Home page: show primary workflow actions
        return {
          primary: { label: 'Start Count', onClick: () => navigate('/settings/inventory/counts') },
          secondary: { label: 'Receive Delivery', onClick: () => navigate('/settings/inventory/receiving') }
        };
      case 'receiving':
        return {
          primary: { label: 'Receive Delivery', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:create-invoice'));
          }}
        };
      case 'counts':
        return {
          primary: { label: 'Start Count', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:create-count'));
          }}
        };
      case 'ordering':
        return {
          primary: { label: 'Create PO / Export', onClick: () => {
            // This would trigger a refresh or export
            window.dispatchEvent(new CustomEvent('inventory:generate-reorder-list'));
          }}
        };
      case 'catalog':
        return {
          primary: { label: 'Add Item', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:catalog-add-item'));
          }}
        };
      case 'recipes':
        return {
          primary: { label: 'Add Recipe', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:add-recipe'));
          }}
        };
      case 'periods':
        return {
          primary: { label: 'Close Period', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:close-period'));
          }}
        };
      case 'forecast':
        return {
          primary: { label: 'Generate Forecast', onClick: () => {
            window.dispatchEvent(new CustomEvent('inventory:generate-forecast'));
          }}
        };
      default:
        return {};
    }
  };

  // Map sub-route to component
  const renderTab = () => {
    switch (subRoute) {
      case 'overview':
      case '':
        return <OverviewTab userEmail={userEmail} />;
      case 'receiving':
        return <ReceivingTab userEmail={userEmail} />;
      case 'counts':
        return <CountsTab userEmail={userEmail} />;
      case 'ordering':
        return <OrderingTab userEmail={userEmail} />;
      case 'catalog':
        return <CatalogTab userEmail={userEmail} />;
      case 'recipes':
        return <RecipesTab userEmail={userEmail} />;
      case 'periods':
        return <PeriodAnalyticsTab userEmail={userEmail} />;
      case 'forecast':
        return <ForecastTab userEmail={userEmail} />;
      default:
        return <OverviewTab userEmail={userEmail} />;
    }
  };

  const actions = getActions();

  return (
    <InventoryErrorBoundary>
      <InventoryLayout 
        primaryAction={actions.primary}
        secondaryAction={actions.secondary}
      >
        {renderTab()}
      </InventoryLayout>
    </InventoryErrorBoundary>
  );
}

