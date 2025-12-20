import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../inventoryApi';

export default function NeedsReviewTable({ 
  unmatchedLines, 
  matchedLines, 
  invoiceData,
  onResolve, 
  onCancel,
  userEmail 
}) {
  const [items, setItems] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    // Generate suggestions for each unmatched line
    const newSuggestions = {};
    unmatchedLines.forEach(line => {
      if (!resolutions[line.id]) {
        // Find best matches
        const matches = items
          .map(item => {
            const name1 = line.name.toLowerCase();
            const name2 = item.name.toLowerCase();
            const tokens1 = new Set(name1.split(/\s+/));
            const tokens2 = new Set(name2.split(/\s+/));
            const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
            const union = new Set([...tokens1, ...tokens2]);
            const score = intersection.size / union.size;
            return { item, score };
          })
          .filter(m => m.score > 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        
        newSuggestions[line.id] = matches;
      }
    });
    setSuggestions(newSuggestions);
  }, [unmatchedLines, items, resolutions]);

  const loadItems = async () => {
    try {
      const data = await inventoryApi.getItems(userEmail);
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handleResolution = (lineId, action, data = {}) => {
    setResolutions(prev => ({
      ...prev,
      [lineId]: { action, ...data }
    }));
  };

  const handleApply = () => {
    const resolutionArray = Object.entries(resolutions).map(([lineId, resolution]) => ({
      lineId,
      rawName: unmatchedLines.find(l => l.id === lineId)?.name,
      ...resolution
    }));

    onResolve(resolutionArray);
  };

  const allResolved = unmatchedLines.every(line => resolutions[line.id]);

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#1e3a5f' }}>Needs Review</h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#666' }}>
        {unmatchedLines.length} line(s) couldn't be automatically matched. Please resolve them:
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Item</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Qty</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Unit Cost</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {unmatchedLines.map(line => {
              const resolution = resolutions[line.id];
              const lineSuggestions = suggestions[line.id] || [];

              return (
                <tr key={line.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {line.name}
                    </div>
                    {lineSuggestions.length > 0 && !resolution && (
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                        <strong>Suggestions:</strong>
                        {lineSuggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleResolution(line.id, 'match_existing', { 
                              inventoryItemId: s.item.id 
                            })}
                            style={{
                              margin: '0.25rem 0.25rem 0 0',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#e7f3ff',
                              border: '1px solid #1e3a5f',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            {s.item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{line.qty} {line.unit}</td>
                  <td style={{ padding: '0.75rem' }}>${line.unitCost.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {!resolution ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleResolution(line.id, 'match_existing', { inventoryItemId: e.target.value });
                            }
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #1e3a5f',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            minWidth: '150px'
                          }}
                        >
                          <option value="">Select item...</option>
                          {items.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const name = prompt('Item name:', line.name);
                            if (name) {
                              handleResolution(line.id, 'create_new', {
                                newItemPayload: {
                                  name,
                                  base_uom: line.unit || 'each'
                                }
                              });
                            }
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Create New
                        </button>
                        <button
                          onClick={() => handleResolution(line.id, 'ignore')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Ignore
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#28a745' }}>
                        {resolution.action === 'match_existing' && '✓ Matched'}
                        {resolution.action === 'create_new' && '✓ Will Create'}
                        {resolution.action === 'ignore' && '✗ Ignored'}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
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
          onClick={handleApply}
          disabled={!allResolved}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: allResolved ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: allResolved ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          Apply Updates
        </button>
      </div>
    </div>
  );
}

