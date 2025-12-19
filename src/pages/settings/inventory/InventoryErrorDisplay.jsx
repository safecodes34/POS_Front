import React, { useState } from 'react';

export default function InventoryErrorDisplay({ error, onRetry, onDismiss }) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Check if error is a database table missing error
  const isTableMissingError = error && (
    typeof error === 'string' && (
      error.includes('no such table') ||
      error.includes('no such column') ||
      error.includes('SQLITE_ERROR')
    )
  );

  if (!error) return null;

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: isTableMissingError ? '#e7f3ff' : '#ffebee',
      border: `2px solid ${isTableMissingError ? '#2196f3' : '#ef9a9a'}`,
      borderRadius: '8px',
      color: isTableMissingError ? '#1565c0' : '#c62828',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '1.1rem' }}>
            {isTableMissingError ? 'Setup Required' : 'Error'}
          </strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem' }}>
            {isTableMissingError 
              ? 'Inventory database tables are missing. This is normal for new installations.'
              : typeof error === 'string' ? error : error.message || 'An unexpected error occurred'}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: isTableMissingError ? '#1565c0' : '#c62828',
              cursor: 'pointer',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              padding: '0 0.5rem',
              marginLeft: '1rem'
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {isTableMissingError && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={onRetry}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              marginRight: '1rem'
            }}
          >
            Initialize Inventory DB
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#1565c0',
              border: '1px solid #1565c0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      )}
      
      {!isTableMissingError && onRetry && (
        <button
          onClick={onRetry}
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
          Retry
        </button>
      )}

      {showDetails && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
        </div>
      )}
    </div>
  );
}

