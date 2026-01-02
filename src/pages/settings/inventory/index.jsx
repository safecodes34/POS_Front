import React from 'react';
import { InventoryErrorBoundary } from './InventoryErrorBoundary';
import SimpleInventory from './SimpleInventory';

export default function InventoryRoutes({ userEmail }) {
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

  return (
    <InventoryErrorBoundary>
      <SimpleInventory userEmail={userEmail} />
    </InventoryErrorBoundary>
  );
}

