import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:4001';

export default function SecureOnboardingPage() {
  const [token, setToken] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [ssn, setSsn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankRoutingNumber, setBankRoutingNumber] = useState('');

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('t');
    
    if (!tokenFromUrl) {
      setError('Invalid link. No token provided.');
      setLoading(false);
      return;
    }

    setToken(tokenFromUrl);

    // Fetch employee data
    axios.get(`${API_BASE_URL}/api/employee-onboarding/secure/${tokenFromUrl}`)
      .then(response => {
        setEmployeeData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching employee data:', error);
        setError(error.response?.data?.error || 'Failed to load onboarding data. The link may be invalid or expired.');
        setLoading(false);
      });
  }, []);

  const formatSSN = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
  };

  const formatDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatRouting = (value) => {
    return value.replace(/\D/g, '').slice(0, 9);
  };

  const handleSSNChange = (e) => {
    const formatted = formatSSN(e.target.value);
    setSsn(formatted);
  };

  const handleDateOfBirthChange = (e) => {
    const formatted = formatDate(e.target.value);
    setDateOfBirth(formatted);
  };

  const handleRoutingChange = (e) => {
    const formatted = formatRouting(e.target.value);
    setBankRoutingNumber(formatted);
  };

  const handleAccountChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    setBankAccountNumber(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/api/employee-onboarding/secure/submit`, {
        token,
        ssn,
        dateOfBirth,
        bankAccountNumber,
        bankRoutingNumber
      });

      setSuccess(true);
      setSubmitting(false);
    } catch (error) {
      console.error('Error submitting data:', error);
      setError(error.response?.data?.error || 'Failed to submit information. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !employeeData) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Onboarding Error</h1>
          <p style={styles.error}>{error}</p>
          <p style={styles.helpText}>
            If you believe this is an error, please contact your employer.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Thank You!</h1>
          <p style={styles.successText}>
            Your information has been submitted successfully. We'll review it and get back to you if we need anything else.
          </p>
          <p style={styles.helpText}>
            You can safely close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Complete Your Onboarding</h1>
        <p style={styles.subtitle}>
          Hello {employeeData?.name}, please provide the following information to complete your onboarding.
        </p>

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="ssn" style={styles.label}>
              Social Security Number (SSN) <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="ssn"
              value={ssn}
              onChange={handleSSNChange}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              required
              style={styles.input}
            />
            <small style={styles.helpText}>
              Format: XXX-XX-XXXX
            </small>
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="dob" style={styles.label}>
              Date of Birth <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="dob"
              value={dateOfBirth}
              onChange={handleDateOfBirthChange}
              placeholder="MM/DD/YYYY"
              maxLength={10}
              required
              style={styles.input}
            />
            <small style={styles.helpText}>
              Format: MM/DD/YYYY
            </small>
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="routing" style={styles.label}>
              Bank Routing Number <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="routing"
              value={bankRoutingNumber}
              onChange={handleRoutingChange}
              placeholder="9 digits"
              maxLength={9}
              required
              style={styles.input}
            />
            <small style={styles.helpText}>
              9-digit routing number
            </small>
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="account" style={styles.label}>
              Bank Account Number <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="account"
              value={bankAccountNumber}
              onChange={handleAccountChange}
              placeholder="Account number"
              required
              style={styles.input}
            />
            <small style={styles.helpText}>
              Your bank account number for direct deposit
            </small>
          </div>

          <div style={styles.securityNote}>
            <strong>🔒 Security Note:</strong> This is a secure connection. Your sensitive information is encrypted and stored securely.
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={submitting ? { ...styles.submitButton, ...styles.submitButtonDisabled } : styles.submitButton}
          >
            {submitting ? 'Submitting...' : 'Submit Information'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '3rem',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
  },
  helpText: {
    fontSize: '0.85rem',
    color: '#666',
  },
  securityNote: {
    padding: '1rem',
    backgroundColor: '#e8f4f8',
    border: '1px solid #bee5eb',
    borderRadius: '4px',
    fontSize: '0.9rem',
    color: '#0c5460',
  },
  submitButton: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#1e3a5f',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
    cursor: 'not-allowed',
  },
  errorBanner: {
    padding: '1rem',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#721c24',
    marginBottom: '1rem',
  },
  error: {
    color: '#e74c3c',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#666',
  },
  successIcon: {
    fontSize: '4rem',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  successText: {
    fontSize: '1.1rem',
    color: '#333',
    textAlign: 'center',
    marginBottom: '1rem',
  },
};





