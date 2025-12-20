import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemsTab from './ItemsTab';
import LocationsTab from './LocationsTab';
import VendorsTab from './VendorsTab';

export default function CatalogTab({ userEmail }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('items'); // 'items', 'locations', 'vendors'

  useEffect(() => {
    // Listen for catalog-specific events
    const handleCatalogAddItem = () => {
      setActiveSection('items');
      window.dispatchEvent(new CustomEvent('inventory:add-item'));
    };
    
    window.addEventListener('inventory:catalog-add-item', handleCatalogAddItem);
    return () => window.removeEventListener('inventory:catalog-add-item', handleCatalogAddItem);
  }, []);

  return (
    <div>
      {/* Section Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveSection('items')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'items' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'items' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'items' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeSection !== 'items') {
              e.target.style.color = '#1e3a5f';
              e.target.style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeSection !== 'items') {
              e.target.style.color = '#666';
              e.target.style.backgroundColor = 'transparent';
            }
          }}
        >
          Items
        </button>
        <button
          onClick={() => setActiveSection('locations')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'locations' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'locations' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'locations' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeSection !== 'locations') {
              e.target.style.color = '#1e3a5f';
              e.target.style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeSection !== 'locations') {
              e.target.style.color = '#666';
              e.target.style.backgroundColor = 'transparent';
            }
          }}
        >
          Locations
        </button>
        <button
          onClick={() => setActiveSection('vendors')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeSection === 'vendors' ? '3px solid #1e3a5f' : '3px solid transparent',
            background: 'transparent',
            color: activeSection === 'vendors' ? '#1e3a5f' : '#666',
            fontWeight: activeSection === 'vendors' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeSection !== 'vendors') {
              e.target.style.color = '#1e3a5f';
              e.target.style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeSection !== 'vendors') {
              e.target.style.color = '#666';
              e.target.style.backgroundColor = 'transparent';
            }
          }}
        >
          Vendors
        </button>
      </div>

      {/* Render Active Section */}
      {activeSection === 'items' && <ItemsTab userEmail={userEmail} />}
      {activeSection === 'locations' && <LocationsTab userEmail={userEmail} />}
      {activeSection === 'vendors' && <VendorsTab userEmail={userEmail} />}
    </div>
  );
}






