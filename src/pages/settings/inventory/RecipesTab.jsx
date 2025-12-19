import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';

export default function RecipesTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadRecipes();
    }
  }, [userEmail]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getRecipes(null, null, userEmail);
      setRecipes(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCapacity = async (recipe) => {
    try {
      setLoadingCapacity(true);
      const data = await inventoryApi.getProductionCapacity(recipe.id, userEmail);
      setSelectedRecipe(recipe);
      setCapacity(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load capacity');
    } finally {
      setLoadingCapacity(false);
    }
  };

  if (loading && recipes.length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p>Loading recipes...</p></div>;
  }

  return (
    <div>
      {error && <div style={{ padding: '1rem', backgroundColor: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '8px', color: '#c62828', marginBottom: '1.5rem' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Recipes</h2>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Recipe</button>
      </div>
      {recipes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {recipes.map(recipe => (
            <div key={recipe.id} style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{recipe.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Yield: {recipe.yield_qty} {recipe.yield_uom}</p>
              <button onClick={() => handleViewCapacity(recipe)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View Capacity</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>No recipes found</p>
        </div>
      )}
      {selectedRecipe && capacity && (
        <div style={{ padding: '1.5rem', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
          <h3 style={{ marginTop: 0 }}>Production Capacity: {selectedRecipe.name}</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Max Yield: {capacity.maxYieldUnits} {selectedRecipe.yield_uom}</div>
          {capacity.limitingIngredient && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Limiting Ingredient:</strong> {capacity.limitingIngredient.location_name} - {capacity.limitingIngredient.on_hand_qty} available (enough for {capacity.limitingIngredient.batchesPossible} batches)
            </div>
          )}
          <div>
            <h4>Breakdown:</h4>
            {capacity.breakdown && capacity.breakdown.map((item, idx) => (
              <div key={idx} style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', marginBottom: '0.5rem' }}>
                {item.on_hand_qty} available - enough for {item.batchesPossible} batches
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

