import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function OverviewTab({ userEmail }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadOverview();
    }
  }, [userEmail]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getOverview(userEmail);
      setStats(data);
      // Check if setup is needed (no locations is the first step)
      setNeedsOnboarding(data.locations === 0);
    } catch (err) {
      console.error('Error loading overview:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load overview';
      // Check if it's a table missing error (needs DB initialization)
      const isTableMissing = errorMsg.includes('no such table') || errorMsg.includes('table') && errorMsg.includes('does not exist');
      if (isTableMissing) {
        setNeedsOnboarding(true);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    try {
      setLoading(true);
      setError(null);
      await inventoryApi.bootstrap(userEmail);
      await loadOverview();
      setNeedsOnboarding(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize database');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading...</p>
      </div>
    );
  }

  const isEmpty = stats && stats.items === 0 && stats.locations === 0 && stats.vendors === 0;

  // Onboarding wizard - show if DB needs initialization or no locations exist
  if (needsOnboarding && (isEmpty || error?.includes('no such table'))) {
    return (
      <OnboardingWizard 
        userEmail={userEmail}
        onComplete={loadOverview}
        onBootstrap={handleBootstrap}
        error={error}
      />
    );
  }

  return (
    <div>
      <InventoryErrorDisplay 
        error={error} 
        onRetry={loadOverview}
        onDismiss={() => setError(null)}
      />

      {/* Main Dashboard - Three Context Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <ContextCard
          title="Receive Delivery"
          actionLabel="Receive Delivery"
          onAction={() => navigate('/settings/inventory/receiving')}
          stats={{
            lastReceived: stats?.last_received_date ? formatDaysAgo(stats.last_received_date) : null,
            pendingCount: stats?.pending_invoices || 0
          }}
        />
        <ContextCard
          title="Start Count"
          actionLabel="Start Count"
          onAction={() => navigate('/settings/inventory/counts')}
          stats={{
            nextCountDue: stats?.next_count_due ? formatDaysAgo(stats.next_count_due) : null,
            lastVariance: stats?.last_count_variance || null,
            activeCounts: stats?.active_counts || 0
          }}
        />
        <ContextCard
          title="Reorder List"
          actionLabel="Create PO / Export / Send"
          onAction={() => navigate('/settings/inventory/ordering')}
          stats={{
            itemsBelowPar: stats?.low_stock || 0,
            reorderSuggestions: stats?.reorder_suggestions || 0
          }}
        />
      </div>
    </div>
  );
}

// Onboarding Wizard - 3-step setup
function OnboardingWizard({ userEmail, onComplete, onBootstrap, error }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    // Auto-initialize DB if needed
    if (error?.includes('no such table')) {
      handleBootstrap();
    } else {
      loadProgress();
    }
  }, []);

  const handleBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      await onBootstrap();
      await loadProgress();
    } catch (err) {
      console.error('Bootstrap failed:', err);
    } finally {
      setBootstrapLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const [locsData, itemsData, vendorsData] = await Promise.all([
        inventoryApi.getLocations(userEmail).catch(() => []),
        inventoryApi.getItems(userEmail).catch(() => []),
        inventoryApi.getVendors(userEmail).catch(() => [])
      ]);
      const locs = locsData || [];
      const itemsList = itemsData || [];
      const vendorsList = vendorsData || [];
      
      setLocations(locs);
      setItems(itemsList);
      setVendors(vendorsList);

      // Auto-advance steps based on completion
      if (locs.length === 0) {
        setStep(1);
      } else if (itemsList.length === 0) {
        setStep(2);
      } else if (vendorsList.length === 0) {
        setStep(3);
      } else {
        // All steps complete, exit onboarding
        onComplete();
      }
    } catch (err) {
      console.error('Error loading progress:', err);
    }
  };

  if (bootstrapLoading || error?.includes('no such table')) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Initializing inventory system...</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.75rem' }}>
        Inventory Setup
      </h2>

      {/* Progress Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
        {[1, 2, 3].map((num) => (
          <div key={num} style={{ flex: 1, position: 'relative', zIndex: 2 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: step >= num ? '#1e3a5f' : '#ddd',
              color: step >= num ? 'white' : '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              margin: '0 auto',
              marginBottom: '0.5rem'
            }}>
              {step > num ? '✓' : num}
            </div>
            <div style={{
              fontSize: '0.9rem',
              textAlign: 'center',
              color: step >= num ? '#1e3a5f' : '#999',
              fontWeight: step === num ? '600' : '400'
            }}>
              {num === 1 ? 'Location' : num === 2 ? 'Items' : 'Vendor'}
            </div>
          </div>
        ))}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          height: '2px',
          backgroundColor: '#ddd',
          zIndex: 1
        }}>
          <div style={{
            width: step >= 2 ? '50%' : step >= 3 ? '100%' : '0%',
            height: '100%',
            backgroundColor: '#1e3a5f',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Step Content */}
      <div style={{ minHeight: '300px', marginBottom: '2rem' }}>
        {step === 1 && (
          <OnboardingStep
            title="Create Location"
            description="Set up at least one storage location (e.g., Walk-in, Dry Storage, Freezer)"
            completed={locations.length > 0}
            completedText={`${locations.length} location(s) created`}
            actionLabel="Create Location"
            onAction={() => {
              window.dispatchEvent(new CustomEvent('inventory:add-location'));
              setTimeout(() => navigate('/settings/inventory/catalog'), 100);
            }}
            onNext={() => {
              if (locations.length > 0) setStep(2);
              else loadProgress();
            }}
            onSkip={async () => {
              // Auto-create "Main Storage" if skipped
              try {
                await inventoryApi.createLocation({ name: 'Main Storage', sort_order: 0 }, userEmail);
                await loadProgress();
                setStep(2);
              } catch (err) {
                console.error('Error creating default location:', err);
              }
            }}
          />
        )}
        {step === 2 && (
          <OnboardingStep
            title="Add Items"
            description="Create inventory items (ingredients, supplies, etc.) You can add more later."
            completed={items.length > 0}
            completedText={`${items.length} item(s) created`}
            actionLabel="Add Items"
            onAction={() => {
              window.dispatchEvent(new CustomEvent('inventory:catalog-add-item'));
              setTimeout(() => navigate('/settings/inventory/catalog'), 100);
            }}
            onNext={() => {
              if (items.length > 0) setStep(3);
              else loadProgress();
            }}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <OnboardingStep
            title="Add Vendor (Optional)"
            description="Set up vendors for purchasing. You can skip this and add vendors later."
            completed={vendors.length > 0}
            completedText={`${vendors.length} vendor(s) created`}
            actionLabel="Add Vendor"
            onAction={() => {
              window.dispatchEvent(new CustomEvent('inventory:add-vendor'));
              setTimeout(() => navigate('/settings/inventory/catalog'), 100);
            }}
            onNext={() => {
              onComplete();
            }}
            onSkip={() => onComplete()}
            canSkip={true}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button
          onClick={onComplete}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Skip Setup
        </button>
      </div>
    </div>
  );
}

function OnboardingStep({ title, description, completed, completedText, actionLabel, onAction, onNext, onSkip, canSkip = false }) {
  return (
    <div>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: '#666', marginBottom: '2rem' }}>{description}</p>
      {completed && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#d4edda',
          border: '1px solid #28a745',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          color: '#155724',
          fontWeight: '600'
        }}>
          ✓ {completedText}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onAction}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {actionLabel}
        </button>
        {completed && (
          <button
            onClick={onNext}
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
            Continue
          </button>
        )}
        {canSkip && (
          <button
            onClick={onSkip}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// Context Card - Shows "What do I do next?"
function ContextCard({ title, actionLabel, onAction, stats }) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', color: '#1e3a5f' }}>
        {title}
      </h3>
      <div style={{ flex: 1, marginBottom: '1.5rem', color: '#666' }}>
        {stats.lastReceived && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Last received:</strong> {stats.lastReceived}
          </div>
        )}
        {stats.pendingCount !== undefined && stats.pendingCount > 0 && (
          <div style={{ marginBottom: '0.5rem', color: '#ff9800', fontWeight: '600' }}>
            {stats.pendingCount} invoice{stats.pendingCount !== 1 ? 's' : ''} pending review
          </div>
        )}
        {stats.nextCountDue && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Next cycle count:</strong> {stats.nextCountDue}
          </div>
        )}
        {stats.lastVariance !== null && stats.lastVariance !== undefined && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Variance last count:</strong> {formatVariance(stats.lastVariance)}
          </div>
        )}
        {stats.activeCounts !== undefined && stats.activeCounts > 0 && (
          <div style={{ marginBottom: '0.5rem', color: '#2196F3', fontWeight: '600' }}>
            {stats.activeCounts} active count{stats.activeCounts !== 1 ? 's' : ''}
          </div>
        )}
        {stats.itemsBelowPar !== undefined && stats.itemsBelowPar > 0 && (
          <div style={{ marginBottom: '0.5rem', color: '#f44336', fontWeight: '600' }}>
            {stats.itemsBelowPar} item{stats.itemsBelowPar !== 1 ? 's' : ''} below par
          </div>
        )}
        {stats.reorderSuggestions !== undefined && stats.reorderSuggestions > 0 && (
          <div style={{ marginBottom: '0.5rem', color: '#666' }}>
            {stats.reorderSuggestions} suggestion{stats.reorderSuggestions !== 1 ? 's' : ''} ready
          </div>
        )}
        {!stats.lastReceived && !stats.pendingCount && !stats.nextCountDue && !stats.itemsBelowPar && (
          <div style={{ fontStyle: 'italic', color: '#999' }}>
            No data available yet
          </div>
        )}
      </div>
      <button
        onClick={onAction}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1e3a5f',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '1rem',
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#2d5a8a';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#1e3a5f';
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// Helper functions
function formatDaysAgo(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
}

function formatVariance(variance) {
  if (typeof variance === 'number') {
    const sign = variance >= 0 ? '+' : '';
    return `${sign}$${variance.toFixed(2)}`;
  }
  return variance || 'N/A';
}

