import React, { useState, useRef } from 'react';
import { inventoryApi } from './inventoryApi';
import UploadInvoiceCard from './InvoiceImport/UploadInvoiceCard';
import ImportProgress from './InvoiceImport/ImportProgress';
import NeedsReviewTable from './InvoiceImport/NeedsReviewTable';
import ImportResults from './InvoiceImport/ImportResults';

export default function InvoiceImport({ userEmail, onComplete }) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'csv') {
      setError('Only PDF and CSV files are allowed');
      return;
    }

    try {
      setError(null);
      setStatus({ status: 'processing', progress: 0 });
      
      const result = await inventoryApi.importInvoice(file, userEmail);
      setJobId(result.jobId);
      
      // Start polling
      pollJobStatus(result.jobId);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to upload invoice');
      setStatus(null);
    }
  };

  const pollJobStatus = async (currentJobId) => {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await inventoryApi.getInvoiceImportStatus(currentJobId, userEmail);
        setStatus(result);

        if (result.status === 'processing' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000); // Poll every 1 second
        } else if (result.status === 'needs_review') {
          // Stop polling, user needs to review
        } else if (result.status === 'complete') {
          // Stop polling and notify parent component
          if (onComplete && result.result) {
            onComplete(result.result);
          }
        } else if (result.status === 'error') {
          setError(result.error || 'Import failed. Please try again.');
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Retry after 2 seconds on error
        } else {
          setError('Failed to check import status');
        }
      }
    };

    poll();
  };

  const handleResolve = async (resolutions) => {
    if (!jobId) return;

    try {
      setError(null);
      setStatus({ status: 'processing', progress: 0.9 });
      
      const result = await inventoryApi.resolveInvoiceImport(jobId, resolutions, userEmail);
      setStatus(result);
      
      if (result.status === 'complete' && onComplete) {
        onComplete(result.result);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to resolve import');
    }
  };

  const handleReset = () => {
    setJobId(null);
    setStatus(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show results if complete
  if (status?.status === 'complete') {
    return (
      <ImportResults 
        result={status.result} 
        onReset={handleReset}
        onViewInvoice={() => {
          if (status.result?.invoiceId) {
            window.location.href = `/settings/inventory/receiving?invoice=${status.result.invoiceId}`;
          }
        }}
      />
    );
  }

  // Show needs review
  if (status?.status === 'needs_review') {
    return (
      <NeedsReviewTable
        unmatchedLines={status.result?.unmatchedLines || []}
        matchedLines={status.result?.matchedLines || []}
        invoiceData={status.result}
        onResolve={handleResolve}
        onCancel={handleReset}
        userEmail={userEmail}
      />
    );
  }

  // Show progress
  if (status?.status === 'processing') {
    return (
      <ImportProgress 
        progress={status.progress || 0}
        onCancel={handleReset}
      />
    );
  }

  // Show upload form
  return (
    <UploadInvoiceCard
      onFileSelect={handleFileSelect}
      error={error}
      fileInputRef={fileInputRef}
    />
  );
}




