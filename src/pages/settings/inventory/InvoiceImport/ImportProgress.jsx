import React from 'react';

export default function ImportProgress({ progress, onCancel }) {
  const steps = [
    { label: 'Uploading file', progress: 0.1 },
    { label: 'Parsing invoice', progress: 0.3 },
    { label: 'Matching items', progress: 0.6 },
    { label: 'Processing', progress: 0.9 },
    { label: 'Complete', progress: 1.0 }
  ];

  const currentStep = steps.find(step => progress <= step.progress) || steps[steps.length - 1];
  const stepIndex = steps.indexOf(currentStep);

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e3a5f' }}>Processing Invoice...</h3>
      
      <div style={{ marginBottom: '1.5rem' }}>
        {steps.map((step, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.75rem',
            opacity: index <= stepIndex ? 1 : 0.5
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: index < stepIndex ? '#28a745' : index === stepIndex ? '#1e3a5f' : '#ccc',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginRight: '0.75rem'
            }}>
              {index < stepIndex ? '✓' : index + 1}
            </div>
            <span style={{
              color: index <= stepIndex ? '#1e3a5f' : '#999',
              fontWeight: index === stepIndex ? '600' : 'normal'
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: `${progress * 100}%`,
          height: '100%',
          backgroundColor: '#1e3a5f',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}




