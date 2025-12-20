import React from 'react';

export default function UploadInvoiceCard({ onFileSelect, error, fileInputRef }) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        border: '2px dashed #ccc',
        borderRadius: '8px',
        padding: '3rem',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onClick={() => fileInputRef.current?.click()}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1e3a5f';
        e.currentTarget.style.backgroundColor = '#f0f4f8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#ccc';
        e.currentTarget.style.backgroundColor = '#f8f9fa';
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e3a5f' }}>Upload Invoice</h3>
      <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
        Drag and drop a PDF or CSV invoice file here, or click to browse
      </p>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
        Supported formats: PDF, CSV
      </p>
      
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}




