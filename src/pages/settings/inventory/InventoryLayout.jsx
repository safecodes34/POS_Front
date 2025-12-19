import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Main navigation tabs - simplified to core workflow
const mainTabs = [
  { id: 'overview', label: 'Home', path: '/settings/inventory/overview' },
  { id: 'receiving', label: 'Receive', path: '/settings/inventory/receiving' },
  { id: 'counts', label: 'Count', path: '/settings/inventory/counts' },
  { id: 'ordering', label: 'Reorder', path: '/settings/inventory/ordering' },
  { id: 'catalog', label: 'Catalog', path: '/settings/inventory/catalog' }
];

// Advanced features - hidden by default, can be feature-flagged later
const advancedTabs = [
  { id: 'recipes', label: 'Recipes', path: '/settings/inventory/recipes' },
  { id: 'periods', label: 'Analytics', path: '/settings/inventory/periods' },
  { id: 'forecast', label: 'Forecast', path: '/settings/inventory/forecast' }
];

const tabs = mainTabs; // Only show main tabs for now

export default function InventoryLayout({ children, primaryAction, secondaryAction }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract current sub-route
  const pathParts = location.pathname.toLowerCase().split('/').filter(Boolean);
  const inventoryIndex = pathParts.indexOf('inventory');
  const currentSubRoute = inventoryIndex >= 0 && pathParts.length > inventoryIndex + 1 
    ? pathParts[inventoryIndex + 1] 
    : 'overview';

  // Redirect root /settings/inventory to overview
  React.useEffect(() => {
    if (location.pathname === '/settings/inventory' || location.pathname === '/settings/inventory/') {
      navigate('/settings/inventory/overview', { replace: true });
    }
  }, [navigate, location.pathname]);

  const handleTabClick = (path) => {
    navigate(path);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#1e3a5f' }}>
          Inventory Management
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#1e3a5f',
                border: '2px solid #1e3a5f',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f7ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1e3a5f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2d5a8a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#1e3a5f';
              }}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => {
          const isActive = tab.id === currentSubRoute || (tab.id === 'overview' && (currentSubRoute === '' || currentSubRoute === 'overview'));
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderBottom: isActive ? '3px solid #1e3a5f' : '3px solid transparent',
                background: 'transparent',
                color: isActive ? '#1e3a5f' : '#666',
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.color = '#1e3a5f';
                  e.target.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.color = '#666';
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render child content */}
      {children}
    </div>
  );
}

