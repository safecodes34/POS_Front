import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import axios from 'axios'
import { loadStripeTerminal } from '@stripe/terminal-js'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Sample product data
const initialProducts = []

const initialCategories = ['All']
// Use environment variable for API URL, fallback to localhost for development
// Use environment variable or hardcoded production URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? 'https://posback-production-2407.up.railway.app/api' : 'https://localhost:4001/api')
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || (import.meta.env.PROD ? 'https://posback-production-2407.up.railway.app' : 'https://localhost:4001')

// LocalStorage keys
const STORAGE_KEYS = {
  CART: 'pos_cart',
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  ORDER_TYPE: 'pos_order_type',
  SELECTED_CATEGORY: 'pos_selected_category',
  ACTIVE_VIEW: 'pos_active_view',
  TEAM_MEMBERS: 'pos_team_members'
}

// Helper function to get image URL
const getImageUrl = (image) => {
  if (!image) return null
  if (image.startsWith('http') || image.startsWith('blob:')) return image
  if (image.startsWith('/uploads/')) {
    const fullUrl = `${IMAGE_BASE_URL}${image}`
    console.log('Constructed image URL:', fullUrl, 'from path:', image)
    return fullUrl
  }
  return image
}

// Payment Form Component using Stripe Payment Element
const PaymentFormModal = ({ clientSecret, subscriptionId, selectedPlan, plans, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  
  const plan = plans.find(p => p.id === selectedPlan)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      return
    }
    
    setIsProcessing(true)
    setErrorMessage(null)
    
    try {
      // Confirm payment with Stripe
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setErrorMessage(submitError.message)
        setIsProcessing(false)
        return
      }
      
      // Confirm the payment intent
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname,
        },
        redirect: 'if_required'
      })
      
      if (error) {
        setErrorMessage(error.message)
        setIsProcessing(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, verify subscription status
        try {
          const response = await axios.post(`${API_BASE_URL}/subscription/confirm-payment`, {
            subscriptionId: subscriptionId,
            email: JSON.parse(localStorage.getItem('pos_current_user'))?.email
          })
          
          if (response.data.success) {
            onSuccess()
          } else {
            setErrorMessage('Payment succeeded but subscription activation failed. Please contact support.')
            setIsProcessing(false)
          }
        } catch (verifyError) {
          console.error('Error verifying subscription:', verifyError)
          setErrorMessage('Payment succeeded but verification failed. Please contact support.')
          setIsProcessing(false)
        }
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage(err.message || 'An error occurred during payment')
      setIsProcessing(false)
    }
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111', margin: 0 }}>
            Complete Payment
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
        
        {plan && (
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: '#333' }}>Plan:</span>
              <span style={{ color: '#666' }}>{plan.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600', color: '#333' }}>Amount:</span>
              <span style={{ color: '#666', fontSize: '1.1rem', fontWeight: '700' }}>
                ${plan.price}/month
              </span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <PaymentElement />
          </div>
          
          {errorMessage && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {errorMessage}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '0.875rem',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '2px solid #999',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              style={{
                flex: 1,
                padding: '0.875rem',
                backgroundColor: '#1e3a5f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (!stripe || isProcessing) ? 'not-allowed' : 'pointer',
                opacity: (!stripe || isProcessing) ? 0.6 : 1
              }}
            >
              {isProcessing ? 'Processing...' : `Pay $${plan?.price || 0}/month`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// AI-powered topping categorization helper
const categorizeToppings = (toppings) => {
  const categories = {
    'Meat': [],
    'Rice': [],
    'Beans': [],
    'Cheese': [],
    'Sauce': [],
    'Extras': []
  }
  
  // Keywords for each category (case-insensitive matching)
  const categoryKeywords = {
    'Meat': ['chicken', 'beef', 'steak', 'carnitas', 'pork', 'barbacoa', 'chorizo', 'fish', 'shrimp', 'tofu', 'sofritas', 'carne', 'asada', 'pastor', 'birria', 'pollo', 'bacon', 'ham', 'turkey', 'sausage', 'meat', 'protein'],
    'Rice': ['rice', 'arroz', 'white rice', 'brown rice', 'cilantro rice', 'lime rice', 'spanish rice', 'mexican rice'],
    'Beans': ['beans', 'bean', 'frijoles', 'black beans', 'pinto beans', 'refried beans', 'lentils'],
    'Cheese': ['cheese', 'queso', 'mozzarella', 'cheddar', 'jack', 'cotija', 'oaxaca', 'asadero', 'manchego'],
    'Sauce': ['salsa', 'sauce', 'hot sauce', 'verde', 'roja', 'chipotle', 'habanero', 'sour cream', 'crema', 'ranch', 'aioli', 'mayo', 'pico', 'guac', 'guacamole']
  }
  
  toppings.forEach((topping, originalIndex) => {
    const toppingName = (typeof topping === 'string' ? topping : topping.name || '').toLowerCase()
    let categorized = false
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => toppingName.includes(keyword))) {
        categories[category].push({ topping, originalIndex })
        categorized = true
        break
      }
    }
    
    // If no category matched, put in Extras
    if (!categorized) {
      categories['Extras'].push({ topping, originalIndex })
    }
  })
  
  // Return only non-empty categories in a logical order
  const orderedCategories = ['Meat', 'Rice', 'Beans', 'Cheese', 'Sauce', 'Extras']
  return orderedCategories
    .filter(cat => categories[cat].length > 0)
    .map(cat => ({ category: cat, items: categories[cat] }))
}

function App() {
  // Load initial state from localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error)
      return defaultValue
    }
  }

  // Helper function to get section from URL
  const getSectionFromURL = () => {
    const pathname = window.location.pathname
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length >= 2 && segments[0] === 'Settings') {
      // Decode URL-encoded section name (handles spaces like "Team members")
      try {
        return decodeURIComponent(segments[1])
      } catch (e) {
        // If decoding fails, return the raw segment
        return segments[1]
      }
    }
    return null
  }

  // Helper function to get category from URL query params
  const getCategoryFromURL = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('category')
  }

  // Initialize activeView from URL pathname or localStorage
  const [activeView, setActiveView] = useState(() => {
    // First check URL pathname
    const pathname = window.location.pathname
    const path = pathname.split('/').filter(Boolean)[0] // Get first path segment
    if (path && ['Transaction', 'Timesheets', 'Settings'].includes(path)) {
      return path
    }
    // Fall back to localStorage
    return loadFromStorage(STORAGE_KEYS.ACTIVE_VIEW, null)
  })

  const [selectedCategory, setSelectedCategory] = useState(() => {
    // Check URL first if on main menu (no activeView in URL)
    const pathname = window.location.pathname
    const path = pathname.split('/').filter(Boolean)[0]
    if (!path || !['Transaction', 'Timesheets', 'Settings'].includes(path)) {
      const categoryFromURL = getCategoryFromURL()
      if (categoryFromURL) {
        return categoryFromURL
      }
    }
    // Fall back to localStorage
    return loadFromStorage(STORAGE_KEYS.SELECTED_CATEGORY, 'All')
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState(() => loadFromStorage(STORAGE_KEYS.CART, []))
  const [orderType, setOrderType] = useState(() => {
    // Always start with null - no pre-selection
    // Clear any existing value in localStorage to ensure fresh start
    try {
      localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
    } catch (error) {
      console.error('Error clearing order type from localStorage:', error)
    }
    return null
  })
  const [isOrderTypeWarningModalOpen, setIsOrderTypeWarningModalOpen] = useState(false)
  // Initialize products as empty array - will be loaded from backend when user logs in
  const [products, setProducts] = useState([])
  const [editingProductId, setEditingProductId] = useState(null)
  const [editFormData, setEditFormData] = useState({ name: '', price: '', image: null, imagePreview: null, toppings: [], ingredients: [] })
  const [newTopping, setNewTopping] = useState('')
  const [newToppingPrice, setNewToppingPrice] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [categories, setCategories] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIES, initialCategories)
  )
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeEditSection, setActiveEditSection] = useState('details')
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedToppingIndex, setDraggedToppingIndex] = useState(null)
  const [dragOverToppingIndex, setDragOverToppingIndex] = useState(null)
  const [failedImages, setFailedImages] = useState(new Set())
  const [pendingBlobUrls, setPendingBlobUrls] = useState(new Set()) // Track blob URLs that are pending upload
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [productSection, setProductSection] = useState('')
  const [isToppingsModalOpen, setIsToppingsModalOpen] = useState(false)
  const [selectedProductForToppings, setSelectedProductForToppings] = useState(null)
  const [selectedToppings, setSelectedToppings] = useState([])
  const [toppingPortions, setToppingPortions] = useState({}) // { toppingName: 'half' | 'full' | 'double' }
  const [isIngredientsModalOpen, setIsIngredientsModalOpen] = useState(false)
  const [selectedProductForIngredients, setSelectedProductForIngredients] = useState(null)
  const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [isRemoveEmployeeModalOpen, setIsRemoveEmployeeModalOpen] = useState(false)
  const [employeeToRemove, setEmployeeToRemove] = useState(null)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [showSignupOnAuthPage, setShowSignupOnAuthPage] = useState(false)
  const [showPaymentPage, setShowPaymentPage] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [subscriptionId, setSubscriptionId] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showEmbeddedCheckout, setShowEmbeddedCheckout] = useState(false)
  const [checkoutSessionId, setCheckoutSessionId] = useState(null)
  const [stripeInstance, setStripeInstance] = useState(null)
  const checkoutRef = useRef(null)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_current_user')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      return null
    }
  })
  const [loginFormData, setLoginFormData] = useState({ email: '', password: '' })
  const [signupFormData, setSignupFormData] = useState({ email: '', password: '', confirmPassword: '' })
  const [authError, setAuthError] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [showModalLoginPassword, setShowModalLoginPassword] = useState(false)
  const [showModalSignupPassword, setShowModalSignupPassword] = useState(false)
  const [showModalSignupConfirmPassword, setShowModalSignupConfirmPassword] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null) // 'Card' or 'Cash'
  const [stripeTerminal, setStripeTerminal] = useState(null)
  const [stripeReader, setStripeReader] = useState(null)
  const [isProcessingStripePayment, setIsProcessingStripePayment] = useState(false)
  const [stripePaymentStatus, setStripePaymentStatus] = useState(null)
  const [lastPaymentIntentId, setLastPaymentIntentId] = useState(null)
  const [isAutoImportModalOpen, setIsAutoImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('')
  
  // Settings state
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all fields exist
        return {
          ownerName: '',
          managerName: '',
          businessName: '',
          businessAddress: '',
          ownerEmail: '',
          ownerPhone: '',
          managerEmail: '',
          managerPhone: '',
          accountEmail: '',
          accountPassword: '',
          accountEmailLastEdited: null,
          accountPasswordLastEdited: null,
          cardholderName: '',
          cardNumber: '',
          cardExpiry: '',
          cardCVC: '',
          country: '',
          state: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          ...parsed
        }
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error)
    }
    return {
      ownerName: '',
      managerName: '',
      businessName: '',
      businessAddress: '',
      ownerEmail: '',
      ownerPhone: '',
      managerEmail: '',
      managerPhone: '',
      accountEmail: '',
      accountPassword: '',
      accountEmailLastEdited: null,
      accountPasswordLastEdited: null,
      cardholderName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCVC: '',
      country: '',
      state: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5)
    }
  })
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [lastManualDateTimeEdit, setLastManualDateTimeEdit] = useState(null)
  const [activeSettingsSection, setActiveSettingsSection] = useState(() => {
    // Check URL first if on Settings view
    const pathname = window.location.pathname
    const path = pathname.split('/').filter(Boolean)[0]
    if (path === 'Settings') {
      const sectionFromURL = getSectionFromURL()
      if (sectionFromURL && ['Account', 'Team members', 'Schedule', 'Edit time-sheets', 'Payroll', 'Compliance'].includes(sectionFromURL)) {
        return sectionFromURL
      }
    }
    // Fall back to localStorage or default
    try {
      const stored = localStorage.getItem('pos_active_settings_section')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (['Account', 'Team members', 'Schedule', 'Edit time-sheets', 'Payroll', 'Compliance'].includes(parsed)) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Error loading activeSettingsSection from localStorage:', error)
    }
    return 'Account'
  })
  const [teamMembers, setTeamMembers] = useState(() => loadFromStorage(STORAGE_KEYS.TEAM_MEMBERS, []))
  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_weekly_schedule')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading weekly schedule from localStorage:', error)
      return {}
    }
  })
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return monday.toISOString().split('T')[0]
  })
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    age: '',
    contact: '',
    email: '',
    emergencyContact: '',
    hourlyPay: '',
    password: ''
  })
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState({
    name: '',
    age: '',
    contact: '',
    email: '',
    emergencyContact: '',
    hourlyPay: '',
    password: ''
  })

  // Function to format date input automatically (adds "/" after MM and DD)
  const formatDateInput = (value) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '')
    
    // Limit to 8 digits (MMDDYYYY)
    const limitedNumbers = numbers.slice(0, 8)
    
    // Format: MM/DD/YYYY
    if (limitedNumbers.length <= 2) {
      return limitedNumbers
    } else if (limitedNumbers.length <= 4) {
      return `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2)}`
    } else {
      return `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2, 4)}/${limitedNumbers.slice(4)}`
    }
  }

  // Function to format phone number input automatically (adds "-" between segments and extension)
  const formatPhoneInput = (value) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '')
    
    // Limit to 14 digits (10 for phone + 4 for extension)
    const limitedNumbers = numbers.slice(0, 14)
    
    // Format: XXX-XXX-XXXX-XXXX (with extension)
    if (limitedNumbers.length <= 3) {
      return limitedNumbers
    } else if (limitedNumbers.length <= 6) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`
    } else if (limitedNumbers.length <= 10) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 6)}-${limitedNumbers.slice(6)}`
    } else {
      // With extension: XXX-XXX-XXXX-XXXX
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 6)}-${limitedNumbers.slice(6, 10)}-${limitedNumbers.slice(10)}`
    }
  }

  // Function to format emergency contact - formats as phone if it's a number, otherwise leaves as email
  const formatEmergencyContact = (value) => {
    // If the value contains "@", it's an email - don't format
    if (value.includes('@')) {
      return value
    }
    // If the value contains letters (a-z, A-Z), it's likely an email - don't format
    if (/[a-zA-Z]/.test(value)) {
      return value
    }
    // Otherwise, treat as phone number and format it
    return formatPhoneInput(value)
  }
  const [w4Files, setW4Files] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_w4_files')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading W-4 files from localStorage:', error)
      return {}
    }
  })

  // Payroll info state - stores bank account info for each employee
  // Format: { [employeeId]: { accountNumber: string, routingNumber: string } }
  const [payrollInfo, setPayrollInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_payroll_info')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading payroll info from localStorage:', error)
      return {}
    }
  })

  // Timesheets state - tracks clock in/out and breaks for each employee by date
  // Format: { [employeeId]: { [date]: { clockIn: timestamp, clockOut: timestamp | null, breaks: [{ breakOut: timestamp, breakIn: timestamp | null }] } } }
  const [timesheetEntries, setTimesheetEntries] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_timesheet_entries')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading timesheet entries from localStorage:', error)
      return {}
    }
  })

  // Password authentication state - tracks authenticated employees with timestamps
  // Format: { [employeeId]: timestamp } - timestamp is when they authenticated
  const [authenticatedEmployees, setAuthenticatedEmployees] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_authenticated_employees')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading authenticated employees from localStorage:', error)
      return {}
    }
  })

  // Password prompt modal state
  const [passwordPrompt, setPasswordPrompt] = useState({
    show: false,
    employeeId: null,
    employeeName: '',
    passwordInput: '',
    error: ''
  })

  // Timesheet editor state
  const [timesheetEditDate, setTimesheetEditDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [timesheetEditEmployee, setTimesheetEditEmployee] = useState(null)
  const [timesheetEditData, setTimesheetEditData] = useState({
    clockIn: '',
    clockOut: '',
    breaks: []
  })

  // Load transactions from backend
  const loadTransactionsFromBackend = async () => {
    // Only load transactions if user is logged in
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot load transactions: user not logged in')
      setTransactions([])
      return false
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions`, {
        params: {
          userEmail: currentUser.email
        }
      })
      console.log('✅ Transactions loaded:', response.data?.length || 0, 'transactions for user:', currentUser.email)
      if (response.data && Array.isArray(response.data)) {
        setTransactions(response.data)
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Error loading transactions:', error)
      return false
    }
  }

  // Reusable function to load products from backend
  const reloadProductsFromBackend = async () => {
    // Only load products if user is logged in
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot load products: user not logged in')
      setProducts([])
      return false
    }
    
    try {
      console.log('📡 Reloading products from:', `${API_BASE_URL}/products`)
      const response = await axios.get(`${API_BASE_URL}/products`, {
        params: {
          userEmail: currentUser.email
        }
      })
      console.log('✅ Products reloaded successfully:', response.data?.length || 0, 'products for user:', currentUser.email)
      
      if (response.data && Array.isArray(response.data)) {
        // Log all products with their categories for debugging
        console.log('📋 Reloaded products with categories:')
        response.data.forEach(p => {
          console.log(`  - ID ${p.id}: "${p.name}" → Category: "${p.category}"`)
        })
        
        // Clean up any blob URLs from products (they're temporary and invalid)
        const cleanedProducts = response.data.map(product => {
          if (product.image && product.image.startsWith('blob:')) {
            console.warn(`Removing invalid blob URL from product ${product.id}:`, product.image)
            return { ...product, image: null }
          }
          return product
        })
        setProducts(cleanedProducts)
        // Save to localStorage as backup
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleanedProducts))
        console.log('✅ Products state updated with', cleanedProducts.length, 'products')
        console.log('✅ Current selectedCategory:', selectedCategory)
        console.log('✅ Products matching selectedCategory:', cleanedProducts.filter(p => p.category === selectedCategory).map(p => p.name))
        return true
      }
      console.warn('⚠️ No products in response or invalid response format')
      return false
    } catch (error) {
      console.error('❌ Error reloading products from backend:', error)
      console.error('Error details:', error.response?.data || error.message)
      return false
    }
  }

  // Load products from backend when user logs in
  useEffect(() => {
    const loadProducts = async () => {
      // Only load products if user is logged in
      if (!currentUser || !currentUser.email) {
        console.log('⚠️ Cannot load products: user not logged in')
        // Clear products if user is not logged in
        setProducts([])
        return
      }

      try {
        // First verify backend is available
        try {
          const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/api/health`)
          console.log('✅ Backend health check passed:', healthResponse.data)
        } catch (healthError) {
          console.warn('⚠️ Backend server not available. Make sure it is running on https://localhost:4001')
          console.warn('   Health check error:', healthError.response?.status || healthError.message)
          console.warn('   Start it with: cd Back && npm start')
          // Don't load from localStorage - keep products empty if backend is unavailable
          setProducts([])
          return
        }
        
        console.log('📡 Fetching products from:', `${API_BASE_URL}/products`)
        const response = await axios.get(`${API_BASE_URL}/products`, {
          params: {
            userEmail: currentUser.email
          }
        })
        console.log('✅ Products loaded successfully:', response.data?.length || 0, 'products for user:', currentUser.email)
        
        if (response.data && response.data.length > 0) {
          // Clean up any blob URLs from products (they're temporary and invalid)
          const cleanedProducts = response.data.map(product => {
            if (product.image && product.image.startsWith('blob:')) {
              console.warn(`Removing invalid blob URL from product ${product.id}:`, product.image)
              return { ...product, image: null }
            }
            return product
          })
          setProducts(cleanedProducts)
          // Save to localStorage as backup
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleanedProducts))
        } else {
          // Backend has no products - set products to empty array
          // Don't sync localStorage products to avoid loading old data from previous users
          setProducts([])
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]))
        }
      } catch (error) {
        console.error('Error loading products from backend:', error)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
          console.error('Request URL:', error.config?.url)
          if (error.response.status === 404) {
            console.error('❌ 404 Error: The /api/products endpoint was not found.')
            console.error('   Requested URL:', error.config?.url || `${API_BASE_URL}/products`)
            console.error('   This usually means:')
            console.error('   1. The backend server is not running or routes are not registered')
            console.error('   2. The route path does not match (check Back/server.js)')
            console.error('   3. Start it with: cd Back && npm start')
            console.error('   4. Or use: .\\start-dev.ps1 to start both servers')
            console.error('   5. Check browser console for SSL certificate warnings')
          }
        } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.code === 'ERR_CERT_AUTHORITY_INVALID' || error.code === 'ERR_CERT_COMMON_NAME_INVALID') {
          console.error('❌ Cannot connect to backend server')
          console.error('   Error code:', error.code)
          console.error('   Error message:', error.message)
          console.error('   Make sure the backend is running on https://localhost:4001')
          console.error('   If using self-signed certificates, accept the certificate warning in your browser')
        } else {
          console.error('❌ Unexpected error:', error.code || error.message)
          console.error('   Full error:', error)
        }
        // If backend fails, set products to empty array (don't load from localStorage to avoid old data)
        setProducts([])
      }
    }
    loadProducts()
  }, [currentUser])

  // Save cart to localStorage whenever it changes
  // Load transactions when Transaction view is opened
  useEffect(() => {
    if (activeView === 'Transaction') {
      loadTransactionsFromBackend()
    }
  }, [activeView])

  // Auto-save categories to backend when they change (if user is logged in)
  useEffect(() => {
    if (currentUser && currentUser.email && categories.length > 0) {
      saveCategoriesToBackend(categories)
    }
  }, [categories, currentUser])

  // Auto-save team members to backend when they change (if user is logged in)
  useEffect(() => {
    if (currentUser && currentUser.email && teamMembers.length >= 0) {
      saveTeamMembersToBackend(teamMembers)
    }
  }, [teamMembers, currentUser])

  // Persist activeView to localStorage and URL pathname
  useEffect(() => {
    try {
      if (activeView) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, JSON.stringify(activeView))
        // Update URL pathname, preserving section if Settings view
        const currentPath = window.location.pathname.split('/').filter(Boolean)[0]
        if (currentPath !== activeView) {
          let newURL = `/${activeView}`
          // If Settings view, preserve or add section
          if (activeView === 'Settings') {
            const currentSection = getSectionFromURL()
            if (currentSection && ['Account', 'Team members', 'Schedule', 'Edit time-sheets', 'Payroll', 'Compliance'].includes(currentSection)) {
              newURL = `/${activeView}/${encodeURIComponent(currentSection)}`
            } else {
              newURL = `/${activeView}/${encodeURIComponent(activeSettingsSection)}`
            }
          }
          window.history.replaceState(null, '', newURL)
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_VIEW)
        // Update URL to root with category query param if needed
        const params = new URLSearchParams(window.location.search)
        const categoryParam = params.get('category')
        if (categoryParam && categoryParam !== 'All') {
          window.history.replaceState(null, '', `/?category=${encodeURIComponent(categoryParam)}`)
        } else {
          const currentPath = window.location.pathname.split('/').filter(Boolean)[0]
          if (currentPath && ['Transaction', 'Timesheets', 'Settings'].includes(currentPath)) {
            window.history.replaceState(null, '', '/')
          }
        }
      }
    } catch (error) {
      console.error('Error saving activeView to localStorage:', error)
    }
  }, [activeView, activeSettingsSection])

  // Persist activeSettingsSection to URL and localStorage
  useEffect(() => {
    if (activeView === 'Settings') {
      try {
        localStorage.setItem('pos_active_settings_section', JSON.stringify(activeSettingsSection))
        // Update URL to include section
        const pathname = window.location.pathname
        const path = pathname.split('/').filter(Boolean)[0]
        if (path === 'Settings') {
          const currentSection = getSectionFromURL()
          if (currentSection !== activeSettingsSection) {
            window.history.replaceState(null, '', `/${activeView}/${encodeURIComponent(activeSettingsSection)}`)
          }
        }
      } catch (error) {
        console.error('Error saving activeSettingsSection:', error)
      }
    }
  }, [activeSettingsSection, activeView])

  // Persist selectedCategory to URL when on main menu
  useEffect(() => {
    if (!activeView) {
      // On main menu, update URL with category query param
      const params = new URLSearchParams(window.location.search)
      const currentCategory = params.get('category')
      if (currentCategory !== selectedCategory) {
        if (selectedCategory && selectedCategory !== 'All') {
          window.history.replaceState(null, '', `/?category=${encodeURIComponent(selectedCategory)}`)
        } else {
          // Remove category param if 'All' or empty
          window.history.replaceState(null, '', '/')
        }
      }
    }
  }, [selectedCategory, activeView])

  // Restore route from URL on page load/reload
  useEffect(() => {
    // This runs on mount to ensure route is restored from URL after initial render
    const pathname = window.location.pathname
    const path = pathname.split('/').filter(Boolean)[0]
    if (path && ['Transaction', 'Timesheets', 'Settings'].includes(path)) {
      // Update if different from current state
      setActiveView(prevView => prevView !== path ? path : prevView)
      
      // Also restore section if Settings
      if (path === 'Settings') {
        const sectionFromURL = getSectionFromURL()
        if (sectionFromURL && ['Account', 'Team members', 'Schedule', 'Edit time-sheets', 'Payroll', 'Compliance'].includes(sectionFromURL)) {
          setActiveSettingsSection(sectionFromURL)
        }
      }
    } else {
      // On main menu, restore category from URL
      const categoryFromURL = getCategoryFromURL()
      if (categoryFromURL) {
        setSelectedCategory(categoryFromURL)
      }
    }
  }, []) // Only run on mount

  // Listen for pathname changes (browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname
      const path = pathname.split('/').filter(Boolean)[0]
      if (path && ['Transaction', 'Timesheets', 'Settings'].includes(path)) {
        setActiveView(path)
        // Restore section if Settings
        if (path === 'Settings') {
          const sectionFromURL = getSectionFromURL()
          if (sectionFromURL && ['Account', 'Team members', 'Schedule', 'Edit time-sheets', 'Payroll', 'Compliance'].includes(sectionFromURL)) {
            setActiveSettingsSection(sectionFromURL)
          }
        }
      } else {
        setActiveView(null)
        // Restore category if on main menu
        const categoryFromURL = getCategoryFromURL()
        if (categoryFromURL) {
          setSelectedCategory(categoryFromURL)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [cart])

  // Save categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
    } catch (error) {
      console.error('Error saving categories to localStorage:', error)
    }
  }, [categories])


  // Clean up blob URLs from products, but be very careful not to remove active ones
  // Only clean up blob URLs that are definitely stale (not in pendingBlobUrls)
  useEffect(() => {
    const hasBlobUrls = products.some(p => p.image && p.image.startsWith('blob:'))
    if (hasBlobUrls && pendingBlobUrls.size > 0) {
      // Only run cleanup if we have pending blob URLs to check against
      // This prevents cleanup from running immediately after setting a new blob URL
      const cleanedProducts = products.map(product => {
        if (product.image && product.image.startsWith('blob:')) {
          // Don't clean up blob URLs that are pending
          if (pendingBlobUrls.has(product.image)) {
            return product
          }
          // Only clean up blob URLs that are definitely NOT pending
          console.warn(`Removing stale blob URL from product ${product.id} (${product.name}):`, product.image)
          // Revoke the blob URL before removing it
          try {
            URL.revokeObjectURL(product.image)
          } catch (e) {
            // Ignore errors when revoking
          }
          return { ...product, image: null }
        }
        return product
      })
      // Only update if there are actual changes
      const hasChanges = cleanedProducts.some((p, i) => p.image !== products[i]?.image)
      if (hasChanges) {
        setProducts(cleanedProducts)
      }
    }
  }, [products, pendingBlobUrls])

  // Save products to localStorage whenever they change
  useEffect(() => {
    try {
      // Don't save blob URLs to localStorage
      const productsToSave = products.map(p => ({
        ...p,
        image: p.image && p.image.startsWith('blob:') ? null : p.image
      }))
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsToSave))
    } catch (error) {
      console.error('Error saving products to localStorage:', error)
    }
  }, [products])

  // Save selected category to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, JSON.stringify(selectedCategory))
    } catch (error) {
      console.error('Error saving selected category to localStorage:', error)
    }
  }, [selectedCategory])

  // Save order type to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDER_TYPE, JSON.stringify(orderType))
    } catch (error) {
      console.error('Error saving order type to localStorage:', error)
    }
  }, [orderType])

  // Save team members to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(teamMembers))
    } catch (error) {
      console.error('Error saving team members to localStorage:', error)
    }
  }, [teamMembers])

  // Save W-4 files to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pos_w4_files', JSON.stringify(w4Files))
    } catch (error) {
      console.error('Error saving W-4 files to localStorage:', error)
    }
  }, [w4Files])

  useEffect(() => {
    try {
      localStorage.setItem('pos_weekly_schedule', JSON.stringify(weeklySchedule))
    } catch (error) {
      console.error('Error saving weekly schedule to localStorage:', error)
    }
  }, [weeklySchedule])

  // Save timesheet entries to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pos_timesheet_entries', JSON.stringify(timesheetEntries))
    } catch (error) {
      console.error('Error saving timesheet entries to localStorage:', error)
    }
  }, [timesheetEntries])

  // Save authenticated employees to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pos_authenticated_employees', JSON.stringify(authenticatedEmployees))
    } catch (error) {
      console.error('Error saving authenticated employees to localStorage:', error)
    }
  }, [authenticatedEmployees])

  // Auto-update date and time in real-time (every second)
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const currentDate = now.toISOString().split('T')[0]
      const currentTime = now.toTimeString().slice(0, 5)
      
      setSettings(prev => {
        // Always auto-update, but respect manual edits for 3 seconds
        const timeSinceLastEdit = lastManualDateTimeEdit ? Date.now() - lastManualDateTimeEdit : Infinity
        const shouldRespectManualEdit = timeSinceLastEdit < 3000 // 3 seconds
        
        // If user manually edited recently and values match what they set, keep them
        // Otherwise, update to current real-time values
        if (shouldRespectManualEdit && prev.date && prev.time) {
          // Check if current values are different from real-time (user set custom values)
          if (prev.date !== currentDate || prev.time !== currentTime) {
            // User has custom values set, keep them for now
            return prev
          }
        }
        
        // Auto-update to current real-time values
        return {
          ...prev,
          date: currentDate,
          time: currentTime
        }
      })
    }
    
    // Update immediately
    updateDateTime()
    
    // Then update every second
    const interval = setInterval(updateDateTime, 1000)
    
    return () => clearInterval(interval)
  }, [lastManualDateTimeEdit])

  // Check for expired authentications every minute (5-minute timeout)
  useEffect(() => {
    const checkAuthExpiry = () => {
      const now = Date.now()
      const FIVE_MINUTES = 5 * 60 * 1000 // 5 minutes in milliseconds
      
      setAuthenticatedEmployees(prev => {
        const updated = {}
        let changed = false
        
        Object.entries(prev).forEach(([employeeId, authTime]) => {
          if (now - authTime < FIVE_MINUTES) {
            updated[employeeId] = authTime
          } else {
            changed = true // This employee's auth expired
          }
        })
        
        return changed ? updated : prev
      })
    }

    // Check immediately
    checkAuthExpiry()
    
    // Then check every minute
    const interval = setInterval(checkAuthExpiry, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Helper function to check if employee is authenticated (within 5 minutes)
  const isEmployeeAuthenticated = (employeeId) => {
    if (!authenticatedEmployees[employeeId]) return false
    const authTime = authenticatedEmployees[employeeId]
    const now = Date.now()
    const FIVE_MINUTES = 5 * 60 * 1000
    return (now - authTime) < FIVE_MINUTES
  }

  // Authenticate employee with password
  const authenticateEmployee = (employeeId, password) => {
    const employee = teamMembers.find(emp => emp.id === employeeId)
    if (!employee) {
      return { success: false, error: 'Employee not found' }
    }
    
    if (!employee.password) {
      return { success: false, error: 'No password set for this employee' }
    }
    
    if (employee.password !== password) {
      return { success: false, error: 'Incorrect password' }
    }
    
    // Authentication successful - record timestamp
    setAuthenticatedEmployees(prev => ({
      ...prev,
      [employeeId]: Date.now()
    }))
    
    return { success: true }
  }

  // Save payroll info to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('pos_payroll_info', JSON.stringify(payrollInfo))
    } catch (error) {
      console.error('Error saving payroll info to localStorage:', error)
    }
  }, [payrollInfo])

  // Ref to track previous settings to prevent unnecessary saves
  const prevSettingsRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Save settings to localStorage and backend whenever they change
  useEffect(() => {
    // Deep comparison: only proceed if settings actually changed
    const settingsString = JSON.stringify(settings)
    const prevSettingsString = prevSettingsRef.current ? JSON.stringify(prevSettingsRef.current) : null
    
    // Skip if settings haven't actually changed
    if (settingsString === prevSettingsString) {
      return
    }
    
    // Update the ref with current settings
    prevSettingsRef.current = settings
    
    try {
      localStorage.setItem('pos_settings', settingsString)
      
      // Also save to backend if user is logged in
      if (currentUser && currentUser.email) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        
        // Debounce backend saves to avoid too many requests
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await axios.post(`${API_BASE_URL}/user/settings`, {
              email: currentUser.email,
              settings: settings
            })
            console.log('✅ Settings saved to backend')
          } catch (error) {
            console.error('Error saving settings to backend:', error)
            // Don't show error to user, just log it
          }
          saveTimeoutRef.current = null
        }, 2000) // Wait 2 seconds after last change before saving to backend
      }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error)
    }
    
    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [settings, currentUser])

  // Calculate total minutes worked for an employee from all timesheet entries (excluding breaks)
  const calculateTotalMinutesWorked = (employeeId) => {
    const entries = timesheetEntries[employeeId]
    if (!entries) return 0
    
    let totalMinutes = 0
    Object.values(entries).forEach(entry => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(entry.clockIn)
        const clockOut = new Date(entry.clockOut)
        let shiftMinutes = (clockOut - clockIn) / (1000 * 60)
        
        // Subtract break time
        if (entry.breaks?.length) {
          entry.breaks.forEach(brk => {
            if (brk.breakOut && brk.breakIn) {
              shiftMinutes -= (new Date(brk.breakIn) - new Date(brk.breakOut)) / (1000 * 60)
            }
          })
        }
        
        totalMinutes += Math.max(0, shiftMinutes)
      }
    })
    
    return totalMinutes
  }

  // Format minutes to hours and minutes display (e.g., "2h 30m")
  const formatHoursMinutes = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }

  // Get total hours as decimal for calculations
  const calculateTotalHoursWorked = (employeeId) => {
    return (calculateTotalMinutesWorked(employeeId) / 60).toFixed(2)
  }

  // Helper function to parse schedule time string (e.g., "6am-3pm" or "9:30am-5pm")
  const parseScheduleTime = (timeStr) => {
    if (!timeStr || timeStr.toLowerCase() === 'off') return null
    
    const match = timeStr.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i)
    if (!match) return null
    
    const parseTime = (time, period) => {
      let [hours, minutes = '0'] = time.split(':')
      hours = parseInt(hours)
      minutes = parseInt(minutes)
      
      if (period?.toLowerCase() === 'pm' && hours !== 12) hours += 12
      if (period?.toLowerCase() === 'am' && hours === 12) hours = 0
      
      return { hours, minutes }
    }
    
    const startTime = parseTime(match[1], match[2])
    const endTime = parseTime(match[3], match[4])
    
    if (!startTime || !endTime) return null
    
    return { startTime, endTime }
  }

  // Calculate expected hours from schedule string
  const calculateExpectedHours = (scheduleStr) => {
    const parsed = parseScheduleTime(scheduleStr)
    if (!parsed) return 0
    
    const { startTime, endTime } = parsed
    let hours = endTime.hours - startTime.hours
    let minutes = endTime.minutes - startTime.minutes
    
    if (minutes < 0) {
      hours -= 1
      minutes += 60
    }
    
    // Handle overnight shifts
    if (hours < 0) hours += 24
    
    return hours + (minutes / 60)
  }

  // Helper function to create ISO timestamp from settings date and time
  const getTimestampFromSettings = () => {
    if (settings.date && settings.time) {
      // Combine date and time from settings
      const dateTimeString = `${settings.date}T${settings.time}:00`
      return new Date(dateTimeString).toISOString()
    }
    // Fallback to current time if settings not available
    return new Date().toISOString()
  }
  
  // Helper function to get current date from settings (or fallback to real date)
  const getCurrentDateFromSettings = () => {
    return settings.date || new Date().toISOString().split('T')[0]
  }

  // Get today's schedule for an employee
  const getTodaySchedule = (employeeId) => {
    const today = getCurrentDateFromSettings()
    return getSchedule(employeeId, today)
  }

  // Check if employee can clock in (within 15 minutes of scheduled start)
  // Always allows clock-in attempts - password authentication is required regardless
  const canClockIn = (employeeId) => {
    const schedule = getTodaySchedule(employeeId)
    
    // If not scheduled, allow clock-in but show warning
    if (!schedule || schedule.toLowerCase() === 'off') {
      return { allowed: true, reason: '', warning: 'Not scheduled today' }
    }
    
    const parsed = parseScheduleTime(schedule)
    if (!parsed) {
      // Invalid schedule format - still allow clock-in but show warning
      return { allowed: true, reason: '', warning: 'Invalid schedule format' }
    }
    
    const now = new Date()
    const shiftStart = new Date()
    shiftStart.setHours(parsed.startTime.hours, parsed.startTime.minutes, 0, 0)
    
    // Can clock in maximum 15 minutes early
    const earliestClockIn = new Date(shiftStart.getTime() - 15 * 60 * 1000)
    
    // If it's before the earliest allowed time (15 min before shift), show warning but allow
    if (now < earliestClockIn) {
      const minsUntilAllowed = Math.ceil((earliestClockIn - now) / 60000)
      // Cap the displayed message at 15 minutes to avoid confusing large numbers
      const displayMins = Math.min(minsUntilAllowed, 15)
      return { allowed: true, reason: '', warning: `Can clock in ${displayMins} min(s) before shift starts` }
    }
    
    // Allow clock in if it's within 15 minutes before shift OR after shift start (even if late)
    return { allowed: true, reason: '', warning: '' }
  }

  // Handle clock in for an employee (requires password authentication)
  const handleClockIn = (employeeId) => {
    // Check if employee is authenticated (within 5 minutes)
    if (!isEmployeeAuthenticated(employeeId)) {
      // Show password prompt
      const employee = teamMembers.find(emp => emp.id === employeeId)
      setPasswordPrompt({
        show: true,
        employeeId: employeeId,
        employeeName: employee?.name || 'Employee',
        passwordInput: '',
        error: ''
      })
      return
    }
    
    // Employee is authenticated, proceed with clock in
    const today = getCurrentDateFromSettings()
    const now = getTimestampFromSettings()
    
    setTimesheetEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [today]: {
          ...(prev[employeeId]?.[today] || {}),
          clockIn: now,
          clockOut: null,
          breaks: prev[employeeId]?.[today]?.breaks || []
        }
      }
    }))
  }

  // Handle password submission from modal
  const handlePasswordSubmit = () => {
    if (!passwordPrompt.employeeId) return
    
    const result = authenticateEmployee(passwordPrompt.employeeId, passwordPrompt.passwordInput)
    
    if (result.success) {
      // Close modal and proceed with clock in
      setPasswordPrompt({ show: false, employeeId: null, employeeName: '', passwordInput: '', error: '' })
      // Now clock in
      const today = getCurrentDateFromSettings()
      const now = getTimestampFromSettings()
      
      setTimesheetEntries(prev => ({
        ...prev,
        [passwordPrompt.employeeId]: {
          ...(prev[passwordPrompt.employeeId] || {}),
          [today]: {
            ...(prev[passwordPrompt.employeeId]?.[today] || {}),
            clockIn: now,
            clockOut: null,
            breaks: prev[passwordPrompt.employeeId]?.[today]?.breaks || []
          }
        }
      }))
    } else {
      // Show error
      setPasswordPrompt(prev => ({
        ...prev,
        error: result.error || 'Incorrect password',
        passwordInput: ''
      }))
    }
  }

  // Handle clock out for an employee (no restrictions)
  const handleClockOut = (employeeId) => {
    const today = getCurrentDateFromSettings()
    const now = getTimestampFromSettings()
    
    setTimesheetEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [today]: {
          ...(prev[employeeId]?.[today] || {}),
          clockOut: now
        }
      }
    }))
  }

  // Handle break out for an employee
  const handleBreakOut = (employeeId) => {
    const today = getCurrentDateFromSettings()
    const now = getTimestampFromSettings()
    
    setTimesheetEntries(prev => {
      const currentBreaks = prev[employeeId]?.[today]?.breaks || []
      return {
        ...prev,
        [employeeId]: {
          ...(prev[employeeId] || {}),
          [today]: {
            ...(prev[employeeId]?.[today] || {}),
            breaks: [...currentBreaks, { breakOut: now, breakIn: null }]
          }
        }
      }
    })
  }

  // Handle break in (return from break) for an employee
  const handleBreakIn = (employeeId) => {
    const today = getCurrentDateFromSettings()
    const now = getTimestampFromSettings()
    
    setTimesheetEntries(prev => {
      const currentBreaks = prev[employeeId]?.[today]?.breaks || []
      // Find the last break that doesn't have a breakIn time and update it
      const updatedBreaks = currentBreaks.map((brk, index) => {
        if (index === currentBreaks.length - 1 && !brk.breakIn) {
          return { ...brk, breakIn: now }
        }
        return brk
      })
      return {
        ...prev,
        [employeeId]: {
          ...(prev[employeeId] || {}),
          [today]: {
            ...(prev[employeeId]?.[today] || {}),
            breaks: updatedBreaks
          }
        }
      }
    })
  }

  // Check if employee is currently on break
  const isOnBreak = (employeeId) => {
    const timesheet = getTodayTimesheet(employeeId)
    if (!timesheet?.breaks?.length) return false
    const lastBreak = timesheet.breaks[timesheet.breaks.length - 1]
    return lastBreak.breakOut && !lastBreak.breakIn
  }

  // Calculate total break time in hours
  const calculateBreakTime = (breaks) => {
    if (!breaks?.length) return 0
    let totalMs = 0
    breaks.forEach(brk => {
      if (brk.breakOut && brk.breakIn) {
        totalMs += new Date(brk.breakIn) - new Date(brk.breakOut)
      } else if (brk.breakOut && !brk.breakIn) {
        // Currently on break - calculate time so far
        totalMs += Date.now() - new Date(brk.breakOut)
      }
    })
    return totalMs / (1000 * 60 * 60) // Convert to hours
  }

  // Get today's timesheet entry for an employee
  const getTodayTimesheet = (employeeId) => {
    const today = getCurrentDateFromSettings()
    return timesheetEntries[employeeId]?.[today] || null
  }

  // Format time for display
  const formatTimeDisplay = (isoString) => {
    if (!isoString) return '--:--'
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Calculate actual hours worked (excluding breaks)
  const calculateActualHours = (clockIn, clockOut, breaks) => {
    if (!clockIn) return 0
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date()
    const totalMs = end - start
    const breakMs = breaks?.length ? breaks.reduce((total, brk) => {
      if (brk.breakOut && brk.breakIn) {
        return total + (new Date(brk.breakIn) - new Date(brk.breakOut))
      } else if (brk.breakOut && !brk.breakIn) {
        // Currently on break
        return total + (Date.now() - new Date(brk.breakOut))
      }
      return total
    }, 0) : 0
    const workedMs = totalMs - breakMs
    return Math.max(0, workedMs / (1000 * 60 * 60)) // Convert to hours
  }

  // Load timesheet data for editing
  const loadTimesheetForEdit = (employeeId, date) => {
    const entry = timesheetEntries[employeeId]?.[date]
    if (entry) {
      // Convert ISO timestamps to time input format (HH:MM)
      const formatToTimeInput = (isoString) => {
        if (!isoString) return ''
        const d = new Date(isoString)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
      setTimesheetEditData({
        clockIn: formatToTimeInput(entry.clockIn),
        clockOut: formatToTimeInput(entry.clockOut),
        breaks: (entry.breaks || []).map(brk => ({
          breakOut: formatToTimeInput(brk.breakOut),
          breakIn: formatToTimeInput(brk.breakIn)
        }))
      })
    } else {
      setTimesheetEditData({
        clockIn: '',
        clockOut: '',
        breaks: []
      })
    }
    setTimesheetEditEmployee(employeeId)
  }

  // Save edited timesheet data
  const saveTimesheetEdit = () => {
    if (!timesheetEditEmployee || !timesheetEditDate) return

    // Convert time input to ISO timestamp for the selected date
    const timeToISO = (timeStr) => {
      if (!timeStr) return null
      const [hours, minutes] = timeStr.split(':').map(Number)
      const d = new Date(timesheetEditDate)
      d.setHours(hours, minutes, 0, 0)
      return d.toISOString()
    }

    const newEntry = {
      clockIn: timeToISO(timesheetEditData.clockIn),
      clockOut: timeToISO(timesheetEditData.clockOut),
      breaks: timesheetEditData.breaks.map(brk => ({
        breakOut: timeToISO(brk.breakOut),
        breakIn: timeToISO(brk.breakIn)
      })).filter(brk => brk.breakOut) // Only include breaks that have at least a break out time
    }

    // Only save if there's at least a clock in time
    if (newEntry.clockIn) {
      setTimesheetEntries(prev => ({
        ...prev,
        [timesheetEditEmployee]: {
          ...(prev[timesheetEditEmployee] || {}),
          [timesheetEditDate]: newEntry
        }
      }))
    } else {
      // If no clock in, remove the entry for that date
      setTimesheetEntries(prev => {
        const employeeEntries = { ...(prev[timesheetEditEmployee] || {}) }
        delete employeeEntries[timesheetEditDate]
        return {
          ...prev,
          [timesheetEditEmployee]: employeeEntries
        }
      })
    }

    // Reset editing state
    setTimesheetEditEmployee(null)
    setTimesheetEditData({ clockIn: '', clockOut: '', breaks: [] })
  }

  // Delete timesheet entry
  const deleteTimesheetEntry = (employeeId, date) => {
    setTimesheetEntries(prev => {
      const employeeEntries = { ...(prev[employeeId] || {}) }
      delete employeeEntries[date]
      return {
        ...prev,
        [employeeId]: employeeEntries
      }
    })
    if (timesheetEditEmployee === employeeId) {
      setTimesheetEditEmployee(null)
      setTimesheetEditData({ clockIn: '', clockOut: '', breaks: [] })
    }
  }

  // Add a break to the editing timesheet
  const addBreakToEdit = () => {
    setTimesheetEditData(prev => ({
      ...prev,
      breaks: [...prev.breaks, { breakOut: '', breakIn: '' }]
    }))
  }

  // Remove a break from the editing timesheet
  const removeBreakFromEdit = (index) => {
    setTimesheetEditData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }))
  }

  // Update a break in the editing timesheet
  const updateBreakInEdit = (index, field, value) => {
    setTimesheetEditData(prev => ({
      ...prev,
      breaks: prev.breaks.map((brk, i) => i === index ? { ...brk, [field]: value } : brk)
    }))
  }

  // Handle file drop for menu import
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setImportFile(file)
        setImportError(null)
      } else {
        setImportError('Please upload an image (PNG, JPG) or PDF file')
      }
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setImportFile(file)
        setImportError(null)
      } else {
        setImportError('Please upload an image (PNG, JPG) or PDF file')
      }
    }
  }

  // Process menu import with AI
  const handleMenuImport = async () => {
    if (!importFile) {
      setImportError('Please select a file first')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportProgress('Uploading file...')

    try {
      const formData = new FormData()
      formData.append('menu', importFile)

      // Upload file to backend
      const uploadResponse = await axios.post(`${API_BASE_URL}/menu/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setImportProgress(`Uploading: ${percentCompleted}%`)
        }
      })

      setImportProgress('Analyzing menu with AI...')

      // Wait for analysis to complete (polling)
      let analysisComplete = false
      let attempts = 0
      const maxAttempts = 60 // 60 seconds timeout

      while (!analysisComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/menu/status/${uploadResponse.data.jobId}`)
          
          if (statusResponse.data.status === 'completed') {
            analysisComplete = true
            const menuData = statusResponse.data.result

            // Process the analyzed menu data
            await processMenuData(menuData)
            
            setImportProgress('Import complete!')
            setTimeout(() => {
              setIsAutoImportModalOpen(false)
              setImportFile(null)
              setImportProgress(null)
              setIsImporting(false)
            }, 1500)
          } else if (statusResponse.data.status === 'failed') {
            throw new Error(statusResponse.data.error || 'Analysis failed')
          } else {
            setImportProgress(`Analyzing... (${attempts}s)`)
          }
        } catch (error) {
          if (error.response?.status === 404) {
            // Job not found yet, continue polling
            continue
          }
          throw error
        }
      }

      if (!analysisComplete) {
        throw new Error('Analysis timed out. Please try again.')
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportError(error.response?.data?.error || error.message || 'Failed to import menu')
      setImportProgress(null)
    } finally {
      setIsImporting(false)
    }
  }

  // Process and create products from analyzed menu data
  const processMenuData = async (menuData) => {
    setImportProgress('Creating menu sections and products...')

    // Create categories/sections if they don't exist
    const existingCategories = new Set(categories)
    const newCategories = []

    if (menuData.sections) {
      for (const section of menuData.sections) {
        if (section.name && !existingCategories.has(section.name) && section.name !== 'All') {
          newCategories.push(section.name)
          existingCategories.add(section.name)
        }
      }
    }

    if (newCategories.length > 0) {
      setCategories(prev => [...prev.filter(c => c !== 'All'), ...newCategories, 'All'])
    }

    // Create products
    const newProducts = []
    let productIdCounter = Date.now()

    if (menuData.sections) {
      for (const section of menuData.sections) {
        if (section.items) {
          for (const item of section.items) {
            const productId = `product-${productIdCounter++}`
            
            const newProduct = {
              id: productId,
              name: item.name || 'Unnamed Item',
              price: parseFloat(item.price) || 0,
              category: section.name || 'All',
              image: null,
              toppings: item.toppings ? item.toppings.map(t => ({
                name: t.name || t,
                price: t.price || 0,
                halfSameAsBase: false,
                preSelected: false,
                hasPortions: true,
                hasHalf: true,
                hasDouble: true
              })) : [],
              ingredients: item.ingredients || []
            }

            newProducts.push(newProduct)
          }
        }
      }
    }

    // Add new products to existing products
    if (newProducts.length > 0) {
      setProducts(prev => [...prev, ...newProducts])
      
      // Save to backend
      try {
        for (const product of newProducts) {
          await axios.post(`${API_BASE_URL}/products`, product)
        }
      } catch (error) {
        console.error('Error saving products to backend:', error)
      }
    }

    setImportProgress(`Successfully imported ${newProducts.length} products from ${menuData.sections?.length || 0} sections`)
  }

  // Helper function to get week dates from a Monday start date
  const getWeekDates = (mondayDate) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const dates = []
    const start = new Date(mondayDate)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push({
        day: days[i],
        date: date.toISOString().split('T')[0],
        displayDate: `${date.getMonth() + 1}/${date.getDate()}`
      })
    }
    return dates
  }

  // Update schedule for a specific employee and date
  const updateSchedule = (employeeId, date, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [date]: value
      }
    }))
  }

  // Get schedule for a specific employee and date
  const getSchedule = (employeeId, date) => {
    return weeklySchedule[employeeId]?.[date] || ''
  }

  // Navigate to previous/next week
  const navigateWeek = (direction) => {
    const current = new Date(scheduleWeekStart)
    current.setDate(current.getDate() + (direction * 7))
    setScheduleWeekStart(current.toISOString().split('T')[0])
  }

  const filteredProducts = products.filter(product => {
    // If there's a search query, show items from all categories that match the name
    if (searchQuery.trim()) {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    }
    // If no search query, filter by category as usual
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    return matchesCategory
  })

  const addToCart = (product, selectedToppings = [], toppingPortions = {}) => {
    // Calculate final toppings with portions and prices
    const toppingsWithPortions = selectedToppings.map(t => {
      const name = typeof t === 'string' ? t : t.name || ''
      const basePrice = typeof t === 'string' ? 0 : t.price || 0
      const halfSameAsBase = typeof t === 'string' ? false : (t.halfSameAsBase || false)
      const hasPortions = typeof t === 'string' ? true : (t.hasPortions !== undefined ? t.hasPortions : true)
      const hasHalf = typeof t === 'string' ? (hasPortions) : (t.hasHalf !== undefined ? t.hasHalf : (hasPortions))
      const hasDouble = typeof t === 'string' ? (hasPortions) : (t.hasDouble !== undefined ? t.hasDouble : (hasPortions))
      const customHalfPrice = typeof t === 'string' ? undefined : t.halfPrice
      const customDoublePrice = typeof t === 'string' ? undefined : t.doublePrice
      let portion = toppingPortions[name] || 'full'
      
      // If portion is half but hasHalf is false, revert to full
      if (portion === 'half' && !hasHalf) {
        portion = 'full'
      }
      // If portion is double but hasDouble is false, revert to full
      if (portion === 'double' && !hasDouble) {
        portion = 'full'
      }
      
      let finalPrice = basePrice
      if (hasPortions) {
        if (portion === 'half' && hasHalf) {
          if (customHalfPrice !== undefined) {
            finalPrice = customHalfPrice
          } else {
            finalPrice = halfSameAsBase ? basePrice : basePrice * 0.5
          }
        } else if (portion === 'double' && hasDouble) {
          if (customDoublePrice !== undefined) {
            finalPrice = customDoublePrice
          } else {
            finalPrice = basePrice * 2
          }
        }
      }
      
      return { name, price: finalPrice, basePrice, portion }
    })
    
    // Create a unique key for this cart item based on product id, toppings, and portions
    const toppingsKey = JSON.stringify(toppingsWithPortions.map(t => ({
      name: t.name,
      price: t.price,
      portion: t.portion
    })).sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name)
      return a.portion.localeCompare(b.portion)
    }))
    
    const cartItemKey = `${product.id}_${toppingsKey}`
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => {
        if (item.id !== product.id) return false
        if (!item.selectedToppings && toppingsWithPortions.length === 0) return true
        if (!item.selectedToppings || item.selectedToppings.length !== toppingsWithPortions.length) return false
        
        const itemKey = JSON.stringify(item.selectedToppings.map(t => ({
          name: typeof t === 'string' ? t : t.name || '',
          price: typeof t === 'string' ? 0 : (t.price || 0),
          portion: t.portion || 'full'
        })).sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name)
          return (a.portion || 'full').localeCompare(b.portion || 'full')
        }))
        
        return itemKey === toppingsKey
      })
      
      if (existingItem) {
        return prevCart.map(item => {
          if (item.cartItemKey === cartItemKey) {
            return { ...item, quantity: item.quantity + 1 }
          }
          return item
        })
      }
      
      // Calculate total price including toppings
      const toppingsTotal = toppingsWithPortions.reduce((sum, topping) => sum + topping.price, 0)
      
      return [...prevCart, { 
        ...product, 
        quantity: 1, 
        selectedToppings: toppingsWithPortions,
        cartItemKey,
        basePrice: product.price,
        totalPrice: product.price + toppingsTotal
      }]
    })
  }

  const removeFromCart = (cartItemKey) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemKey !== cartItemKey))
  }

  const updateQuantity = (cartItemKey, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemKey)
      return
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.cartItemKey === cartItemKey ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method)
  }

  // Initialize Stripe Terminal
  const initializeStripeTerminal = async () => {
    try {
      // Load Stripe Terminal SDK
      const StripeTerminal = await loadStripeTerminal()
      if (!StripeTerminal) {
        throw new Error('Failed to load Stripe Terminal SDK')
      }

      // Initialize Terminal
      const terminal = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const tokenResponse = await axios.post(`${API_BASE_URL}/stripe-terminal/connection-token`)
          return tokenResponse.data.secret
        },
        onUnexpectedReaderDisconnect: () => {
          console.warn('⚠️ Reader disconnected unexpectedly')
          setStripeReader(null)
          setStripePaymentStatus('Reader disconnected. Please reconnect.')
        }
      })

      await terminal.discoverReaders()
      setStripeTerminal(terminal)
      console.log('✅ Stripe Terminal initialized')
      return terminal
    } catch (error) {
      console.error('❌ Error initializing Stripe Terminal:', error)
      throw error
    }
  }

  // Connect to Stripe Reader (S700)
  const connectToStripeReader = async (terminal) => {
    try {
      // Discover available readers
      const discoverResult = await terminal.discoverReaders()
      
      if (discoverResult.error) {
        throw new Error(discoverResult.error.message)
      }

      // For development: use simulated reader registration code
      // For production: use actual reader from discovery or register via Stripe Dashboard
      const readerRegistrationCode = process.env.REACT_APP_STRIPE_READER_CODE || 'simulated-s700'
      
      // Get location ID from environment or use a default
      // NOTE: You must create a Location in Stripe Dashboard first and use its ID here
      const locationId = process.env.REACT_APP_STRIPE_LOCATION_ID
      
      if (!locationId) {
        throw new Error('STRIPE_LOCATION_ID environment variable is required. Please create a Location in Stripe Dashboard and set REACT_APP_STRIPE_LOCATION_ID.')
      }

      // Connect to the reader
      const reader = await terminal.connectReader(readerRegistrationCode, {
        locationId: locationId
      })
      
      if (reader.error) {
        throw new Error(reader.error.message)
      }
      
      setStripeReader(reader)
      console.log('✅ Connected to Stripe Reader:', reader.label || readerRegistrationCode)
      return reader
    } catch (error) {
      console.error('❌ Error connecting to reader:', error)
      throw error
    }
  }

  // Process payment with Stripe Terminal
  const processStripePayment = async (amount) => {
    try {
      setIsProcessingStripePayment(true)
      setStripePaymentStatus('Initializing payment...')

      // Initialize Terminal if not already initialized
      let terminal = stripeTerminal
      if (!terminal) {
        terminal = await initializeStripeTerminal()
      }

      // Connect to reader if not already connected
      let reader = stripeReader
      if (!reader) {
        reader = await connectToStripeReader(terminal)
      }

      setStripePaymentStatus('Creating payment intent...')

      // Create PaymentIntent on backend
      const paymentIntentResponse = await axios.post(`${API_BASE_URL}/stripe-terminal/create-payment-intent`, {
        amount: amount,
        currency: 'usd',
        metadata: {
          customerName: customerName,
          orderType: orderType,
          tableNumber: orderType === 'Dine In' ? tableNumber : null,
          userEmail: currentUser?.email
        }
      })

      const { client_secret, payment_intent_id } = paymentIntentResponse.data

      setStripePaymentStatus('Processing payment on reader...')

      // For server-driven architecture, process payment on reader via backend
      const processResponse = await axios.post(`${API_BASE_URL}/stripe-terminal/process-payment`, {
        payment_intent_id: payment_intent_id,
        reader_id: reader.id
      })

      setStripePaymentStatus('Waiting for card...')

      // For simulated reader, simulate card presentment
      // In production, customer will insert/tap card on physical reader
      if (reader.id === 'simulated-s700') {
        // Simulate card presentment for testing
        await terminal.simulateReaderUpdate({
          presentPaymentMethod: true
        })
      }

      // Wait for payment to process
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check payment intent status
      const statusResponse = await axios.get(`${API_BASE_URL}/stripe-terminal/payment-intent/${payment_intent_id}`)
      const paymentStatus = statusResponse.data.status
      
      if (paymentStatus === 'requires_capture') {
        setStripePaymentStatus('Capturing payment...')
        
        // Capture the payment
        await axios.post(`${API_BASE_URL}/stripe-terminal/capture-payment`, {
          payment_intent_id: payment_intent_id
        })
      } else if (paymentStatus === 'succeeded') {
        setStripePaymentStatus('Payment successful!')
      } else if (paymentStatus === 'requires_payment_method' || paymentStatus === 'canceled') {
        throw new Error('Payment was canceled or failed')
      } else {
        throw new Error(`Unexpected payment status: ${paymentStatus}`)
      }

      setStripePaymentStatus('Payment successful!')
      setLastPaymentIntentId(payment_intent_id)
      return { success: true, payment_intent_id: payment_intent_id }
    } catch (error) {
      console.error('❌ Error processing Stripe payment:', error)
      setStripePaymentStatus(`Payment failed: ${error.message}`)
      
      // Cancel payment intent if it exists
      if (error.response?.data?.payment_intent_id) {
        try {
          await axios.post(`${API_BASE_URL}/stripe-terminal/cancel-payment`, {
            payment_intent_id: error.response.data.payment_intent_id
          })
        } catch (cancelError) {
          console.error('Error canceling payment intent:', cancelError)
        }
      }
      
      throw error
    } finally {
      setIsProcessingStripePayment(false)
    }
  }

  // Helper function to validate name contains first name and last name initial
  const validateCustomerName = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return { valid: false, message: 'Name is required' }
    
    // Split by space to get parts
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0)
    
    if (parts.length < 2) {
      return { valid: false, message: 'Please enter first name and last name (or last name initial, e.g., "Lisa L" or "Lisa Smith")' }
    }
    
    // Check that first part (first name) exists and has at least one character
    const firstName = parts[0]
    if (!firstName || firstName.length === 0) {
      return { valid: false, message: 'First name is required' }
    }
    
    // Check that last part (last name or initial) exists
    // Accept either single character (initial) or multiple characters (full last name)
    const lastPart = parts[parts.length - 1].replace('.', '') // Remove period if present
    if (!lastPart || lastPart.length === 0) {
      return { valid: false, message: 'Last name or last name initial is required' }
    }
    
    // Minimum requirement: at least one character for last name initial
    // But also allow full last names (multiple characters)
    // No need to restrict length - accept both initial and full last name
    
    return { valid: true }
  }

  const handleCompletePayment = async () => {
    // Validate customer name contains first name and last name initial
    const nameValidation = validateCustomerName(customerName)
    if (!nameValidation.valid) {
      alert(nameValidation.message)
      return
    }
    
    if (!selectedPaymentMethod) {
      alert('Payment method is required')
      return
    }
    
    // Validate cart is not empty
    if (!cart || cart.length === 0) {
      alert('Cart is empty. Please add items before completing payment.')
      return
    }

    // If payment method is Card, process with Stripe Terminal
    let stripePaymentIntentId = null
    if (selectedPaymentMethod === 'Card') {
      try {
        setStripePaymentStatus('Processing card payment...')
        const stripeResult = await processStripePayment(total)
        
        if (!stripeResult.success || !stripeResult.payment_intent_id) {
          alert('Payment failed. Please try again.')
          return
        }
        
        stripePaymentIntentId = stripeResult.payment_intent_id
      } catch (error) {
        alert(`Payment failed: ${error.message || 'Unknown error'}`)
        return
      }
    }
    
    // Format the name: 
    // - If last part is a single character (initial), format as "FirstName L."
    // - If last part is multiple characters (full last name), keep as "FirstName LastName"
    const trimmed = customerName.trim()
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0)
    const firstName = parts[0]
    const lastPart = parts[parts.length - 1].replace('.', '')
    
    let formattedName
    if (lastPart.length === 1) {
      // Single character - treat as initial, format as "FirstName L."
      formattedName = `${firstName} ${lastPart.toUpperCase()}.`
    } else {
      // Multiple characters - treat as full last name, keep as is
      formattedName = `${firstName} ${lastPart}`
    }
    
    // Create timestamp from settings date and time
    const createTimestampFromSettings = () => {
      if (settings.date && settings.time) {
        // Combine date and time from settings
        const dateTimeString = `${settings.date}T${settings.time}:00`
        return new Date(dateTimeString).toISOString()
      }
      // Fallback to current time if settings not available
      return new Date().toISOString()
    }
    
    // Process payment with customer name, table number (if Dine In), and payment method
    const transactionData = {
      customerName: formattedName,
      tableNumber: orderType === 'Dine In' ? (tableNumber.trim() || null) : null,
      orderType: orderType || 'Takeout',
      paymentMethod: selectedPaymentMethod,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice !== undefined ? item.totalPrice : item.price,
        selectedToppings: item.selectedToppings || []
      })),
      subtotal: parseFloat(subtotal) || 0,
      tax: parseFloat(tax) || 0,
      total: parseFloat(total) || 0,
      timestamp: createTimestampFromSettings(),
      userEmail: currentUser?.email || null, // Include user email for transaction filtering
      stripePaymentIntentId: stripePaymentIntentId || null // Include Stripe payment intent ID if available
    }
    
    // Validate user email is present
    if (!transactionData.userEmail) {
      alert('User session expired. Please sign in again.')
      setCurrentUser(null)
      localStorage.removeItem('pos_current_user')
      return
    }
    
    // Validate transaction data before sending
    if (!transactionData.customerName || transactionData.customerName.trim() === '') {
      alert('Customer name is required')
      return
    }
    
    if (!transactionData.paymentMethod) {
      alert('Payment method is required')
      return
    }
    
    if (!transactionData.items || transactionData.items.length === 0) {
      alert('Cart is empty. Please add items before completing payment.')
      return
    }
    
    // Validate each item has required fields
    for (let i = 0; i < transactionData.items.length; i++) {
      const item = transactionData.items[i]
      if (!item.name) {
        alert(`Item at position ${i + 1} is missing a name`)
        return
      }
      if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
        alert(`Item "${item.name}" has invalid quantity`)
        return
      }
      if (item.price === undefined && item.totalPrice === undefined) {
        alert(`Item "${item.name}" is missing price information`)
        return
      }
    }
    
    console.log('Processing payment:', JSON.stringify(transactionData, null, 2))
    console.log('Cart items:', cart)
    console.log('Calculated values:', { subtotal, tax, total })
    console.log('API URL:', `${API_BASE_URL}/transactions`)
    
    try {
      // Test backend connectivity first
      try {
        const healthCheck = await axios.get(`${API_BASE_URL.replace('/api', '')}/api/health`, { timeout: 5000 })
        console.log('✅ Backend health check passed:', healthCheck.data)
      } catch (healthError) {
        console.warn('⚠️ Backend health check failed, but continuing with transaction save:', healthError.message)
      }
      
      // Save transaction to backend
      const response = await axios.post(`${API_BASE_URL}/transactions`, transactionData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      })
      console.log('✅ Transaction saved:', response.data)
      
      // Update local transactions state immediately for instant UI update
      setTransactions(prev => [response.data, ...prev])
      
      // Reload transactions from backend to ensure consistency
      // This ensures the transaction appears in the Transaction view even if it's already open
      await loadTransactionsFromBackend()
      
      // Clear cart
      setCart([])
      localStorage.removeItem(STORAGE_KEYS.CART)
      
      // Close the modal and reset states
      setIsCustomerNameModalOpen(false)
      setCustomerName('')
      setTableNumber('')
      setSelectedPaymentMethod(null)
      setOrderType(null)
      localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
    } catch (error) {
      // Log error in multiple ways for debugging
      console.group('❌ TRANSACTION SAVE ERROR')
      console.error('Error object:', error)
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
        console.error('Response headers:', error.response.headers)
      }
      
      if (error.request) {
        console.error('Request made but no response received')
        console.error('Request:', error.request)
      }
      
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        data: error.config?.data
      })
      
      try {
        console.error('Full error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      } catch (e) {
        console.error('Could not stringify error:', e)
      }
      
      console.groupEnd()
      
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        response: error.response ? {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers
        } : null,
        request: error.request ? {
          readyState: error.request.readyState,
          status: error.request.status,
          statusText: error.request.statusText
        } : null,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers,
          data: error.config?.data
        }
      })
      
      let errorMessage = 'Failed to save transaction. Please try again.'
      
      // Check for specific error types
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Cannot connect to server. Please check:\n1. Backend server is running\n2. Backend URL is correct\n3. No firewall blocking the connection'
        console.error('❌ Network error - Backend URL:', `${API_BASE_URL}/transactions`)
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused: Backend server is not running. Please start the backend server.'
        console.error('❌ Connection refused - Backend URL:', `${API_BASE_URL}/transactions`)
      } else if (error.code === 'ERR_CERT_AUTHORITY_INVALID' || error.code === 'ERR_CERT_COMMON_NAME_INVALID') {
        errorMessage = 'SSL Certificate error: Please accept the certificate warning in your browser or check SSL configuration.'
        console.error('❌ SSL Certificate error')
      } else if (error.response) {
        // Server responded with error status
        if (error.response.data?.error) {
          errorMessage = `Server error: ${error.response.data.error}`
        } else {
          errorMessage = `Server error (${error.response.status}): ${error.response.statusText || 'Unknown error'}`
        }
        console.error('❌ Server responded with error:', error.response.status, error.response.data)
      } else if (error.request) {
        errorMessage = 'No response from server. The request was made but no response was received.'
        console.error('❌ No response received from server')
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      console.error('❌ Final error message:', errorMessage)
      alert(errorMessage)
    }
  }

  const handleClosePaymentModal = () => {
    setIsCustomerNameModalOpen(false)
    setCustomerName('')
    setTableNumber('')
    setSelectedPaymentMethod(null)
  }

  // Save all data before logout
  const saveAllDataBeforeLogout = async () => {
    try {
      console.log('💾 Saving all data before logout...')
      
      // 1. Save products to localStorage (already done by useEffect, but ensure it's saved)
      const productsToSave = products.map(p => ({
        ...p,
        image: p.image && p.image.startsWith('blob:') ? null : p.image
      }))
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsToSave))
      
      // 2. Sync products to backend (ensure all changes are persisted)
      try {
        const backendProducts = await axios.get(`${API_BASE_URL}/products`)
        const backendProductIds = new Set(backendProducts.data.map(p => p.id))
        
        // Sync each local product to backend
        for (const product of productsToSave) {
          if (product.image && product.image.startsWith('blob:')) {
            // Skip products with blob URLs (they're temporary)
            continue
          }
          
          try {
            if (backendProductIds.has(product.id)) {
              // Product exists in backend, update it
              const formData = new FormData()
              formData.append('name', product.name)
              formData.append('price', product.price.toString())
              formData.append('category', product.category || 'Other')
              formData.append('toppings', JSON.stringify(product.toppings || []))
              formData.append('ingredients', JSON.stringify(product.ingredients || []))
              
              await axios.put(`${API_BASE_URL}/products/${product.id}`, formData)
              console.log(`✅ Synced product "${product.name}" to backend (updated)`)
            } else {
              // Product doesn't exist in backend, create it
              const formData = new FormData()
              formData.append('name', product.name)
              formData.append('price', product.price.toString())
              formData.append('category', product.category || 'Other')
              formData.append('toppings', JSON.stringify(product.toppings || []))
              formData.append('ingredients', JSON.stringify(product.ingredients || []))
              
              await axios.post(`${API_BASE_URL}/products`, formData)
              console.log(`✅ Synced product "${product.name}" to backend (created)`)
            }
          } catch (syncError) {
            console.warn(`⚠️ Failed to sync product "${product.name}" to backend:`, syncError.message)
          }
        }
      } catch (backendError) {
        console.warn('⚠️ Could not sync products to backend:', backendError.message)
        // Continue with logout even if backend sync fails
      }
      
      // 3. Save categories to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
      
      // 4. Save settings to localStorage
      localStorage.setItem('pos_settings', JSON.stringify(settings))
      
      // 4a. Sync settings to backend if user is logged in
      if (currentUser && currentUser.email) {
        try {
          await axios.post(`${API_BASE_URL}/user/settings`, {
            email: currentUser.email,
            settings: settings
          })
          console.log('✅ Synced settings to backend')
        } catch (settingsError) {
          console.warn('⚠️ Could not sync settings to backend:', settingsError.message)
          // Continue with logout even if settings sync fails
        }
      }
      
      // 5. Save team members to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(teamMembers))
      
      // 6. Save timesheet entries to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_timesheet_entries', JSON.stringify(timesheetEntries))
      
      // 7. Save weekly schedule to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_weekly_schedule', JSON.stringify(weeklySchedule))
      
      // 8. Save W-4 files to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_w4_files', JSON.stringify(w4Files))
      
      // 9. Save payroll info to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_payroll_info', JSON.stringify(payrollInfo))
      
      // 10. Save authenticated employees to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_authenticated_employees', JSON.stringify(authenticatedEmployees))
      
      // 11. Save cart to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart))
      
      // 12. Save selected category to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, JSON.stringify(selectedCategory))
      
      // 13. Save active view to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW, JSON.stringify(activeView))
      
      // 14. Save active settings section to localStorage (already done by useEffect, but ensure it's saved)
      localStorage.setItem('pos_active_settings_section', JSON.stringify(activeSettingsSection))
      
      console.log('✅ All data saved successfully before logout')
    } catch (error) {
      console.error('❌ Error saving data before logout:', error)
      // Continue with logout even if save fails
    }
  }

  // Load categories from backend
  const loadCategoriesFromBackend = async () => {
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot load categories: user not logged in')
      setCategories(['All'])
      return false
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`, {
        params: {
          userEmail: currentUser.email
        }
      })
      console.log('✅ Categories loaded:', response.data?.length || 0, 'categories for user:', currentUser.email)
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data)
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(response.data))
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Error loading categories:', error)
      return false
    }
  }

  // Save categories to backend
  const saveCategoriesToBackend = async (categoriesToSave) => {
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot save categories: user not logged in')
      return false
    }
    
    // Check if categories exist and are valid
    if (!categoriesToSave || !Array.isArray(categoriesToSave) || categoriesToSave.length === 0) {
      console.log('⚠️ Cannot save categories: no categories to save or invalid data')
      return false
    }
    
    try {
      await axios.post(`${API_BASE_URL}/categories`, {
        userEmail: currentUser.email,
        categories: categoriesToSave
      })
      console.log('✅ Categories saved for user:', currentUser.email)
      return true
    } catch (error) {
      console.error('❌ Error saving categories:', error)
      return false
    }
  }

  // Load team members from backend
  const loadTeamMembersFromBackend = async () => {
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot load team members: user not logged in')
      setTeamMembers([])
      return false
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/team-members`, {
        params: {
          userEmail: currentUser.email
        }
      })
      console.log('✅ Team members loaded:', response.data?.length || 0, 'members for user:', currentUser.email)
      if (response.data && Array.isArray(response.data)) {
        setTeamMembers(response.data)
        localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(response.data))
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Error loading team members:', error)
      return false
    }
  }

  // Save team members to backend
  const saveTeamMembersToBackend = async (teamMembersToSave) => {
    if (!currentUser || !currentUser.email) {
      console.log('⚠️ Cannot save team members: user not logged in')
      return false
    }
    
    // Check if team members exist and are valid array (allow empty arrays for team members)
    if (!teamMembersToSave || !Array.isArray(teamMembersToSave)) {
      console.log('⚠️ Cannot save team members: invalid data (not an array)')
      return false
    }
    
    try {
      await axios.post(`${API_BASE_URL}/team-members`, {
        userEmail: currentUser.email,
        teamMembers: teamMembersToSave
      })
      console.log('✅ Team members saved for user:', currentUser.email, `(${teamMembersToSave.length} members)`)
      return true
    } catch (error) {
      console.error('❌ Error saving team members:', error)
      return false
    }
  }

  const handleLogout = async () => {
    // Save all data before logout
    await saveAllDataBeforeLogout()
    
    // Clear ALL user-specific data from localStorage
    localStorage.removeItem('pos_current_user')
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS)
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
    localStorage.removeItem(STORAGE_KEYS.TEAM_MEMBERS)
    localStorage.removeItem(STORAGE_KEYS.CART)
    localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY)
    localStorage.removeItem('pos_settings')
    localStorage.removeItem('pos_authenticated_employees')
    
    // Clear all state
    setCurrentUser(null)
    setIsLogoutModalOpen(false)
    setTransactions([])
    setProducts([])
    setCategories(['All'])
    setTeamMembers([])
    setCart([])
    setOrderType(null)
    setSelectedCategory('All')
    // Update settings to clear account email/password
    setSettings(prev => ({
      ...prev,
      accountEmail: '',
      accountPassword: ''
    }))
    
    // Redirect to sign in/sign up page
    setActiveView(null)
    window.history.replaceState(null, '', '/')
    setIsLoginModalOpen(false)
    setIsSignupModalOpen(false)
    setShowSignupOnAuthPage(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    
    if (!loginFormData.email || !loginFormData.password) {
      setAuthError('Please fill in all fields')
      return
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginFormData.email,
        password: loginFormData.password
      })
      
      if (response.data.user) {
        // Clear ALL data from previous user
        setTransactions([])
        setProducts([])
        setCategories(['All'])
        setTeamMembers([])
        setCart([])
        setOrderType(null)
        setSelectedCategory('All')
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS)
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
        localStorage.removeItem(STORAGE_KEYS.TEAM_MEMBERS)
        localStorage.removeItem(STORAGE_KEYS.CART)
        localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
        localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY)
        
        setCurrentUser(response.data.user)
        localStorage.setItem('pos_current_user', JSON.stringify(response.data.user))
        
        // Check if payment is required (handle existing users without subscriptionStatus)
        const userSubscriptionStatus = response.data.user.subscriptionStatus || 'pending'
        if (userSubscriptionStatus === 'pending') {
          setShowPaymentPage(true)
          setIsLoginModalOpen(false)
          setShowSignupOnAuthPage(false)
          setLoginFormData({ email: '', password: '' })
          setShowLoginPassword(false)
          setShowModalLoginPassword(false)
          setAuthError('')
          return
        }
        
        // Load user settings from backend
        try {
          const settingsResponse = await axios.get(`${API_BASE_URL}/user/settings`, {
            params: { email: response.data.user.email }
          })
          
          if (settingsResponse.data) {
            // Merge loaded settings with current settings, preserving any local changes
            setSettings(prev => ({
              ...prev,
              ...settingsResponse.data,
              accountEmail: response.data.user.email
            }))
            // Save to localStorage
            localStorage.setItem('pos_settings', JSON.stringify({
              ...settingsResponse.data,
              accountEmail: response.data.user.email
            }))
          } else {
            // No settings found, just update email
            setSettings(prev => ({
              ...prev,
              accountEmail: response.data.user.email
            }))
          }
        } catch (settingsError) {
          console.error('Error loading user settings:', settingsError)
          // Continue with login even if settings load fails
          setSettings(prev => ({
            ...prev,
            accountEmail: response.data.user.email
          }))
        }
        
        // Load user-specific data from backend
        await Promise.all([
          reloadProductsFromBackend(),
          loadCategoriesFromBackend(),
          loadTeamMembersFromBackend(),
          loadTransactionsFromBackend()
        ])
        
        setIsLoginModalOpen(false)
        setShowSignupOnAuthPage(false)
        setLoginFormData({ email: '', password: '' })
        setShowLoginPassword(false)
        setShowModalLoginPassword(false)
        setAuthError('')
      }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      })
      
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        setAuthError('Cannot connect to server. Please make sure the backend is running.')
      } else if (error.response?.data?.error) {
        setAuthError(error.response.data.error)
      } else if (error.message) {
        setAuthError(`Login failed: ${error.message}`)
      } else {
        setAuthError('Login failed. Please try again.')
      }
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setAuthError('')
    
    if (!signupFormData.email || !signupFormData.password || !signupFormData.confirmPassword) {
      setAuthError('Please fill in all fields')
      return
    }
    
    if (signupFormData.password !== signupFormData.confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    
    if (signupFormData.password.length < 6) {
      setAuthError('Password must be at least 6 characters long')
      return
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        email: signupFormData.email,
        password: signupFormData.password
      })
      
      if (response.data.user) {
        // Clear ALL data from previous user
        setTransactions([])
        setProducts([])
        setCategories(['All'])
        setTeamMembers([])
        setCart([])
        setOrderType(null)
        setSelectedCategory('All')
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS)
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
        localStorage.removeItem(STORAGE_KEYS.TEAM_MEMBERS)
        localStorage.removeItem(STORAGE_KEYS.CART)
        localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
        localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY)
        
        setCurrentUser(response.data.user)
        localStorage.setItem('pos_current_user', JSON.stringify(response.data.user))
        
        // Initialize clean settings for new user
        const now = new Date()
        const initialSettings = {
          ownerName: '',
          managerName: '',
          businessName: '',
          businessAddress: '',
          ownerEmail: '',
          ownerPhone: '',
          managerEmail: '',
          managerPhone: '',
          accountEmail: response.data.user.email,
          accountPassword: '',
          accountEmailLastEdited: null,
          accountPasswordLastEdited: null,
          cardholderName: '',
          cardNumber: '',
          cardExpiry: '',
          cardCVC: '',
          country: '',
          state: '',
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5)
        }
        setSettings(initialSettings)
        
        // Save initial settings to backend
        try {
          await axios.post(`${API_BASE_URL}/user/settings`, {
            email: response.data.user.email,
            settings: initialSettings
          })
        } catch (settingsError) {
          console.error('Error saving initial user settings:', settingsError)
          // Continue with signup even if settings save fails
        }
        
        // Initialize empty data for new user (categories default to ['All'])
        await saveCategoriesToBackend(['All'])
        await Promise.all([
          reloadProductsFromBackend(), // Load products (should be empty for new user)
          loadCategoriesFromBackend(),
          loadTeamMembersFromBackend(),
          loadTransactionsFromBackend()
        ])
        
        setIsSignupModalOpen(false)
        setShowSignupOnAuthPage(false)
        setSignupFormData({ email: '', password: '', confirmPassword: '' })
        setShowSignupPassword(false)
        setShowSignupConfirmPassword(false)
        setShowModalSignupPassword(false)
        setShowModalSignupConfirmPassword(false)
        setAuthError('')
        
        // Show payment page if subscription is pending (default for new users)
        const userSubscriptionStatus = response.data.user.subscriptionStatus || 'pending'
        if (userSubscriptionStatus === 'pending') {
          setShowPaymentPage(true)
        }
      }
    } catch (error) {
      // Log full error details for debugging
      console.group('🔴 Signup Error Details')
      console.error('Error object:', error)
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      console.error('Error response status:', error.response?.status)
      console.error('Error response statusText:', error.response?.statusText)
      console.error('Request URL:', error.config?.url)
      console.error('Request method:', error.config?.method)
      console.error('Full error JSON:', JSON.stringify({
        message: error.message,
        code: error.code,
        response: error.response ? {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText
        } : null,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      }, null, 2))
      console.groupEnd()
      
      // Handle different error types with user-friendly messages
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        setAuthError('Cannot connect to server. Please make sure the backend is running on https://localhost:4001. Start it with: cd Back && npm start')
      } else if (error.code === 'ERR_CERT_AUTHORITY_INVALID' || error.code === 'ERR_CERT_COMMON_NAME_INVALID') {
        setAuthError('SSL certificate error. Please visit https://localhost:4001/api/health in your browser and accept the certificate warning, then try again.')
      } else if (error.response?.data?.error) {
        setAuthError(error.response.data.error)
      } else if (error.response?.status) {
        setAuthError(`Signup failed (Status ${error.response.status}): ${error.response.statusText || error.message || 'Unknown error'}`)
      } else if (error.message) {
        setAuthError(`Signup failed: ${error.message}`)
      } else {
        setAuthError('Signup failed. Please check the browser console for details and ensure the backend server is running.')
      }
    }
  }

  // Initialize Stripe for embedded checkout
  useEffect(() => {
    const initStripe = async () => {
      try {
        const keyResponse = await axios.get(`${API_BASE_URL}/subscription/publishable-key`)
        const publishableKey = keyResponse.data.publishableKey
        
        if (publishableKey && window.Stripe) {
          const stripe = window.Stripe(publishableKey)
          setStripeInstance(stripe)
        }
      } catch (error) {
        console.error('Error loading Stripe publishable key:', error)
      }
    }
    
    if (window.Stripe) {
      initStripe()
    } else {
      // Wait for Stripe to load
      const checkStripe = setInterval(() => {
        if (window.Stripe) {
          clearInterval(checkStripe)
          initStripe()
        }
      }, 100)
      
      return () => clearInterval(checkStripe)
    }
  }, [])

  // Handle embedded checkout completion
  const handleCheckoutComplete = useCallback(async (sessionId) => {
    try {
      // Verify payment session
      const response = await axios.get(`${API_BASE_URL}/subscription/verify-session`, {
        params: { session_id: sessionId }
      })
      
      if (response.data.success) {
        // Update user subscription status
        const updatedUser = {
          ...currentUser,
          subscriptionStatus: 'active'
        }
        setCurrentUser(updatedUser)
        localStorage.setItem('pos_current_user', JSON.stringify(updatedUser))
        
        // Hide payment page and checkout
        setShowPaymentPage(false)
        setShowEmbeddedCheckout(false)
        setIsProcessingPayment(false)
        setCheckoutSessionId(null)
        
        alert('Payment successful! Welcome to your POS system.')
      } else {
        alert('Payment verification failed. Please try again.')
        setIsProcessingPayment(false)
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      alert('Error verifying payment. Please contact support.')
      setIsProcessingPayment(false)
    }
  }, [currentUser, setCurrentUser, setShowPaymentPage, setShowEmbeddedCheckout, setIsProcessingPayment, setCheckoutSessionId])

  // Initialize embedded checkout when clientSecret and ref are ready
  useEffect(() => {
    if (showEmbeddedCheckout && clientSecret && stripeInstance && checkoutRef.current) {
      let checkout = null
      
      const initCheckout = async () => {
        try {
          checkout = stripeInstance.initEmbeddedCheckout({
            clientSecret: clientSecret
          })
          
          await checkout.mount(checkoutRef.current)
          
          // Listen for checkout completion
          checkout.on('complete', () => {
            if (checkoutSessionId) {
              handleCheckoutComplete(checkoutSessionId)
            }
          })
        } catch (error) {
          console.error('Error initializing embedded checkout:', error)
          alert('Error loading payment form. Please try again.')
          setShowEmbeddedCheckout(false)
          setIsProcessingPayment(false)
          setClientSecret(null)
          setCheckoutSessionId(null)
        }
      }
      
      initCheckout()
      
      // Cleanup function
      return () => {
        if (checkout) {
          checkout.unmount().catch(console.error)
        }
      }
    }
  }, [showEmbeddedCheckout, clientSecret, stripeInstance, checkoutSessionId, handleCheckoutComplete])

  // Handle subscription payment - create embedded checkout session
  const handleSubscriptionPayment = async (planId) => {
    if (!currentUser) {
      alert('Please log in first')
      return
    }
    
    setIsProcessingPayment(true)
    setSelectedPlan(planId)
    
    try {
      const response = await axios.post(`${API_BASE_URL}/subscription/create-subscription`, {
        email: currentUser.email,
        planId: planId
      })
      
      if (response.data.clientSecret && response.data.sessionId) {
        setCheckoutSessionId(response.data.sessionId)
        setClientSecret(response.data.clientSecret)
        setShowEmbeddedCheckout(true)
        setIsProcessingPayment(false)
      } else {
        alert('Failed to create subscription')
        setIsProcessingPayment(false)
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to start payment'}`)
      setIsProcessingPayment(false)
    }
  }
  
  // Check for payment success or cancellation in URL (runs on mount and when currentUser changes)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const canceled = urlParams.get('canceled')
    
    // Handle canceled payment
    if (canceled === 'true') {
      setIsProcessingPayment(false)
      setShowPaymentPage(false)
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }
    
    // Get currentUser from state or localStorage
    const user = currentUser || (() => {
      try {
        const stored = localStorage.getItem('pos_current_user')
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    })()
    
    if (sessionId && user) {
      // Verify payment session
      axios.get(`${API_BASE_URL}/subscription/verify-session`, {
        params: { session_id: sessionId }
      })
      .then(response => {
        if (response.data.success) {
          // Update user subscription status
          const updatedUser = {
            ...user,
            subscriptionStatus: 'active'
          }
          setCurrentUser(updatedUser)
          localStorage.setItem('pos_current_user', JSON.stringify(updatedUser))
          
          // Hide payment page
          setShowPaymentPage(false)
          setIsProcessingPayment(false)
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname)
          
          alert('Payment successful! Welcome to your POS system.')
        } else {
          alert('Payment verification failed. Please try again.')
          setIsProcessingPayment(false)
        }
      })
      .catch(error => {
        console.error('Error verifying payment:', error)
        alert('Error verifying payment. Please contact support.')
        setIsProcessingPayment(false)
      })
    }
  }, [currentUser]) // Run when currentUser changes or on mount
  
  // Load user info and settings when component mounts or user changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      // Load user settings from backend
      const loadUserSettings = async () => {
        try {
          const settingsResponse = await axios.get(`${API_BASE_URL}/user/settings`, {
            params: { email: currentUser.email }
          })
          
          if (settingsResponse.data) {
            // Merge loaded settings with current settings
            setSettings(prev => ({
              ...prev,
              ...settingsResponse.data,
              accountEmail: currentUser.email
            }))
            // Save to localStorage
            localStorage.setItem('pos_settings', JSON.stringify({
              ...settingsResponse.data,
              accountEmail: currentUser.email
            }))
          } else {
            // No settings found, just update email
            setSettings(prev => ({
              ...prev,
              accountEmail: currentUser.email
            }))
          }
        } catch (error) {
          console.error('Error loading user settings:', error)
          // Continue even if settings load fails, just update email
          setSettings(prev => ({
            ...prev,
            accountEmail: currentUser.email
          }))
        }
      }
      
      loadUserSettings()
    }
  }, [currentUser])

  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.totalPrice !== undefined ? item.totalPrice : item.price
    return sum + itemPrice * item.quantity
  }, 0)
  const tax = subtotal * 0.085
  const total = subtotal + tax

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const startEditing = (product) => {
    setEditingProductId(product.id)
    setIsAddingProduct(false)
    setEditFormData({
      name: product.name,
      price: product.price.toString(),
      image: null,
      imagePreview: getImageUrl(product.image) || null,
      removeImage: false,
      toppings: (product.toppings || []).map(t => typeof t === 'string' ? { name: t, price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : { ...t, halfSameAsBase: t.halfSameAsBase || false, preSelected: t.preSelected || false, hasPortions: t.hasPortions !== undefined ? t.hasPortions : true, hasHalf: t.hasHalf !== undefined ? t.hasHalf : (t.hasPortions !== undefined ? t.hasPortions : true), hasDouble: t.hasDouble !== undefined ? t.hasDouble : (t.hasPortions !== undefined ? t.hasPortions : true), halfPrice: t.halfPrice, doublePrice: t.doublePrice }),
      ingredients: product.ingredients || []
    })
    setProductSection(product.category || (categories.filter(cat => cat !== 'All')[0] || ''))
    setNewTopping('')
    setNewToppingPrice('')
    setIngredientsText((product.ingredients || []).join('\n'))
    setActiveEditSection('details')
    setIsEditModalOpen(true)
  }

  const startAddingProduct = () => {
    setEditingProductId(null)
    setIsAddingProduct(true)
    setEditFormData({
      name: '',
      price: '',
      image: null,
      imagePreview: null,
      removeImage: false,
      toppings: [],
      ingredients: []
    })
    const availableCategories = categories.filter(cat => cat !== 'All')
    // Automatically set to first available section, or selected section if not "All"
    const defaultSection = selectedCategory === 'All' ? (availableCategories[0] || '') : selectedCategory
    setProductSection(defaultSection)
    setNewTopping('')
    setNewToppingPrice('')
    setIngredientsText('')
    setActiveEditSection('details')
    setIsEditModalOpen(true)
  }

  const cancelEditing = () => {
    // Clean up blob URL if it exists
    if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(editFormData.imagePreview)
    }
    setEditingProductId(null)
    setIsAddingProduct(false)
    setEditFormData({ name: '', price: '', image: null, imagePreview: null, removeImage: false, toppings: [], ingredients: [] })
    setProductSection('')
    setNewTopping('')
    setNewToppingPrice('')
    setIngredientsText('')
    setIsEditModalOpen(false)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Target size for square product images (matches the square aspect-ratio container)
    const TARGET_SIZE = 500

    try {
      // Process the image: create square with centered product and white background
      const processedBlob = await processProductImage(file, TARGET_SIZE)
      
      // Create a new File object from the processed blob
      const processedFile = new File([processedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg'
      })

      setEditFormData(prev => ({
        ...prev,
        image: processedFile,
        imagePreview: URL.createObjectURL(processedBlob),
        removeImage: false
      }))
    } catch (error) {
      console.error('Error processing image:', error)
      // Fallback to original file if processing fails
      setEditFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
        removeImage: false
      }))
    }
  }

  // Process product image: create a square image with the product centered and white background
  const processProductImage = (file, targetSize) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          const { width, height } = img
          
          // Calculate the scale to fit the image within the target size while maintaining aspect ratio
          const scale = Math.min(targetSize / width, targetSize / height, 1) // Don't upscale small images
          
          // Calculate new dimensions
          const newWidth = Math.round(width * scale)
          const newHeight = Math.round(height * scale)
          
          // Create a SQUARE canvas
          const canvas = document.createElement('canvas')
          canvas.width = targetSize
          canvas.height = targetSize
          const ctx = canvas.getContext('2d')

          // Fill entire canvas with white background
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, targetSize, targetSize)

          // Calculate position to center the image in the square
          const x = Math.round((targetSize - newWidth) / 2)
          const y = Math.round((targetSize - newHeight) / 2)

          // Draw the image centered on the white background
          ctx.drawImage(img, x, y, newWidth, newHeight)

          // Convert to JPEG blob (JPEG doesn't support transparency, ensuring white background)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create image blob'))
              }
            },
            'image/jpeg',
            0.92 // Quality setting
          )
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = e.target.result
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = () => {
    // Clean up blob URL if it exists and remove from pending
    if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
      setPendingBlobUrls(prev => {
        const newSet = new Set(prev)
        newSet.delete(editFormData.imagePreview)
        return newSet
      })
      URL.revokeObjectURL(editFormData.imagePreview)
    }
    setEditFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null,
      removeImage: true
    }))
  }

  const formatPriceForDisplay = (price) => {
    if (!price || price === '') {
      return ''
    }
    
    // If it's just a decimal point, show it
    if (price === '.') {
      return '$.'
    }
    
    // If it ends with a decimal point, preserve it
    if (price.endsWith('.')) {
      const numValue = parseFloat(price)
      if (isNaN(numValue)) {
        return '$0.'
      }
      return `$${numValue}.`
    }
    
    const numValue = parseFloat(price)
    if (isNaN(numValue)) {
      return ''
    }
    
    // If it's a whole number, show it without decimals while typing
    // But if it has decimals, show them
    if (price.includes('.')) {
      const parts = price.split('.')
      if (parts[1] === '') {
        return `$${parts[0]}.`
      }
      // Show up to 2 decimal places
      const decimals = parts[1].substring(0, 2)
      return `$${parts[0]}.${decimals}`
    }
    
    return `$${numValue}`
  }

  const handlePriceChange = (e) => {
    const inputValue = e.target.value
    
    // Remove all non-numeric characters except decimal point
    let numericValue = inputValue.replace(/[^0-9.]/g, '')
    
    // Handle empty input
    if (numericValue === '' || numericValue === '.') {
      setEditFormData(prev => ({ ...prev, price: '' }))
      return
    }
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.')
    if (parts.length > 2) {
      return
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return
    }
    
    setEditFormData(prev => ({ ...prev, price: numericValue }))
  }

  const handlePriceFocus = (e) => {
    // Select the numeric part (0.00) when focused, so user can type to replace it
    const input = e.target
    const value = input.value
    // Use setTimeout to ensure the value is set before selection
    setTimeout(() => {
      if (value === '$0.00' || value === '') {
        input.setSelectionRange(1, value.length) // Select from after $ to end
      } else {
        // Select all numeric content (after $)
        const numericStart = value.indexOf('$') + 1
        input.setSelectionRange(numericStart, value.length)
      }
    }, 0)
  }

  const handleSaveProduct = async (productId) => {
    if (isAddingProduct) {
      // Handle adding new product
      if (!editFormData.name || !editFormData.price) {
        alert('Please fill in name and price')
        return
      }

      try {
        // Parse ingredients from textarea
        const ingredientsArray = ingredientsText
          .split(/[,\n]/)
          .map(item => item.trim())
          .filter(item => item.length > 0)

        const formData = new FormData()
        formData.append('name', editFormData.name)
        formData.append('price', editFormData.price)
        formData.append('description', '') // Can be added later
        const availableCategories = categories.filter(cat => cat !== 'All')
        // Automatically assign to first available section, or use selected section if not "All"
        // IMPORTANT: Use productSection if it's set, otherwise use selectedCategory (if not "All"), otherwise first available
        let finalCategory = productSection
        if (!finalCategory || finalCategory === '') {
          if (selectedCategory !== 'All') {
            finalCategory = selectedCategory
          } else if (availableCategories.length > 0) {
            finalCategory = availableCategories[0]
          } else {
            finalCategory = 'Other' // Fallback
          }
        }
        console.log('📝 Creating product with category:', finalCategory, '(productSection:', productSection, ', selectedCategory:', selectedCategory, ', availableCategories:', availableCategories, ')')
        formData.append('category', finalCategory)
        if (editFormData.image) {
          formData.append('image', editFormData.image)
        }
        formData.append('toppings', JSON.stringify(editFormData.toppings || []))
        formData.append('ingredients', JSON.stringify(ingredientsArray))
        formData.append('userEmail', currentUser?.email || '')

        // Try to save to backend
        let savedProduct = null
        try {
          // Don't set Content-Type manually - axios will set it with the correct boundary for FormData
          const response = await axios.post(`${API_BASE_URL}/products`, formData)
          savedProduct = response.data
          console.log('Product created successfully:', savedProduct)
          console.log('Image path from backend:', savedProduct?.image)
          console.log('Image preview (blob):', editFormData.imagePreview)
          
          // Clean up any blob URLs that might have been returned from backend (shouldn't happen, but just in case)
          if (savedProduct.image && savedProduct.image.startsWith('blob:')) {
            console.warn('Backend returned blob URL, which is invalid. Will use our own blob URL if available, or set to null.')
            // If we have our own blob URL from the upload, use that instead
            if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
              savedProduct.image = editFormData.imagePreview
              console.log('Using our own blob URL for immediate display instead of backend blob URL.')
            } else {
              savedProduct.image = null
            }
          }
          
          // If backend returned null/undefined/empty for image but an image was uploaded, use blob URL temporarily
          if ((!savedProduct.image || savedProduct.image === null || savedProduct.image === '') && editFormData.image && editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
            console.warn('Image was uploaded but backend did not return an image path. Using blob URL temporarily for immediate display.')
            savedProduct.image = editFormData.imagePreview
            // Mark this blob URL as pending so it doesn't get cleaned up
            setPendingBlobUrls(prev => new Set(prev).add(editFormData.imagePreview))
            // Note: This blob URL is temporary and will become invalid, but provides immediate visual feedback
          } else if ((!savedProduct.image || savedProduct.image === null || savedProduct.image === '') && editFormData.image) {
            console.warn('Image was uploaded but backend did not return an image path and no preview available. Image will not be saved.')
            savedProduct.image = null
          }
          
          // Log the final image URL that will be used
          if (savedProduct.image) {
            console.log('Final image URL for product:', getImageUrl(savedProduct.image))
          }
        } catch (err) {
          console.error('Error creating product in backend:', err)
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            response: err.response?.data,
            status: err.response?.status,
            config: {
              url: err.config?.url,
              method: err.config?.method
            }
          })
          // Create product locally if backend fails
          const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0
          // If we have an image, use the blob URL temporarily
          const imageToUse = (editFormData.image && editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) 
            ? editFormData.imagePreview 
            : null
          if (imageToUse) {
            setPendingBlobUrls(prev => new Set(prev).add(imageToUse))
            console.warn('Using blob URL temporarily for immediate display. Image will not persist after page reload.')
          }
          // Determine category: use productSection if set, otherwise selectedCategory (if not "All"), otherwise first available
          let finalCategory = productSection
          if (!finalCategory || finalCategory === '') {
            if (selectedCategory !== 'All') {
              finalCategory = selectedCategory
            } else {
              const availableCategories = categories.filter(cat => cat !== 'All')
              finalCategory = availableCategories.length > 0 ? availableCategories[0] : 'Other'
            }
          }
          
          savedProduct = {
            id: maxId + 1,
            name: editFormData.name,
            price: parseFloat(editFormData.price),
            description: '',
            category: finalCategory,
            image: imageToUse,
            toppings: editFormData.toppings || [],
            ingredients: ingredientsArray
          }
          console.log('📝 Created product locally with category:', finalCategory, '(productSection:', productSection, ', selectedCategory:', selectedCategory, ')')
          console.log('Created product locally', imageToUse ? 'with temporary blob URL' : 'without image')
        }

        // Log what category was saved
        console.log('💾 Saved product category:', savedProduct?.category)
        console.log('💾 ProductSection was:', productSection)
        console.log('💾 SelectedCategory was:', selectedCategory)
        
        // Reload products from backend to ensure consistency
        // Add a small delay to ensure backend has processed the save
        await new Promise(resolve => setTimeout(resolve, 100))
        const reloaded = await reloadProductsFromBackend()
        if (!reloaded) {
          // If reload failed, add product to state manually
          console.warn('⚠️ Reload failed, adding product to state manually')
          setProducts([...products, savedProduct])
        } else {
          console.log('✅ Products reloaded successfully after creation')
        }
        
        // Only clean up blob URL if we're not using it in the product state
        // (If backend returned a valid path, we should clean up the blob URL)
        if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:') && 
            savedProduct.image && !savedProduct.image.startsWith('blob:')) {
          setPendingBlobUrls(prev => {
            const newSet = new Set(prev)
            newSet.delete(editFormData.imagePreview)
            return newSet
          })
          URL.revokeObjectURL(editFormData.imagePreview)
        }
        // Note: If we're using the blob URL in savedProduct.image, we keep it for now
        // It will become invalid on page refresh, but provides immediate visual feedback

        cancelEditing()
        setIsEditModalOpen(false)
      } catch (error) {
        console.error('Error creating product:', error)
        alert('Error creating product. Please try again.')
      }
      return
    }

    // Handle editing existing product
    if (!productId) return

    try {
      // Parse ingredients from textarea (split by newlines or commas, trim whitespace, filter empty strings)
      const ingredientsArray = ingredientsText
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(item => item.length > 0)

      const formData = new FormData()
      formData.append('name', editFormData.name)
      formData.append('price', editFormData.price)
      const availableCategories = categories.filter(cat => cat !== 'All')
      // IMPORTANT: Use productSection if it's set, otherwise use selectedCategory (if not "All"), otherwise first available
      let finalCategory = productSection
      if (!finalCategory || finalCategory === '') {
        if (selectedCategory !== 'All') {
          finalCategory = selectedCategory
        } else if (availableCategories.length > 0) {
          finalCategory = availableCategories[0]
        } else {
          finalCategory = 'Other' // Fallback
        }
      }
      // Ensure we always send a valid category
      if (!finalCategory || finalCategory === '') {
        finalCategory = 'Other' // Fallback to Other if somehow empty
      }
      console.log('📝 Updating product with category:', finalCategory, '(productSection:', productSection, ', selectedCategory:', selectedCategory, ', availableCategories:', availableCategories, ')')
      formData.append('category', finalCategory)
      if (editFormData.image) {
        formData.append('image', editFormData.image)
      }
      if (editFormData.removeImage) {
        formData.append('removeImage', 'true')
      }
      formData.append('toppings', JSON.stringify(editFormData.toppings || []))
      formData.append('ingredients', JSON.stringify(ingredientsArray))
      formData.append('userEmail', currentUser?.email || '')

      // Try to save to backend (if available) - RETRY LOGIC for persistence
      let savedProduct = null
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries && !savedProduct) {
        try {
          // Don't set Content-Type manually - axios will set it with the correct boundary for FormData
          // Setting it manually breaks the upload!
          // Log the upload attempt
          console.log('📤 Uploading to backend:', {
            url: `${API_BASE_URL}/products/${productId}`,
            hasImage: !!editFormData.image,
            imageName: editFormData.image?.name,
            imageSize: editFormData.image?.size,
            formDataKeys: Array.from(formData.keys())
          })
          
          const response = await axios.put(`${API_BASE_URL}/products/${productId}`, formData, {
            timeout: 30000, // 30 second timeout for large files
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: function (status) {
              // Accept any status code < 500 to handle errors properly
              return status < 500
            }
          })
          
          // Check if request was successful
          if (response.status >= 200 && response.status < 300) {
            console.log('✅ Upload successful, status:', response.status)
            savedProduct = response.data
            console.log('✅ Product saved successfully:', savedProduct)
            console.log('✅ Image path from backend:', savedProduct?.image)
          } else {
            throw new Error(`Upload failed with status ${response.status}: ${JSON.stringify(response.data)}`)
          }
          
          // If an image was uploaded but backend didn't return an image path, log a warning
          if (editFormData.image && (!savedProduct?.image || savedProduct.image === null)) {
            console.warn('⚠️ Image was uploaded but backend did not return an image path. This may indicate an upload failure.')
            // Retry if we have an image but no path returned
            if (retryCount < maxRetries - 1) {
              retryCount++
              console.log(`🔄 Retrying upload (attempt ${retryCount + 1}/${maxRetries})...`)
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
              continue
            }
          } else {
            // Success - break out of retry loop
            break
          }
        } catch (err) {
          // If product doesn't exist (404), try creating it instead
          if (err.response?.status === 404 && err.response?.data?.error === 'Product not found') {
            console.log('🔄 Product not found in backend, creating new product instead...')
            try {
              const createFormData = new FormData()
              createFormData.append('name', editFormData.name)
              createFormData.append('price', editFormData.price)
              const availableCategories = categories.filter(cat => cat !== 'All')
              // IMPORTANT: Use productSection if it's set, otherwise use selectedCategory (if not "All"), otherwise first available
              let finalCategory = productSection
              if (!finalCategory || finalCategory === '') {
                if (selectedCategory !== 'All') {
                  finalCategory = selectedCategory
                } else if (availableCategories.length > 0) {
                  finalCategory = availableCategories[0]
                } else {
                  finalCategory = 'Other' // Fallback
                }
              }
              console.log('📝 Creating product (404->POST) with category:', finalCategory, '(productSection:', productSection, ', selectedCategory:', selectedCategory, ')')
              createFormData.append('category', finalCategory)
              if (editFormData.image) {
                createFormData.append('image', editFormData.image)
              }
              createFormData.append('toppings', JSON.stringify(editFormData.toppings || []))
              createFormData.append('ingredients', JSON.stringify(ingredientsArray))
              createFormData.append('userEmail', currentUser?.email || '')
              
              const createResponse = await axios.post(`${API_BASE_URL}/products`, createFormData, {
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
              })
              
              savedProduct = createResponse.data
              console.log('✅ Product created successfully:', savedProduct)
              console.log('✅ Image path from backend:', savedProduct?.image)
              break // Success - exit retry loop
            } catch (createErr) {
              console.error('❌ Failed to create product:', createErr)
              // Fall through to retry logic
            }
          }
          
          retryCount++
          console.error(`❌ Error saving to backend (attempt ${retryCount}/${maxRetries}):`, err)
          console.error('Error details:', {
            message: err.message,
            code: err.code,
            response: err.response?.data,
            status: err.response?.status,
            config: {
              url: err.config?.url,
              method: err.config?.method
            }
          })
          
          // If it's an SSL certificate error, provide helpful instructions
          if (err.code === 'ERR_CERT_AUTHORITY_INVALID' || err.code === 'ERR_CERT_COMMON_NAME_INVALID') {
            console.error('🔒 SSL Certificate Error!')
            console.error('   To fix this:')
            console.error('   1. Open https://localhost:4001/api/health in your browser')
            console.error('   2. Click "Advanced" and then "Proceed to localhost (unsafe)"')
            console.error('   3. This will accept the self-signed certificate')
            console.error('   4. Then try uploading the image again')
            // Don't retry SSL errors - they need manual intervention
            break
          }
          
          // Retry for other errors
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in ${retryCount} second(s)...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
          } else {
            // Final attempt failed - log detailed error but don't show alert
            console.error('❌ All retry attempts failed. Image will not persist after page reload.')
            console.error('❌ Final error details:', {
              message: err.message,
              code: err.code,
              response: err.response?.data,
              status: err.response?.status,
              config: {
                url: err.config?.url,
                method: err.config?.method
              }
            })
            // Don't show alert - just log the error
            // The image will display temporarily using blob URL
          }
        }
      }

      // Update product in state
      // If we created a new product (404 -> POST), reload from backend
      if (savedProduct && savedProduct.id !== productId) {
        console.log(`🔄 Product was created (ID: ${savedProduct.id}) instead of updated (ID: ${productId})`)
        // Reload products from backend to ensure consistency
        const reloaded = await reloadProductsFromBackend()
        if (!reloaded) {
          // If reload failed, update state manually
          const updatedProducts = products.filter(p => p.id !== productId)
          updatedProducts.push(savedProduct)
          setProducts(updatedProducts)
          
          // Save to localStorage
          const productsToSave = updatedProducts.map(p => ({
            ...p,
            image: p.image && p.image.startsWith('blob:') ? null : p.image
          }))
          try {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsToSave))
            console.log('💾 Products saved to localStorage')
          } catch (error) {
            console.error('Error saving products to localStorage:', error)
          }
        }
        
        cancelEditing()
        setIsEditModalOpen(false)
        return
      }
      
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          // Determine the image to use:
          // 1. If image was removed, set to null
          // 2. If backend returned a valid image path (non-null, non-blob), use it (highest priority)
          // 3. If a new image was uploaded (has blob URL in imagePreview), use it
          // 4. If imagePreview exists and is not a blob (existing image), use it
          // 5. Otherwise, keep the existing image (but never use old blob URLs - they're temporary)
          let imageToUse = null
          
          if (editFormData.removeImage) {
            // Image was explicitly removed
            imageToUse = null
            if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
              setPendingBlobUrls(prev => {
                const newSet = new Set(prev)
                newSet.delete(editFormData.imagePreview)
                return newSet
              })
              URL.revokeObjectURL(editFormData.imagePreview)
            }
          } else if (savedProduct?.image !== undefined && savedProduct.image !== null && savedProduct.image !== '' && !savedProduct.image.startsWith('blob:')) {
            // Backend returned a valid image path (not a blob, not empty) - ALWAYS use it for persistence
            imageToUse = savedProduct.image
            console.log('✅ Using PERSISTENT image from backend:', imageToUse)
            console.log('✅ Full image URL:', getImageUrl(imageToUse))
            console.log('✅ This image will persist after page refresh!')
            // Clear failed images for this product so it can try loading again
            setFailedImages(prev => {
              const newSet = new Set(prev)
              newSet.delete(productId)
              return newSet
            })
            // Clean up blob URL if it exists and remove from pending
            if (editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
              setPendingBlobUrls(prev => {
                const newSet = new Set(prev)
                newSet.delete(editFormData.imagePreview)
                return newSet
              })
              URL.revokeObjectURL(editFormData.imagePreview)
            }
          } else if (editFormData.image && editFormData.imagePreview && editFormData.imagePreview.startsWith('blob:')) {
            // Image was uploaded (new file) - use blob URL for immediate display
            // This happens when backend failed or hasn't returned a path yet
            imageToUse = editFormData.imagePreview
            console.log('📸 Using blob URL for immediate display:', imageToUse)
            console.log('📸 Backend failed or returned no image path, using temporary blob URL')
            // IMPORTANT: Mark blob URL as pending and clear failedImages BEFORE updating product
            // This ensures the image will render immediately
            setPendingBlobUrls(prev => {
              const newSet = new Set(prev)
              newSet.add(editFormData.imagePreview)
              console.log('📝 Added blob URL to pending:', editFormData.imagePreview, 'Total pending:', newSet.size)
              return newSet
            })
            // Clear from failed images so it can display immediately
            setFailedImages(prev => {
              const newSet = new Set(prev)
              newSet.delete(productId)
              console.log('🧹 Cleared failedImages for product', productId)
              return newSet
            })
          } else if (editFormData.imagePreview && !editFormData.imagePreview.startsWith('blob:')) {
            // Existing image URL (not a blob) - preserve it
            imageToUse = editFormData.imagePreview
            console.log('📸 Using existing image URL:', imageToUse)
          } else {
            // No new image uploaded, keep existing image if it's not a blob URL
            if (p.image && !p.image.startsWith('blob:')) {
              imageToUse = p.image
            } else if (p.image && p.image.startsWith('blob:') && pendingBlobUrls.has(p.image)) {
              // Keep pending blob URLs
              imageToUse = p.image
            } else {
              // Clean up old blob URLs
              if (p.image && p.image.startsWith('blob:')) {
                console.warn('Removing old blob URL from product:', p.image)
                try {
                  URL.revokeObjectURL(p.image)
                } catch (e) {
                  // Ignore errors
                }
              }
              imageToUse = null
            }
          }
          
          // ALWAYS use productSection (user's dropdown selection) - this is the source of truth
          // Don't use savedProduct.category because it might be stale from backend
          let finalCategory = productSection
          if (!finalCategory || finalCategory === '') {
            // If productSection is somehow empty, fallback to existing category
            finalCategory = p.category
          }
          console.log('🎯 Using productSection as category:', finalCategory, '(productSection="' + productSection + '", savedProduct.category="' + (savedProduct?.category || '') + '", original="' + p.category + '")')
          
          const updated = {
            ...p,
            name: editFormData.name,
            price: parseFloat(editFormData.price),
            category: finalCategory,
            image: imageToUse,
            toppings: editFormData.toppings || [],
            ingredients: ingredientsArray
          }
          console.log('🔄 Updated product category:', finalCategory, '(savedProduct.category:', savedProduct?.category, ', productSection:', productSection, ', original category:', p.category, ')')
          console.log('🔄 Updated product:', {
            id: updated.id,
            name: updated.name,
            image: updated.image,
            imageUrl: getImageUrl(updated.image),
            hasImage: !!updated.image
          })
          
          // Clear from failed images if product has an image, so it can try loading again
          // This is already handled above for blob URLs, but ensure it's cleared for all images
          if (imageToUse) {
            setFailedImages(prev => {
              const newSet = new Set(prev)
              newSet.delete(productId)
              return newSet
            })
          }
          
          return updated
        }
        return p
      })
      
      // Reload products from backend to ensure consistency
      const reloaded = await reloadProductsFromBackend()
      if (!reloaded) {
        // If reload failed, update state manually
        setProducts(updatedProducts)
        
        // Save to localStorage for persistence (especially important if backend fails)
        // Only save if we have a valid image path (not a blob URL)
        const productsToSave = updatedProducts.map(p => {
          // Remove blob URLs from localStorage - they're temporary
          if (p.image && p.image.startsWith('blob:')) {
            return { ...p, image: null }
          }
          return p
        })
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsToSave))
          console.log('💾 Products saved to localStorage for persistence')
        } catch (error) {
          console.error('Error saving products to localStorage:', error)
        }
      }

      cancelEditing()
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product. Please try again.')
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      // Try to delete from backend (if available)
      try {
        await axios.delete(`${API_BASE_URL}/products/${productId}`, {
          params: {
            userEmail: currentUser?.email || ''
          }
        })
        // Reload products from backend after successful deletion
        const reloaded = await reloadProductsFromBackend()
        if (!reloaded) {
          // If reload failed, remove product from state manually
          setProducts(products.filter(p => p.id !== productId))
        }
      } catch (err) {
        console.error('Error deleting from backend:', err)
        // If backend deletion fails, still remove from local state
        setProducts(products.filter(p => p.id !== productId))
      }
      
      // If the deleted product was being edited, close the edit modal
      if (editingProductId === productId) {
        cancelEditing()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product. Please try again.')
    }
  }

  const handleAddCategory = async () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const newCategories = [...categories, newCategoryName.trim()]
      setCategories(newCategories)
      setNewCategoryName('')
      // Save to backend
      await saveCategoriesToBackend(newCategories)
    }
  }

  const handleEditCategory = (index) => {
    if (index === 0) return // Can't edit "All"
    setEditingCategoryIndex(index)
    setNewCategoryName(categories[index])
  }

  const handleSaveCategory = async () => {
    if (editingCategoryIndex !== null && newCategoryName.trim()) {
      const updatedCategories = [...categories]
      const oldCategory = updatedCategories[editingCategoryIndex]
      updatedCategories[editingCategoryIndex] = newCategoryName.trim()
      
      // Update products with the old category to use the new category name
      const updatedProducts = products.map(p => 
        p.category === oldCategory ? { ...p, category: newCategoryName.trim() } : p
      )
      setProducts(updatedProducts)
      
      // If the selected category was the one being edited, update it
      if (selectedCategory === oldCategory) {
        setSelectedCategory(newCategoryName.trim())
      }
      
      setCategories(updatedCategories)
      setEditingCategoryIndex(null)
      setNewCategoryName('')
      
      // Save categories and products to backend
      await Promise.all([
        saveCategoriesToBackend(updatedCategories),
        ...updatedProducts.map(p => {
          const formData = new FormData()
          formData.append('name', p.name)
          formData.append('price', p.price.toString())
          formData.append('category', p.category || 'Other')
          formData.append('toppings', JSON.stringify(p.toppings || []))
          formData.append('ingredients', JSON.stringify(p.ingredients || []))
          formData.append('userEmail', currentUser?.email || '')
          return axios.put(`${API_BASE_URL}/products/${p.id}`, formData).catch(err => {
            console.error(`Failed to update product ${p.id}:`, err)
          })
        })
      ])
    }
  }

  const handleDeleteCategory = async (index) => {
    if (index === 0) return // Can't delete "All"
    const categoryToDelete = categories[index]
    const updatedCategories = categories.filter((_, i) => i !== index)
    
    // Update products in deleted category to "All" or first available category
    const updatedProducts = products.map(p => 
      p.category === categoryToDelete ? { ...p, category: 'All' } : p
    )
    setProducts(updatedProducts)
    
    // If the selected category was deleted, switch to "All"
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory('All')
    }
    
    setCategories(updatedCategories)
    
    // Save categories and products to backend
    await Promise.all([
      saveCategoriesToBackend(updatedCategories),
      ...updatedProducts.map(p => {
        const formData = new FormData()
        formData.append('name', p.name)
        formData.append('price', p.price.toString())
        formData.append('category', p.category || 'Other')
        formData.append('toppings', JSON.stringify(p.toppings || []))
        formData.append('ingredients', JSON.stringify(p.ingredients || []))
        formData.append('userEmail', currentUser?.email || '')
        return axios.put(`${API_BASE_URL}/products/${p.id}`, formData).catch(err => {
          console.error(`Failed to update product ${p.id}:`, err)
        })
      })
    ])
  }

  const handleCancelCategoryEdit = () => {
    setEditingCategoryIndex(null)
    setNewCategoryName('')
  }

  // Topping drag and drop handlers
  const handleToppingDragStart = (e, index) => {
    setDraggedToppingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    // Add a slight delay to show dragging state
    setTimeout(() => {
      e.target.closest('.topping-item')?.classList.add('dragging')
    }, 0)
  }

  const handleToppingDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedToppingIndex !== null && draggedToppingIndex !== index) {
      setDragOverToppingIndex(index)
    }
  }

  const handleToppingDragLeave = (e) => {
    // Only reset if leaving the topping item entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverToppingIndex(null)
    }
  }

  const handleToppingDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedToppingIndex === null || draggedToppingIndex === dropIndex) {
      setDraggedToppingIndex(null)
      setDragOverToppingIndex(null)
      return
    }

    const currentToppings = editFormData.toppings || []
    const newToppings = [...currentToppings]
    const [draggedItem] = newToppings.splice(draggedToppingIndex, 1)
    newToppings.splice(dropIndex, 0, draggedItem)

    setEditFormData({
      ...editFormData,
      toppings: newToppings
    })
    setDraggedToppingIndex(null)
    setDragOverToppingIndex(null)
  }

  const handleToppingDragEnd = (e) => {
    e.target.closest('.topping-item')?.classList.remove('dragging')
    setDraggedToppingIndex(null)
    setDragOverToppingIndex(null)
  }

  const handleAutoImportToppings = () => {
    if (!editFormData.toppings || editFormData.toppings.length === 0) {
      alert('No toppings available to import')
      return
    }

    // Extract topping names (preserve original case for display)
    const toppingNames = editFormData.toppings.map(t => {
      const name = typeof t === 'string' ? t : (t.name || '')
      return name.trim()
    }).filter(name => name.length > 0)

    if (toppingNames.length === 0) {
      alert('No valid topping names found')
      return
    }

    // Group toppings by common base words (the noun, usually the last word)
    const groups = {}
    const singleWordToppings = []
    
    toppingNames.forEach(topping => {
      const words = topping.split(/\s+/)
      
      if (words.length > 1) {
        // Multi-word topping: use last word as base (e.g., "white rice" -> base: "rice", variant: "white")
        // Handle "No X" case: "No Rice" -> base: "rice", variant: "No"
        const base = words[words.length - 1].toLowerCase()
        const variant = words.slice(0, -1).join(' ')
        
        if (!groups[base]) {
          groups[base] = []
        }
        groups[base].push({ variant, original: topping })
      } else {
        // Single word topping: collect separately
        singleWordToppings.push(topping)
      }
    })

    // Format the grouped ingredients
    const formattedIngredients = []
    
    // Process grouped multi-word toppings
    Object.entries(groups).forEach(([base, items]) => {
      // Capitalize base word
      const capitalizedBase = base.charAt(0).toUpperCase() + base.slice(1)
      
      // Get variants and capitalize first letter of each
      const variants = items.map(item => {
        const v = item.variant
        return v.charAt(0).toUpperCase() + v.slice(1)
      })
      
      // Sort variants alphabetically, but put "No" at the end if present
      variants.sort((a, b) => {
        if (a.toLowerCase() === 'no') return 1
        if (b.toLowerCase() === 'no') return -1
        return a.localeCompare(b)
      })
      
      // Format as "Base: variant1/variant2" (e.g., "Rice: Brown/White/No")
      formattedIngredients.push(`${capitalizedBase}: ${variants.join('/')}`)
    })

    // For single-word toppings, try to group them if they seem related
    // Common protein toppings are grouped under "Meat:"
    const meatKeywords = ['chicken', 'beef', 'steak', 'carnitas', 'pork', 'barbacoa', 'chorizo', 'fish', 'shrimp', 'tofu', 'sofritas']
    const meats = []
    const otherSingleWords = []
    
    singleWordToppings.forEach(topping => {
      if (meatKeywords.some(meat => topping.toLowerCase().includes(meat))) {
        meats.push(topping.charAt(0).toUpperCase() + topping.slice(1))
      } else {
        otherSingleWords.push(topping)
      }
    })
    
    if (meats.length > 0) {
      meats.sort()
      formattedIngredients.push(`Meat: ${meats.join('/')}`)
    }
    
    // Add remaining single-word toppings as-is
    otherSingleWords.forEach(topping => {
      formattedIngredients.push(topping)
    })

    // Update ingredients text
    const existingIngredients = ingredientsText
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
    
    // Combine existing with new, avoiding duplicates
    const allIngredients = [...new Set([...existingIngredients, ...formattedIngredients])]
    setIngredientsText(allIngredients.join('\n'))
  }

  const handleMouseDown = (e, index) => {
    if (index === 0) return // Can't drag "All"
    if (editingCategoryIndex !== null) return // Can't drag while editing
    
    e.preventDefault() // Prevent text selection
    
    const item = e.currentTarget.closest('.category-item')
    if (!item) return

    const startY = e.clientY
    const startIndex = index
    let currentIndex = index
    let draggedElement = item.cloneNode(true)
    draggedElement.style.position = 'fixed'
    draggedElement.style.pointerEvents = 'none'
    draggedElement.style.opacity = '0.9'
    draggedElement.style.zIndex = '10000'
    draggedElement.style.width = item.offsetWidth + 'px'
    draggedElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    draggedElement.classList.add('dragging')
    
    const rect = item.getBoundingClientRect()
    draggedElement.style.left = rect.left + 'px'
    draggedElement.style.top = rect.top + 'px'
    document.body.appendChild(draggedElement)
    
    item.style.opacity = '0.5'
    setDraggedIndex(index)
    setIsDragging(true)
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY
      draggedElement.style.top = (rect.y + deltaY) + 'px'
      
      const categoryItems = Array.from(document.querySelectorAll('.category-item'))
        .filter(el => !el.classList.contains('dragging') && el.dataset.index !== undefined)
        .map(el => ({
          element: el,
          index: parseInt(el.dataset.index),
          rect: el.getBoundingClientRect()
        }))
        .filter(item => item.index !== 0) // Exclude "All"
        .sort((a, b) => a.index - b.index)
      
      let newIndex = startIndex
      const mouseY = e.clientY
      
      // Find the position where the item should be dropped
      for (let i = 0; i < categoryItems.length; i++) {
        const item = categoryItems[i]
        const itemCenter = item.rect.top + item.rect.height / 2
        
        if (mouseY < itemCenter) {
          // Mouse is above the center of this item
          if (item.index < startIndex) {
            // Moving up: insert before this item
            newIndex = item.index
          } else {
            // Moving down: insert after previous item or before this one
            newIndex = item.index - 1
          }
          break
        } else if (i === categoryItems.length - 1) {
          // Mouse is below all items
          newIndex = item.index + 1
        }
      }
      
      // Clamp newIndex to valid range (1 to categories.length - 1, since 0 is "All")
      newIndex = Math.max(1, Math.min(newIndex, categories.length - 1))
      
      if (newIndex !== currentIndex && newIndex !== startIndex) {
        currentIndex = newIndex
        setDragOverIndex(newIndex)
      } else if (newIndex === startIndex) {
        setDragOverIndex(null)
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      // Restore text selection
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      
      if (currentIndex !== startIndex && currentIndex >= 1) {
        const newCategories = [...categories]
        const draggedCategory = newCategories[startIndex]
        newCategories.splice(startIndex, 1)
        newCategories.splice(currentIndex, 0, draggedCategory)
        setCategories(newCategories)
        // Save to backend
        saveCategoriesToBackend(newCategories)
      }
      
      if (document.body.contains(draggedElement)) {
        document.body.removeChild(draggedElement)
      }
      item.style.opacity = '1'
      setDraggedIndex(null)
      setDragOverIndex(null)
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Format date only (without time)
  const formatDateOnly = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Format time only
  const formatTimeOnly = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Get local date string in YYYY-MM-DD format (for consistent date grouping)
  const getLocalDateString = (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filter transactions based on search query
  const filterTransactions = (transactions, query) => {
    if (!query || query.trim() === '') {
      return transactions
    }

    const searchTerms = query.trim().toLowerCase().split(/\s+/)
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp)
      const transactionDateLower = transactionDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).toLowerCase()
      const transactionDateShort = transactionDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).toLowerCase()
      const transactionDateISO = transactionDate.toISOString().split('T')[0]
      const formattedDate = formatDateOnly(transaction.timestamp).toLowerCase()
      const formattedTime = formatTimeOnly(transaction.timestamp).toLowerCase()
      const time24 = transactionDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).toLowerCase()
      const timeShort = time24.replace(':', '')
      
      // Track matches for each field type
      let nameMatched = false
      let dateMatched = false
      let timeMatched = false
      const itemTermsMatched = []
      
      // Check each search term against all fields
      for (const term of searchTerms) {
        // Check customer name
        if (transaction.customerName?.toLowerCase().includes(term)) {
          nameMatched = true
        }
        
        // Check date - support various formats
        if (formattedDate.includes(term) ||
            transactionDateLower.includes(term) ||
            transactionDateShort.includes(term) ||
            transactionDateISO.includes(term) ||
            (term.match(/^\d{1,2}[\/\-]\d{1,2}/) && transactionDateShort.includes(term.replace(/[\/\-]/g, '/')))) {
          dateMatched = true
        }
        
        // Check time - support various formats
        if (formattedTime.includes(term) ||
            time24.includes(term) ||
            timeShort.includes(term) ||
            (term.match(/^\d{1,2}:?\d{2}/) && (
              time24.includes(term.replace(':', '')) ||
              time24.includes(term)
            ))) {
          timeMatched = true
        }
        
        // Check items - collect all matching item terms
        if (transaction.items?.some(item => item.name?.toLowerCase().includes(term))) {
          itemTermsMatched.push(term)
        }
      }
      
      // Transaction matches if:
      // 1. Name matches, OR
      // 2. Date matches, OR
      // 3. Time matches, OR
      // 4. At least one item term matches (supports multiple items in query)
      // This allows searching for "Lisa 12/07 20:13 Power Bowl veggie bowl" 
      // and finding transactions that match any of these criteria
      return nameMatched || dateMatched || timeMatched || itemTermsMatched.length > 0
    })
  }

  // Get filtered transactions
  const filteredTransactions = filterTransactions(transactions, transactionSearchQuery)

  // Show payment page if user needs to complete subscription
  if (currentUser && showPaymentPage) {
    const plans = [
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 29.99,
        description: 'Perfect for small businesses',
        features: ['Up to 100 products', 'Basic reporting', 'Email support', 'Mobile access']
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        price: 59.99,
        description: 'For growing businesses',
        features: ['Unlimited products', 'Advanced reporting', 'Priority support', 'Team management', 'Custom branding'],
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: 99.99,
        description: 'For large operations',
        features: ['Everything in Pro', 'Dedicated support', 'Custom integrations', 'Advanced analytics', 'API access']
      }
    ]
    
    // Show embedded checkout if a plan was selected
    if (showEmbeddedCheckout && clientSecret) {
      const selectedPlanData = plans.find(p => p.id === selectedPlan)
      
      return (
        <div className="app-container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '600px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '2rem'
            }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111' }}>
                Complete Your Payment
              </h1>
              {selectedPlanData && (
                <p style={{ fontSize: '1rem', color: '#666' }}>
                  {selectedPlanData.name} - ${selectedPlanData.price}/month
                </p>
              )}
            </div>
            
            <div 
              ref={checkoutRef}
              style={{
                minHeight: '500px'
              }}
            />
            
            <button
              onClick={() => {
                setShowEmbeddedCheckout(false)
                setClientSecret(null)
                setCheckoutSessionId(null)
                setSelectedPlan(null)
                setIsProcessingPayment(false)
              }}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="app-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1200px',
          padding: '2rem'
        }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '3rem',
            color: 'white'
          }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Choose Your Plan
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              Complete your subscription to start using the POS system
            </p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {plans.map(plan => (
              <div
                key={plan.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  border: plan.popular ? '3px solid #1e3a5f' : '2px solid #e0e0e0',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)'
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    Most Popular
                  </div>
                )}
                
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  marginBottom: '0.5rem',
                  color: '#111'
                }}>
                  {plan.name}
                </h2>
                
                <p style={{ 
                  color: '#666', 
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem'
                }}>
                  {plan.description}
                </p>
                
                <div style={{ 
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '2px solid #e0e0e0'
                }}>
                  <span style={{ 
                    fontSize: '3rem', 
                    fontWeight: '700', 
                    color: '#1e3a5f'
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{ 
                    fontSize: '1rem', 
                    color: '#666',
                    marginLeft: '0.5rem'
                  }}>
                    /month
                  </span>
                </div>
                
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 2rem 0'
                }}>
                  {plan.features.map((feature, index) => (
                    <li key={index} style={{
                      padding: '0.75rem 0',
                      borderBottom: index < plan.features.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#1e3a5f" 
                        strokeWidth="2"
                        style={{ flexShrink: 0 }}
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span style={{ color: '#333', fontSize: '0.95rem' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleSubscriptionPayment(plan.id)}
                  disabled={isProcessingPayment || showPaymentForm}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: plan.popular ? '#1e3a5f' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: (isProcessingPayment || showPaymentForm) ? 'not-allowed' : 'pointer',
                    opacity: (isProcessingPayment || showPaymentForm) ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isProcessingPayment && !showPaymentForm) {
                      e.target.style.backgroundColor = plan.popular ? '#152a42' : '#218838'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isProcessingPayment && !showPaymentForm) {
                      e.target.style.backgroundColor = plan.popular ? '#1e3a5f' : '#28a745'
                    }
                  }}
                >
                  {isProcessingPayment && selectedPlan === plan.id ? 'Processing...' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
          
          <div style={{
            textAlign: 'center',
            color: 'white',
            opacity: 0.9,
            fontSize: '0.9rem'
          }}>
            <p>All plans include a 14-day free trial. Cancel anytime.</p>
          </div>
          
          {/* Payment Form Modal */}
          {showPaymentForm && clientSecret && (
            <PaymentFormModal
              clientSecret={clientSecret}
              subscriptionId={subscriptionId}
              selectedPlan={selectedPlan}
              plans={plans}
              onSuccess={() => {
                setShowPaymentForm(false)
                setShowPaymentPage(false)
                setClientSecret(null)
                setSubscriptionId(null)
                setSelectedPlan(null)
                // Update user subscription status
                setCurrentUser(prev => ({
                  ...prev,
                  subscriptionStatus: 'active'
                }))
                localStorage.setItem('pos_current_user', JSON.stringify({
                  ...currentUser,
                  subscriptionStatus: 'active'
                }))
                alert('Payment successful! Welcome to your POS system.')
              }}
              onCancel={() => {
                setShowPaymentForm(false)
                setClientSecret(null)
                setSubscriptionId(null)
                setSelectedPlan(null)
                setIsProcessingPayment(false)
              }}
            />
          )}
        </div>
      </div>
    )
  }
  
  // Show sign in/sign up page if user is not logged in
  if (!currentUser) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '450px', 
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.5rem' }}>POS System</h1>
            <p style={{ color: '#666', fontSize: '1rem' }}>Sign in to continue</p>
          </div>
          
          {!showSignupOnAuthPage ? (
            // Sign In Form
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="auth-login-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem', color: '#333' }}>Email</label>
                <input
                  type="email"
                  id="auth-login-email"
                  value={loginFormData.email}
                  onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="auth-login-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem', color: '#333' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    id="auth-login-password"
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem 3rem 0.875rem 1rem',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                    onMouseOut={(e) => e.target.style.color = '#666'}
                  >
                    {showLoginPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {authError && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  color: '#c33',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {authError}
                </div>
              )}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  marginBottom: '1rem'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#152a42'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#1e3a5f'}
              >
                Sign In
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupOnAuthPage(true)
                    setAuthError('')
                    setLoginFormData({ email: '', password: '' })
                    setShowLoginPassword(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    textDecoration: 'underline'
                  }}
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          ) : (
            // Sign Up Form
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="auth-signup-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem', color: '#333' }}>Email</label>
                <input
                  type="email"
                  id="auth-signup-email"
                  value={signupFormData.email}
                  onChange={(e) => setSignupFormData({ ...signupFormData, email: e.target.value })}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="auth-signup-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem', color: '#333' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    id="auth-signup-password"
                    value={signupFormData.password}
                    onChange={(e) => setSignupFormData({ ...signupFormData, password: e.target.value })}
                    placeholder="Enter your password (min 6 characters)"
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '0.875rem 3rem 0.875rem 1rem',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                    onMouseOut={(e) => e.target.style.color = '#666'}
                  >
                    {showSignupPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="auth-signup-confirm-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem', color: '#333' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSignupConfirmPassword ? "text" : "password"}
                    id="auth-signup-confirm-password"
                    value={signupFormData.confirmPassword}
                    onChange={(e) => setSignupFormData({ ...signupFormData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem 3rem 0.875rem 1rem',
                      fontSize: '1rem',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                    onMouseOut={(e) => e.target.style.color = '#666'}
                  >
                    {showSignupConfirmPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {authError && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  color: '#c33',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {authError}
                </div>
              )}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  marginBottom: '1rem'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                Sign Up
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupOnAuthPage(false)
                    setAuthError('')
                    setSignupFormData({ email: '', password: '', confirmPassword: '' })
                    setShowSignupPassword(false)
                    setShowSignupConfirmPassword(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    textDecoration: 'underline'
                  }}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`app-container ${activeView === 'Transaction' ? 'transaction-view' : ''}`}>
      <div className="main-content">
        {activeView === 'Transaction' ? (
          <div className="transactions-view" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Fixed Header and Search Bar */}
              <div style={{ padding: '2rem 2rem 1rem 2rem', flexShrink: 0 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111' }}>
                  Transactions
                </h1>
                
                {/* Search Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        color: '#666',
                        pointerEvents: 'none'
                      }}
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                      type="text"
                      id="transaction-search"
                      name="transaction-search"
                      placeholder="Search by name, date, time, or items (e.g., 'Lisa 12/07 20:13 Power Bowl')"
                      value={transactionSearchQuery}
                      onChange={(e) => setTransactionSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 3rem',
                        fontSize: '1rem',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#111',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#1e3a5f'
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(30, 58, 95, 0.15)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#ddd'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    />
                    {transactionSearchQuery && (
                      <button
                        onClick={() => setTransactionSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#1e3a5f'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  {transactionSearchQuery && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.875rem', 
                      color: '#666' 
                    }}>
                      Showing {filteredTransactions.length} of {transactions.length} transactions
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Transaction List */}
              <div className="transactions-scrollable" style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden',
                padding: '0 2rem 2rem 2rem',
                minHeight: 0,
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none' /* IE and Edge */
              }}>
                {transactions.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '4rem 2rem',
                    color: '#666'
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    <p style={{ fontSize: '1.1rem' }}>No transactions yet</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Completed payments will appear here</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '4rem 2rem',
                    color: '#666'
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <p style={{ fontSize: '1.1rem' }}>No transactions match your search</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try different search terms</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      // Group transactions by day (using local date, not UTC)
                      const groupedByDay = {}
                      filteredTransactions.forEach(transaction => {
                        const date = new Date(transaction.timestamp)
                        const dayKey = getLocalDateString(date) // YYYY-MM-DD format in local timezone
                        if (!groupedByDay[dayKey]) {
                          groupedByDay[dayKey] = []
                        }
                        groupedByDay[dayKey].push(transaction)
                      })
                      
                      // Sort days in descending order (newest first)
                      const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a))
                      
                      // Get today's and yesterday's local date strings
                      const todayLocal = getLocalDateString(new Date())
                      const yesterdayDate = new Date()
                      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
                      const yesterdayLocal = getLocalDateString(yesterdayDate)
                      
                      return sortedDays.map((dayKey, dayIndex) => {
                        const dayTransactions = groupedByDay[dayKey]
                        const dayDate = new Date(dayKey + 'T00:00:00')
                        const isToday = dayKey === todayLocal
                        const isYesterday = dayKey === yesterdayLocal
                        
                        let dayLabel = formatDateOnly(dayDate.toISOString())
                        if (isToday) {
                          dayLabel = 'Today'
                        } else if (isYesterday) {
                          dayLabel = 'Yesterday'
                        }
                        
                        return (
                          <div key={dayKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Day Header */}
                            {dayIndex > 0 && (
                              <div style={{ 
                                marginTop: '1rem', 
                                marginBottom: '0.5rem',
                                borderTop: '2px solid #e0e0e0',
                                paddingTop: '1rem'
                              }}></div>
                            )}
                            <div style={{
                              fontSize: '1.2rem',
                              fontWeight: '700',
                              color: '#1e3a5f',
                              marginBottom: '0.5rem',
                              padding: '0.5rem 0',
                              borderBottom: '2px solid #e0e0e0'
                            }}>
                              {dayLabel}
                            </div>
                            
                            {/* Transactions for this day */}
                            {dayTransactions.map(transaction => (
                              <div 
                                key={transaction.id} 
                                onClick={() => setSelectedTransaction(transaction)}
                                style={{
                                  backgroundColor: 'white',
                                  border: '2px solid #ddd',
                                  borderRadius: '8px',
                                  padding: '1rem 1.5rem',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '1rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                                  e.currentTarget.style.borderColor = '#1e3a5f'
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white'
                                  e.currentTarget.style.borderColor = '#ddd'
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111', minWidth: '150px' }}>
                                    {transaction.customerName}
                                  </div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#666', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span>{formatTimeOnly(transaction.timestamp)}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                                  ${transaction.total.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation Footer */}
            <div className="navigation-footer">
              <div className="nav-footer-left">
                <button 
                  className="nav-footer-btn"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === null ? 'active' : ''}`}
                  onClick={() => setActiveView(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Menu</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Transaction' ? 'active' : ''}`}
                  onClick={() => setActiveView('Transaction')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>Transactions</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Timesheets' ? 'active' : ''}`}
                  onClick={() => setActiveView('Timesheets')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>Clock in/out</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Settings' ? 'active' : ''}`}
                  onClick={() => setActiveView('Settings')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Settings</span>
                </button>
              </div>
              <div className="nav-footer-right">
              </div>
            </div>
          </div>
        ) : activeView === 'Timesheets' ? (
          <div className="checks-view" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="timesheet-scroll-container" style={{ maxWidth: '1200px', margin: '0 auto', flex: 1, overflowY: 'auto', width: '100%', padding: '2rem' }}>
              {teamMembers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '4rem 2rem',
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #e0e0e0'
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No employees added yet</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add team members in Settings → Team members</p>
                </div>
              ) : (
                <div className="timesheet-grid">
                  {teamMembers.map((employee) => {
                    const todaySchedule = getTodaySchedule(employee.id)
                    const expectedHours = calculateExpectedHours(todaySchedule)
                    const timesheet = getTodayTimesheet(employee.id)
                    const employeeOnBreak = isOnBreak(employee.id)
                    const isClockedIn = timesheet?.clockIn && !timesheet?.clockOut && !employeeOnBreak
                    const isClockedOut = timesheet?.clockIn && timesheet?.clockOut
                    const clockInCheck = canClockIn(employee.id)
                    const actualHours = timesheet ? calculateActualHours(timesheet.clockIn, timesheet.clockOut, timesheet.breaks) : 0
                    const breakTime = calculateBreakTime(timesheet?.breaks)

                    return (
                      <div 
                        key={employee.id} 
                        className="timesheet-card"
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Employee Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#1e3a5f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '1.25rem',
                            fontWeight: '600'
                          }}>
                            {employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '600', color: '#111' }}>
                              {employee.name}
                            </h3>
                          </div>
                          {/* Status Badge */}
                          <div style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            backgroundColor: employeeOnBreak ? '#fef3c7' : isClockedIn ? '#dcfce7' : isClockedOut ? '#e0e7ff' : '#f3f4f6',
                            color: employeeOnBreak ? '#92400e' : isClockedIn ? '#166534' : isClockedOut ? '#3730a3' : '#6b7280'
                          }}>
                            {employeeOnBreak ? 'On Break' : isClockedIn ? 'Working' : isClockedOut ? 'Completed' : 'Not Started'}
                          </div>
                        </div>

                        {/* Schedule Info */}
                        <div style={{ 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '8px', 
                          padding: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem' }}>Today's Schedule:</span>
                            <span style={{ fontWeight: '600', color: todaySchedule && todaySchedule.toLowerCase() !== 'off' ? '#111' : '#999' }}>
                              {todaySchedule || 'Not scheduled'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem' }}>Expected Hours:</span>
                            <span style={{ fontWeight: '600', color: expectedHours > 0 ? '#1e3a5f' : '#999' }}>
                              {expectedHours > 0 ? `${expectedHours.toFixed(1)} hrs` : '--'}
                            </span>
                          </div>
                        </div>

                        {/* Time Entries */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ 
                            backgroundColor: timesheet?.clockIn ? '#dcfce7' : '#f3f4f6',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Clock In</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: timesheet?.clockIn ? '#166534' : '#999' }}>
                              {formatTimeDisplay(timesheet?.clockIn)}
                            </div>
                          </div>
                          <div style={{ 
                            backgroundColor: timesheet?.clockOut ? '#e0e7ff' : '#f3f4f6',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Clock Out</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: timesheet?.clockOut ? '#3730a3' : '#999' }}>
                              {formatTimeDisplay(timesheet?.clockOut)}
                            </div>
                          </div>
                        </div>

                        {/* Break Info (if any breaks taken) */}
                        {timesheet?.breaks?.length > 0 && (
                          <div style={{
                            backgroundColor: '#fef3c7',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>
                                Breaks ({timesheet.breaks.length})
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                                Total: {(breakTime * 60).toFixed(0)} min
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#78716c' }}>
                              {timesheet.breaks.map((brk, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                  <span>Break {idx + 1}:</span>
                                  <span>{formatTimeDisplay(brk.breakOut)} - {brk.breakIn ? formatTimeDisplay(brk.breakIn) : 'In progress...'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actual Hours Worked (if applicable) */}
                        {timesheet?.clockIn && (
                          <div style={{
                            backgroundColor: employeeOnBreak ? '#fee2e2' : '#dcfce7',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            textAlign: 'center',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: employeeOnBreak ? '#991b1b' : '#166534', marginBottom: '0.25rem' }}>
                              {isClockedOut ? 'Hours Worked (excl. breaks)' : employeeOnBreak ? 'On Break' : 'Time Working'}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: employeeOnBreak ? '#991b1b' : '#166534' }}>
                              {actualHours.toFixed(2)} hrs
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {!timesheet?.clockIn ? (
                            // Not clocked in yet - always allow clock-in attempt (password required)
                            <button
                              onClick={() => handleClockIn(employee.id)}
                              style={{
                                flex: 1,
                                padding: '0.875rem 1rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#16a34a',
                                color: '#fff',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease'
                              }}
                              title={clockInCheck.warning || 'Click to clock in (password required)'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                              </svg>
                              Clock In
                            </button>
                          ) : employeeOnBreak ? (
                            // Currently on break - show End Break button
                            <button
                              onClick={() => handleBreakIn(employee.id)}
                              style={{
                                flex: 1,
                                padding: '0.875rem 1rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#16a34a',
                                color: '#fff',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14"></path>
                                <path d="M12 5v14"></path>
                              </svg>
                              End Break
                            </button>
                          ) : isClockedIn ? (
                            // Currently clocked in and working - show Break and Clock Out buttons
                            <>
                              <button
                                onClick={() => handleBreakOut(employee.id)}
                                style={{
                                  flex: 1,
                                  padding: '0.875rem 1rem',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: '#f59e0b',
                                  color: '#fff',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Break
                              </button>
                              <button
                                onClick={() => handleClockOut(employee.id)}
                                style={{
                                  flex: 1,
                                  padding: '0.875rem 1rem',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                  <polyline points="16 17 21 12 16 7"></polyline>
                                  <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Clock Out
                              </button>
                            </>
                          ) : (
                            // Already clocked out
                            <div style={{
                              flex: 1,
                              padding: '0.875rem 1rem',
                              borderRadius: '8px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                              fontSize: '0.95rem',
                              fontWeight: '500',
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              Shift Completed
                            </div>
                          )}
                        </div>

                        {/* Clock-in warning message (informational, doesn't block clock-in) */}
                        {!timesheet?.clockIn && clockInCheck.warning && (
                          <p style={{ 
                            fontSize: '0.8rem', 
                            color: '#f59e0b', 
                            marginTop: '0.75rem', 
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}>
                            ⚠️ {clockInCheck.warning}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary Section */}
              {teamMembers.length > 0 && (
                <div style={{ 
                  marginTop: '2rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '1px solid #e0e0e0'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                    Today's Summary
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f' }}>
                        {teamMembers.filter(emp => {
                          const ts = getTodayTimesheet(emp.id)
                          return ts?.clockIn && !ts?.clockOut
                        }).length}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Currently Working</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#16a34a' }}>
                        {teamMembers.filter(emp => {
                          const ts = getTodayTimesheet(emp.id)
                          return ts?.clockIn && ts?.clockOut
                        }).length}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Completed Shifts</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6b7280' }}>
                        {teamMembers.filter(emp => {
                          const schedule = getTodaySchedule(emp.id)
                          return schedule && schedule.toLowerCase() !== 'off' && !getTodayTimesheet(emp.id)?.clockIn
                        }).length}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Scheduled (Not Started)</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                        {teamMembers.reduce((total, emp) => {
                          return total + calculateExpectedHours(getTodaySchedule(emp.id))
                        }, 0).toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Expected Hours</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Note */}
              <div style={{ 
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#92400e'
              }}>
                <strong>Note:</strong> Employees can clock in up to 15 minutes before their scheduled shift starts. Use the Break button to clock out for breaks - break time is automatically deducted from total hours worked.
              </div>
            </div>

            {/* Password Prompt Modal */}
            {passwordPrompt.show && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '1rem'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setPasswordPrompt({ show: false, employeeId: null, employeeName: '', passwordInput: '', error: '' })
                }
              }}
              >
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '2rem',
                  maxWidth: '400px',
                  width: '100%',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
                >
                  <h2 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#111'
                  }}>
                    Enter Password
                  </h2>
                  <p style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '0.95rem',
                    color: '#666'
                  }}>
                    Please enter your password to clock in as <strong>{passwordPrompt.employeeName}</strong>
                  </p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <input
                      type="password"
                      value={passwordPrompt.passwordInput}
                      onChange={(e) => setPasswordPrompt(prev => ({ ...prev, passwordInput: e.target.value, error: '' }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handlePasswordSubmit()
                        }
                      }}
                      placeholder="Enter password"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: passwordPrompt.error ? '2px solid #dc2626' : '2px solid #e0e0e0',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      autoFocus
                    />
                    {passwordPrompt.error && (
                      <p style={{
                        margin: '0.5rem 0 0 0',
                        fontSize: '0.85rem',
                        color: '#dc2626'
                      }}>
                        {passwordPrompt.error}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setPasswordPrompt({ show: false, employeeId: null, employeeName: '', passwordInput: '', error: '' })}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        backgroundColor: '#fff',
                        color: '#666',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#f3f4f6'
                        e.target.style.borderColor = '#d1d5db'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#fff'
                        e.target.style.borderColor = '#e0e0e0'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordSubmit}
                      disabled={!passwordPrompt.passwordInput}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: passwordPrompt.passwordInput ? '#16a34a' : '#d1d5db',
                        color: '#fff',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: passwordPrompt.passwordInput ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (passwordPrompt.passwordInput) {
                          e.target.style.backgroundColor = '#15803d'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (passwordPrompt.passwordInput) {
                          e.target.style.backgroundColor = '#16a34a'
                        }
                      }}
                    >
                      Clock In
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Footer */}
            <div className="navigation-footer" style={{ flexShrink: 0 }}>
              <div className="nav-footer-left">
                <button 
                  className="nav-footer-btn"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === null ? 'active' : ''}`}
                  onClick={() => setActiveView(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Menu</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Transaction' ? 'active' : ''}`}
                  onClick={() => setActiveView('Transaction')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>Transactions</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Timesheets' ? 'active' : ''}`}
                  onClick={() => setActiveView('Timesheets')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>Clock in/out</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Settings' ? 'active' : ''}`}
                  onClick={() => setActiveView('Settings')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Settings</span>
                </button>
              </div>
              <div className="nav-footer-right">
              </div>
            </div>
          </div>
        ) : activeView === 'Settings' ? (
          <div className="settings-view" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>
            {/* Settings Content Wrapper - Sidebar and Main Content */}
            <div className="settings-content-wrapper" style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, position: 'relative', overflow: 'visible' }}>
              {/* Settings Sidebar */}
              <div className="settings-sidebar" style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '2px solid #c0c0c0', backgroundColor: '#ffffff', position: 'relative', zIndex: 1 }}>
                <div className="settings-sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Account' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Account')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>Account</span>
                  </button>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Team members' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Team members')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Team members</span>
                  </button>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Schedule' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Schedule')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>Schedule</span>
                  </button>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Edit time-sheets' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Edit time-sheets')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit time-sheets</span>
                  </button>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Payroll' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Payroll')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                      <path d="M12 15h.01"></path>
                      <path d="M17 15h.01"></path>
                      <path d="M7 15h.01"></path>
                    </svg>
                    <span>Payroll</span>
                  </button>
                  <button
                    className={`settings-sidebar-btn ${activeSettingsSection === 'Compliance' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('Compliance')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"></path>
                      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                      <path d="M12 21c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                      <path d="M12 3c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                    </svg>
                    <span>Compliance</span>
                  </button>
                </div>
              </div>
              
              {/* Settings Main Content */}
              <div className="settings-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative', zIndex: 10, overflow: 'visible' }}>
                {activeSettingsSection === 'Account' && (
                <button
                  className={`settings-edit-all-btn ${isEditingSettings ? 'active' : ''}`}
                  onClick={() => setIsEditingSettings(!isEditingSettings)}
                  type="button"
                  aria-label={isEditingSettings ? 'Cancel editing' : 'Edit settings'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                )}
                <div className="settings-content" style={{ maxWidth: 'none', margin: 0, flex: 1, overflowY: activeSettingsSection === 'Account' ? 'hidden' : 'auto', overflowX: 'visible', width: '100%', padding: activeSettingsSection === 'Team members' ? '2rem 2rem 2rem 220px' : '2rem', minHeight: 0, position: 'relative', zIndex: 50 }}>
                  {activeSettingsSection === 'Account' && (
                  <div className="settings-form" style={{ maxWidth: '1200px', margin: '0', marginLeft: '-100px', padding: '1rem' }}>
                    {/* Payment Method and Owner/Manager Section - Side by Side */}
                    <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '3rem', marginLeft: '200px', width: '100%', alignItems: 'flex-start' }}>
                      {/* Payment Method Section */}
                      <div style={{ flex: '0 0 450px', padding: '2.5rem', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', width: '100%' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', color: '#1e3a5f' }}>Payment Method</h3>
                    </div>
                    <span style={{ fontSize: '1.05rem', color: '#666', display: 'block', marginBottom: '1.75rem', textAlign: 'center' }}>Card on file for subscription</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, width: '100%', alignItems: 'center' }}>
                      {/* Cardholder Name */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <label htmlFor="cardholder-name" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', textAlign: 'center' }}>Cardholder Name</label>
                        <div style={{ width: '280px', position: 'relative' }}>
                          <input
                            type="text"
                            id="cardholder-name"
                            name="cardholder-name"
                            value={settings.cardholderName}
                            onChange={(e) => setSettings({ ...settings, cardholderName: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Name on card"
                            style={{ 
                              width: '100%', 
                              padding: '1rem 3.5rem 1rem 1rem', 
                              fontSize: '1.15rem', 
                              textAlign: 'center', 
                              boxSizing: 'border-box',
                              border: '2px solid #999',
                              borderRadius: '8px',
                              outline: 'none',
                              fontFamily: 'inherit',
                              color: '#111',
                              backgroundColor: '#ffffff',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                            onBlur={(e) => e.target.style.borderColor = '#999'}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            right: '1rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                          }}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Number */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <label htmlFor="card-number" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', textAlign: 'center' }}>Card Number</label>
                        <div style={{ width: '280px', position: 'relative' }}>
                          <input
                            type="text"
                            id="card-number"
                            name="card-number"
                            value={settings.cardNumber}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                              if (value.length > 16) value = value.slice(0, 16);
                              const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                              setSettings({ ...settings, cardNumber: formatted });
                            }}
                            disabled={!isEditingSettings}
                            placeholder="•••• •••• •••• ••••"
                            maxLength={19}
                            style={{ 
                              width: '100%', 
                              padding: '1rem 3.5rem 1rem 1rem', 
                              fontSize: '1.15rem', 
                              textAlign: 'center', 
                              boxSizing: 'border-box',
                              border: '2px solid #999',
                              borderRadius: '8px',
                              outline: 'none',
                              fontFamily: 'inherit',
                              color: '#111',
                              backgroundColor: '#ffffff',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#1e3a5f'}
                            onBlur={(e) => e.target.style.borderColor = '#999'}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            right: '1rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                          }}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.25rem', width: '100%' }}>
                        {/* Expiry Date */}
                        <div className="settings-input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <label htmlFor="card-expiry" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', textAlign: 'center' }}>Expiry Date</label>
                          <div className="settings-input-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="text"
                              id="card-expiry"
                              name="card-expiry"
                              value={settings.cardExpiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length > 4) value = value.slice(0, 4);
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + '/' + value.slice(2);
                                }
                                setSettings({ ...settings, cardExpiry: value });
                              }}
                              disabled={!isEditingSettings}
                              placeholder="MM/YY"
                              className="settings-input"
                              maxLength={5}
                              style={{ width: '100%', padding: '1rem 3.5rem 1rem 1rem', fontSize: '1.15rem', textAlign: 'center', boxSizing: 'border-box' }}
                            />
                            <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                              {isEditingSettings ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                </svg>
                              ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CVC */}
                        <div className="settings-input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <label htmlFor="card-cvc" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', textAlign: 'center' }}>CVC</label>
                          <div className="settings-input-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="text"
                              id="card-cvc"
                              name="card-cvc"
                              value={settings.cardCVC}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length > 4) value = value.slice(0, 4);
                                setSettings({ ...settings, cardCVC: value });
                              }}
                              disabled={!isEditingSettings}
                              placeholder="•••"
                              className="settings-input"
                              maxLength={4}
                              style={{ width: '100%', padding: '1rem 3.5rem 1rem 1rem', fontSize: '1.15rem', textAlign: 'center', boxSizing: 'border-box' }}
                            />
                            <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                              {isEditingSettings ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                </svg>
                              ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card type indicators */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontWeight: '600', color: '#1a1f71' }}>VISA</div>
                      <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontWeight: '600', color: '#eb001b' }}>MC</div>
                      <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontWeight: '600', color: '#006fcf' }}>AMEX</div>
                      <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', fontWeight: '600', color: '#ff6000' }}>DISC</div>
                    </div>
                      </div>
                      </div>

                      {/* Owner, Manager, Location/Time - Right Side */}
                      <div style={{ display: 'flex', gap: '2.5rem', flex: 1, alignItems: 'flex-start', width: '100%', marginLeft: '1180px', marginTop: '-680px' }}>
                    {/* Owner Column */}
                    <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f', fontSize: '1.35rem', fontWeight: '600', borderBottom: '2px solid #1e3a5f', paddingBottom: '0.85rem', whiteSpace: 'nowrap' }}>Owner Information</h4>
                      
                      {/* Owner Name */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="owner-name" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Owner Name</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="owner-name"
                            name="owner-name"
                            value={settings.ownerName}
                            onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter owner name"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Owner Contact Email */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="owner-email" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Owner Email</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="email"
                            id="owner-email"
                            name="owner-email"
                            value={settings.ownerEmail}
                            onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter owner email"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Owner Contact Phone */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="owner-phone" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Owner Phone</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="tel"
                            id="owner-phone"
                            name="owner-phone"
                            value={settings.ownerPhone}
                            onChange={(e) => setSettings({ ...settings, ownerPhone: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter owner phone"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Business Name */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="business-name" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Business Name</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="business-name"
                            name="business-name"
                            value={settings.businessName}
                            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter business name"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Account Email */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="account-email" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Account Email</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="email"
                            id="account-email"
                            name="account-email"
                            value={currentUser?.email || settings.accountEmail}
                            disabled={true}
                            placeholder="Account email"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box', backgroundColor: '#f5f5f5' }}
                            readOnly
                          />
                          <div className="settings-lock-icon" style={{ cursor: 'default' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                        </div>
                        {currentUser && (
                          <small style={{ color: '#28a745', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Logged in as {currentUser.email}
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Manager Column */}
                    <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f', fontSize: '1.35rem', fontWeight: '600', borderBottom: '2px solid #1e3a5f', paddingBottom: '0.85rem', whiteSpace: 'nowrap' }}>Manager Information</h4>
                      
                      {/* Manager Name */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="manager-name" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Manager Name</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="manager-name"
                            name="manager-name"
                            value={settings.managerName}
                            onChange={(e) => setSettings({ ...settings, managerName: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter manager name"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Manager Contact Email */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="manager-email" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Manager Email</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="email"
                            id="manager-email"
                            name="manager-email"
                            value={settings.managerEmail}
                            onChange={(e) => setSettings({ ...settings, managerEmail: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter manager email"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Manager Contact Phone */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="manager-phone" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Manager Phone</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="tel"
                            id="manager-phone"
                            name="manager-phone"
                            value={settings.managerPhone}
                            onChange={(e) => setSettings({ ...settings, managerPhone: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter manager phone"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Business Address */}
                      <div className="settings-input-group" style={{ width: '100%', marginTop: '0', marginBottom: '0' }}>
                        <label htmlFor="business-address" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', marginTop: '0' }}>Business Address</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="business-address"
                            name="business-address"
                            value={settings.businessAddress}
                            onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter business address"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Location & Time Column */}
                    <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f', fontSize: '1.35rem', fontWeight: '600', borderBottom: '2px solid #1e3a5f', paddingBottom: '0.85rem', whiteSpace: 'nowrap' }}>Location & Time</h4>
                    
                      {/* Country */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="country" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Country</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="country"
                            name="country"
                            value={settings.country}
                            onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter country"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* State */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="state" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>State</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="text"
                            id="state"
                            name="state"
                            value={settings.state}
                            onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                            disabled={!isEditingSettings}
                            placeholder="Enter state"
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="settings-input-group" style={{ width: '100%' }}>
                        <label htmlFor="date" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500' }}>Date</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="date"
                            id="date"
                            name="date"
                            value={settings.date}
                            onChange={(e) => {
                              setSettings({ ...settings, date: e.target.value })
                              setLastManualDateTimeEdit(Date.now())
                            }}
                            disabled={!isEditingSettings}
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="settings-input-group" style={{ width: '100%', marginTop: '0', marginBottom: '0' }}>
                        <label htmlFor="time" style={{ fontSize: '1.1rem', marginBottom: '0.6rem', display: 'block', fontWeight: '500', marginTop: '0' }}>Time</label>
                        <div className="settings-input-wrapper" style={{ width: '100%' }}>
                          <input
                            type="time"
                            id="time"
                            name="time"
                            value={settings.time}
                            onChange={(e) => {
                              setSettings({ ...settings, time: e.target.value })
                              setLastManualDateTimeEdit(Date.now())
                            }}
                            disabled={!isEditingSettings}
                            className="settings-input"
                            style={{ width: '100%', padding: '1rem 2.75rem 1rem 1.25rem', fontSize: '1.15rem', boxSizing: 'border-box' }}
                          />
                          <div className={`settings-lock-icon ${isEditingSettings ? 'unlocked' : 'locked'}`}>
                            {isEditingSettings ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                  
                  {activeSettingsSection === 'Team members' && (
                  <div className="settings-form" style={{ marginLeft: '-200px', position: 'relative', zIndex: 100, width: 'calc(100% + 200px)', maxWidth: 'none', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'visible' }}>
                    <div style={{ display: 'flex', gap: '2rem', width: '100%', alignItems: 'flex-start', boxSizing: 'border-box', paddingRight: '0', overflowX: 'hidden', overflowY: 'visible' }}>
                      {/* Employees List */}
                      <div style={{ flex: '1 1 auto', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', width: '100%' }}>
                        {teamMembers.length === 0 ? (
                          <p style={{ color: '#666', fontStyle: 'italic' }}>No employees added yet.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: 'visible', overflowY: 'visible' }}>
                            {teamMembers.map((employee) => (
                            <div
                              key={employee.id}
                              style={{
                                padding: '1.25rem 1.25rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem',
                                overflowX: 'visible',
                                overflowY: 'visible',
                                minWidth: '900px',
                                width: '100%',
                                maxWidth: '100%',
                                boxSizing: 'border-box'
                              }}
                            >
                              {editingEmployeeId === employee.id ? (
                                // Edit Form
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: 'visible', overflowY: 'visible' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', width: '100%', alignItems: 'flex-start', overflowX: 'visible', overflowY: 'visible' }}>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-name-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Name</label>
                                      <input
                                        type="text"
                                        id={`employee-name-edit-${employee.id}`}
                                        name={`employee-name-edit-${employee.id}`}
                                        value={editingEmployee.name}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-dob-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Date of Birth</label>
                                      <input
                                        type="text"
                                        id={`employee-dob-edit-${employee.id}`}
                                        name={`employee-dob-edit-${employee.id}`}
                                        value={editingEmployee.age}
                                        onChange={(e) => {
                                          const formatted = formatDateInput(e.target.value)
                                          setEditingEmployee({ ...editingEmployee, age: formatted })
                                        }}
                                        placeholder="mm/dd/yyyy"
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-contact-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Contact</label>
                                      <input
                                        type="tel"
                                        id={`employee-contact-edit-${employee.id}`}
                                        name={`employee-contact-edit-${employee.id}`}
                                        value={editingEmployee.contact}
                                        onChange={(e) => {
                                          const formatted = formatPhoneInput(e.target.value)
                                          setEditingEmployee({ ...editingEmployee, contact: formatted })
                                        }}
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-email-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Email</label>
                                      <input
                                        type="email"
                                        id={`employee-email-edit-${employee.id}`}
                                        name={`employee-email-edit-${employee.id}`}
                                        value={editingEmployee.email}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-emergency-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Emergency Contact</label>
                                      <input
                                        type="tel"
                                        id={`employee-emergency-edit-${employee.id}`}
                                        name={`employee-emergency-edit-${employee.id}`}
                                        value={editingEmployee.emergencyContact}
                                        onChange={(e) => {
                                          const formatted = formatEmergencyContact(e.target.value)
                                          setEditingEmployee({ ...editingEmployee, emergencyContact: formatted })
                                        }}
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-hourly-pay-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Hourly Pay</label>
                                      <input
                                        type="number"
                                        id={`employee-hourly-pay-edit-${employee.id}`}
                                        name={`employee-hourly-pay-edit-${employee.id}`}
                                        value={editingEmployee.hourlyPay}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, hourlyPay: e.target.value })}
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="settings-input-group" style={{ overflowX: 'visible', overflowY: 'visible' }}>
                                      <label htmlFor={`employee-password-edit-${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', overflowX: 'visible', overflowY: 'visible', maxWidth: '100%' }}>Password</label>
                                      <input
                                        type="password"
                                        id={`employee-password-edit-${employee.id}`}
                                        name={`employee-password-edit-${employee.id}`}
                                        value={editingEmployee.password || ''}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                                        placeholder="Enter password for clock-in access"
                                        className="settings-input"
                                        style={{ width: '100%' }}
                                      />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => {
                                        setEditingEmployeeId(null)
                                        setEditingEmployee({ name: '', age: '', contact: '', email: '', emergencyContact: '', hourlyPay: '', password: '' })
                                      }}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                                      onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (editingEmployee.name && editingEmployee.age && editingEmployee.contact && editingEmployee.email && editingEmployee.emergencyContact && editingEmployee.password) {
                                          setTeamMembers(teamMembers.map(emp => 
                                            emp.id === employee.id 
                                              ? { ...emp, ...editingEmployee }
                                              : emp
                                          ))
                                          setEditingEmployeeId(null)
                                          setEditingEmployee({ name: '', age: '', contact: '', email: '', emergencyContact: '', hourlyPay: '', password: '' })
                                        } else {
                                          alert('Please fill in all fields')
                                        }
                                      }}
                                      style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                                      onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Display View
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', width: '100%', minWidth: 0, overflowX: 'visible', overflowY: 'visible', maxWidth: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem 1.5rem', flex: 1, alignItems: 'flex-start', minWidth: 0, overflowX: 'visible', overflowY: 'visible', width: '100%' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Name:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Contact:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.contact}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Email:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.email || 'N/A'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Date of Birth:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.age ? new Date(employee.age).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Emergency Contact:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.emergencyContact}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>
                                      <strong style={{ color: '#1e3a5f', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '100%', marginBottom: '0.15rem' }}>Hourly Pay:</strong>
                                      <div style={{ color: '#333', fontSize: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', overflowY: 'visible', whiteSpace: 'normal', maxWidth: '100%' }}>{employee.hourlyPay ? `$${employee.hourlyPay}` : 'N/A'}</div>
                                    </div>
                                  </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flexShrink: 0, minWidth: '105px', justifyContent: 'center' }}>
                                    <button
                                      onClick={() => {
                                        setEditingEmployeeId(employee.id)
                                        setEditingEmployee({
                                          name: employee.name,
                                          age: employee.age,
                                          contact: employee.contact,
                                          email: employee.email || '',
                                          emergencyContact: employee.emergencyContact,
                                          hourlyPay: employee.hourlyPay || '',
                                          password: employee.password || ''
                                        })
                                      }}
                                      style={{
                                        padding: '0.6rem 1rem',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '1.05rem',
                                        fontWeight: '600',
                                        transition: 'background-color 0.2s',
                                        width: '100%'
                                      }}
                                      onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                                      onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEmployeeToRemove(employee)
                                        setIsRemoveEmployeeModalOpen(true)
                                      }}
                                      style={{
                                        padding: '0.6rem 1rem',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '1.05rem',
                                        fontWeight: '600',
                                        transition: 'background-color 0.2s',
                                        width: '100%'
                                      }}
                                      onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                      onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        )}
                      </div>
                      
                      {/* Add Employee Form */}
                      <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', width: '450px', flexShrink: 0, marginLeft: '0', marginRight: '0', maxWidth: '450px', boxSizing: 'border-box', position: 'relative', zIndex: 101, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'hidden', overflowY: 'visible', minHeight: '680px' }}>
                      <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem', fontWeight: '600', color: '#333', textAlign: 'center', whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', width: '100%', maxWidth: '100%', minWidth: 0, padding: '0', boxSizing: 'border-box', lineHeight: '1.3', display: 'block' }}>Add New Employee</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center', overflowX: 'hidden', overflowY: 'visible' }}>
                        <div className="settings-input-group" style={{ width: '100%' }}>
                          <label htmlFor="employee-name-new">Name</label>
                          <input
                            type="text"
                            id="employee-name-new"
                            name="employee-name-new"
                            value={newEmployee.name}
                            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                            placeholder="Enter employee name"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-dob-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Date of Birth</label>
                          <input
                            type="text"
                            id="employee-dob-new"
                            name="employee-dob-new"
                            value={newEmployee.age}
                            onChange={(e) => {
                              const formatted = formatDateInput(e.target.value)
                              setNewEmployee({ ...newEmployee, age: formatted })
                            }}
                            placeholder="mm/dd/yyyy"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-email-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Email</label>
                          <input
                            type="email"
                            id="employee-email-new"
                            name="employee-email-new"
                            value={newEmployee.email}
                            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                            placeholder="Enter email address"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-phone-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Phone number</label>
                          <input
                            type="tel"
                            id="employee-phone-new"
                            name="employee-phone-new"
                            value={newEmployee.contact}
                            onChange={(e) => {
                              const formatted = formatPhoneInput(e.target.value)
                              setNewEmployee({ ...newEmployee, contact: formatted })
                            }}
                            placeholder="Enter phone number"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-emergency-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Emergency contact</label>
                          <input
                            type="text"
                            id="employee-emergency-new"
                            name="employee-emergency-new"
                            value={newEmployee.emergencyContact}
                            onChange={(e) => {
                              const formatted = formatEmergencyContact(e.target.value)
                              setNewEmployee({ ...newEmployee, emergencyContact: formatted })
                            }}
                            placeholder="Enter email or phone number"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-hourly-pay-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Hourly Pay</label>
                          <input
                            type="number"
                            id="employee-hourly-pay-new"
                            name="employee-hourly-pay-new"
                            value={newEmployee.hourlyPay}
                            onChange={(e) => setNewEmployee({ ...newEmployee, hourlyPay: e.target.value })}
                            placeholder="Enter hourly pay rate"
                            className="settings-input"
                            style={{ width: '100%' }}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="settings-input-group" style={{ maxWidth: '350px', width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
                          <label htmlFor="employee-password-new" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible', maxWidth: '100%' }}>Password</label>
                          <input
                            type="password"
                            id="employee-password-new"
                            name="employee-password-new"
                            value={newEmployee.password}
                            onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                            placeholder="Enter password for clock-in access"
                            className="settings-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (newEmployee.name && newEmployee.age && newEmployee.contact && newEmployee.email && newEmployee.emergencyContact && newEmployee.hourlyPay && newEmployee.password) {
                            const employee = {
                              id: Date.now(),
                              name: newEmployee.name,
                              age: newEmployee.age,
                              contact: newEmployee.contact,
                              email: newEmployee.email,
                              emergencyContact: newEmployee.emergencyContact,
                              hourlyPay: newEmployee.hourlyPay,
                              password: newEmployee.password
                            }
                            setTeamMembers([...teamMembers, employee])
                            setNewEmployee({ name: '', age: '', contact: '', email: '', emergencyContact: '', hourlyPay: '', password: '' })
                          } else {
                            alert('Please fill in all fields')
                          }
                        }}
                        style={{
                          marginTop: '1rem',
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '600',
                          transition: 'background-color 0.2s',
                          width: '350px',
                          maxWidth: '100%'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#2a4f7a'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#1e3a5f'}
                      >
                        Add Employee
                      </button>
                      </div>
                    </div>
                  </div>
                  )}
                  
                  {activeSettingsSection === 'Schedule' && (
                  <div className="settings-form" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Week Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <button
                        onClick={() => navigateWeek(-1)}
                        style={{
                          padding: '0.85rem 1.5rem',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Previous
                      </button>
                      <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e3a5f' }}>
                        Week of {new Date(scheduleWeekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => navigateWeek(1)}
                        style={{
                          padding: '0.85rem 1.5rem',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}
                      >
                        Next
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date()
                          const dayOfWeek = today.getDay()
                          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                          const monday = new Date(today)
                          monday.setDate(today.getDate() + diff)
                          setScheduleWeekStart(monday.toISOString().split('T')[0])
                        }}
                        style={{
                          padding: '0.85rem 1.5rem',
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}
                      >
                        Today
                      </button>
                    </div>

                    {/* Schedule Table */}
                    {teamMembers.length === 0 ? (
                      <div style={{ 
                        padding: '3rem', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px', 
                        border: '1px solid #e0e0e0',
                        textAlign: 'center'
                      }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <p style={{ fontStyle: 'italic', color: '#666' }}>No team members added yet. Add team members in the "Team members" section to create schedules.</p>
                      </div>
                    ) : (
                      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#1e3a5f' }}>
                              <th style={{ 
                                padding: '1.25rem 1.5rem', 
                                textAlign: 'left', 
                                color: 'white', 
                                fontWeight: '600',
                                fontSize: '1.1rem',
                                borderBottom: '2px solid #ddd',
                                minWidth: '180px',
                                position: 'sticky',
                                left: 0,
                                top: 0,
                                backgroundColor: '#1e3a5f',
                                zIndex: 2
                              }}>
                                Employee
                              </th>
                              {getWeekDates(scheduleWeekStart).map(({ day, displayDate }) => (
                                <th key={day} style={{ 
                                  padding: '1.25rem 1rem', 
                                  textAlign: 'center', 
                                  color: 'white', 
                                  fontWeight: '600',
                                  fontSize: '1.05rem',
                                  borderBottom: '2px solid #ddd',
                                  minWidth: '130px',
                                  position: 'sticky',
                                  top: 0,
                                  backgroundColor: '#1e3a5f',
                                  zIndex: 1
                                }}>
                                  <div>{day}</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '400', opacity: 0.9, marginTop: '0.25rem' }}>{displayDate}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map((employee, index) => (
                              <tr key={employee.id || index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={{ 
                                  padding: '1rem 1.5rem', 
                                  borderBottom: '1px solid #eee',
                                  fontWeight: '600',
                                  fontSize: '1.05rem',
                                  color: '#333',
                                  position: 'sticky',
                                  left: 0,
                                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                  zIndex: 1
                                }}>
                                  {employee.name}
                                </td>
                                {getWeekDates(scheduleWeekStart).map(({ day, date }) => (
                                  <td key={date} style={{ 
                                    padding: '0.75rem', 
                                    borderBottom: '1px solid #eee',
                                    textAlign: 'center'
                                  }}>
                                    <input
                                      type="text"
                                      value={getSchedule(employee.id || index, date)}
                                      onChange={(e) => updateSchedule(employee.id || index, date, e.target.value)}
                                      placeholder="Off"
                                      style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        textAlign: 'center',
                                        backgroundColor: getSchedule(employee.id || index, date) ? '#e8f5e9' : '#fff'
                                      }}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Schedule Legend/Instructions */}
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                      <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
                        <strong>Tip:</strong> Enter shift times (e.g., "6am-3pm") or leave blank for days off. Changes save automatically.
                      </p>
                    </div>
                  </div>
                  )}
                  
                  {activeSettingsSection === 'Edit time-sheets' && (
                  <div className="settings-form" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: '700', color: '#1e3a5f', flexShrink: 0 }}>Edit Time-sheets</h2>
                    <p style={{ marginBottom: '2rem', color: '#666', fontSize: '1.1rem', flexShrink: 0 }}>
                      Manually edit employee clock in/out times and breaks. Use this if an employee forgot to clock in or out.
                    </p>

                    {teamMembers.length === 0 ? (
                      <div style={{ 
                        padding: '4rem', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '12px', 
                        border: '1px solid #e0e0e0',
                        textAlign: 'center'
                      }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ marginBottom: '1.5rem' }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <p style={{ fontStyle: 'italic', color: '#666', fontSize: '1.1rem' }}>No team members added yet. Add team members in the "Team members" section first.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '3rem', flex: 1, minHeight: 0 }}>
                        {/* Left Panel - Date and Employee Selection */}
                        <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          {/* Date Picker */}
                          <div style={{ marginBottom: '2rem', flexShrink: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', color: '#333', fontSize: '1.1rem' }}>Select Date</label>
                            <input
                              type="date"
                              value={timesheetEditDate}
                              onChange={(e) => {
                                setTimesheetEditDate(e.target.value)
                                if (timesheetEditEmployee) {
                                  loadTimesheetForEdit(timesheetEditEmployee, e.target.value)
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                border: '2px solid #ddd',
                                borderRadius: '10px',
                                fontSize: '1.15rem',
                                fontWeight: '500'
                              }}
                            />
                          </div>

                          {/* Employee List */}
                          <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
                            <label style={{ display: 'block', fontWeight: '700', color: '#333', fontSize: '1.1rem' }}>Select Employee</label>
                          </div>
                          <div style={{ 
                            border: '2px solid #e0e0e0', 
                            borderRadius: '10px', 
                            overflow: 'hidden',
                            flex: 1,
                            minHeight: '250px',
                            overflowY: 'auto'
                          }}>
                            {teamMembers.map((employee, index) => {
                              const hasEntry = timesheetEntries[employee.id]?.[timesheetEditDate]
                              const isSelected = timesheetEditEmployee === employee.id
                              return (
                                <div
                                  key={employee.id}
                                  onClick={() => loadTimesheetForEdit(employee.id, timesheetEditDate)}
                                  style={{
                                    padding: '1.25rem 1.5rem',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#e3f2fd' : (index % 2 === 0 ? '#fff' : '#f9f9f9'),
                                    borderBottom: index < teamMembers.length - 1 ? '1px solid #eee' : 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s',
                                    borderLeft: isSelected ? '4px solid #1e3a5f' : '4px solid transparent'
                                  }}
                                >
                                  <span style={{ fontWeight: isSelected ? '700' : '500', color: '#333', fontSize: '1.1rem' }}>{employee.name}</span>
                                  {hasEntry && (
                                    <span style={{
                                      padding: '0.4rem 0.75rem',
                                      backgroundColor: hasEntry.clockOut ? '#c8e6c9' : '#fff3e0',
                                      color: hasEntry.clockOut ? '#2e7d32' : '#e65100',
                                      borderRadius: '6px',
                                      fontSize: '0.9rem',
                                      fontWeight: '700'
                                    }}>
                                      {hasEntry.clockOut ? 'Complete' : 'In Progress'}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Right Panel - Time Entry Editor */}
                        <div style={{ flex: 1, minWidth: '650px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                          {timesheetEditEmployee ? (
                            <div style={{ 
                              backgroundColor: '#f8f9fa', 
                              borderRadius: '16px', 
                              padding: '2.5rem',
                              border: '2px solid #e0e0e0',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              minHeight: 0
                            }}>
                              <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.4rem', fontWeight: '700' }}>
                                  {teamMembers.find(e => e.id === timesheetEditEmployee)?.name} - {new Date(timesheetEditDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </h3>
                              </div>

                              {/* Clock In/Out Times */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', color: '#333', fontSize: '1.1rem' }}>
                                    Clock In Time
                                  </label>
                                  <input
                                    type="time"
                                    value={timesheetEditData.clockIn}
                                    onChange={(e) => setTimesheetEditData(prev => ({ ...prev, clockIn: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      padding: '1rem 1.25rem',
                                      border: '2px solid #ddd',
                                      borderRadius: '10px',
                                      fontSize: '1.25rem',
                                      fontWeight: '500',
                                      backgroundColor: '#fff'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', color: '#333', fontSize: '1.1rem' }}>
                                    Clock Out Time
                                  </label>
                                  <input
                                    type="time"
                                    value={timesheetEditData.clockOut}
                                    onChange={(e) => setTimesheetEditData(prev => ({ ...prev, clockOut: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      padding: '1rem 1.25rem',
                                      border: '2px solid #ddd',
                                      borderRadius: '10px',
                                      fontSize: '1.25rem',
                                      fontWeight: '500',
                                      backgroundColor: '#fff'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Breaks Section */}
                              <div style={{ marginBottom: '2rem', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                  <label style={{ fontWeight: '700', color: '#333', fontSize: '1.1rem' }}>Breaks</label>
                                  <button
                                    onClick={addBreakToEdit}
                                    style={{
                                      padding: '0.75rem 1.25rem',
                                      backgroundColor: '#e8f5e9',
                                      color: '#2e7d32',
                                      border: '2px solid #a5d6a7',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="12" y1="5" x2="12" y2="19"></line>
                                      <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add Break
                                  </button>
                                </div>

                                {timesheetEditData.breaks.length === 0 ? (
                                  <div style={{ 
                                    padding: '1.5rem', 
                                    backgroundColor: '#fff', 
                                    borderRadius: '10px', 
                                    border: '2px dashed #ddd',
                                    textAlign: 'center',
                                    color: '#999',
                                    fontSize: '1.05rem'
                                  }}>
                                    No breaks recorded. Click "Add Break" to add one.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {timesheetEditData.breaks.map((brk, index) => (
                                      <div 
                                        key={index} 
                                        style={{ 
                                          display: 'grid', 
                                          gridTemplateColumns: '1fr 1fr auto', 
                                          gap: '1.5rem', 
                                          alignItems: 'end',
                                          padding: '1.25rem',
                                          backgroundColor: '#fff',
                                          borderRadius: '10px',
                                          border: '2px solid #e0e0e0'
                                        }}
                                      >
                                        <div>
                                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', color: '#666', fontWeight: '600' }}>Break Start</label>
                                          <input
                                            type="time"
                                            value={brk.breakOut}
                                            onChange={(e) => updateBreakInEdit(index, 'breakOut', e.target.value)}
                                            style={{
                                              width: '100%',
                                              padding: '0.85rem 1rem',
                                              border: '2px solid #ddd',
                                              borderRadius: '8px',
                                              fontSize: '1.15rem',
                                              fontWeight: '500'
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', color: '#666', fontWeight: '600' }}>Break End</label>
                                          <input
                                            type="time"
                                            value={brk.breakIn}
                                            onChange={(e) => updateBreakInEdit(index, 'breakIn', e.target.value)}
                                            style={{
                                              width: '100%',
                                              padding: '0.85rem 1rem',
                                              border: '2px solid #ddd',
                                              borderRadius: '8px',
                                              fontSize: '1.15rem',
                                              fontWeight: '500'
                                            }}
                                          />
                                        </div>
                                        <button
                                          onClick={() => removeBreakFromEdit(index)}
                                          style={{
                                            padding: '0.75rem',
                                            backgroundColor: '#ffebee',
                                            color: '#c62828',
                                            border: '2px solid #ef9a9a',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            height: '48px',
                                            width: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Save Button */}
                              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '1.5rem' }}>
                                <button
                                  onClick={() => {
                                    setTimesheetEditEmployee(null)
                                    setTimesheetEditData({ clockIn: '', clockOut: '', breaks: [] })
                                  }}
                                  style={{
                                    padding: '1rem 2rem',
                                    backgroundColor: '#f5f5f5',
                                    color: '#666',
                                    border: '2px solid #ddd',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveTimesheetEdit}
                                  style={{
                                    padding: '1rem 2rem',
                                    backgroundColor: '#1e3a5f',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                  }}
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                  </svg>
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ 
                              flex: 1,
                              minHeight: '300px',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '16px',
                              border: '2px dashed #ddd'
                            }}>
                              <div style={{ textAlign: 'center', color: '#999' }}>
                                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1.5rem' }}>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Select an employee to edit their timesheet</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                  )}
                  
                  {activeSettingsSection === 'Payroll' && (
                  <div className="settings-form" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '600', color: '#1e3a5f' }}>Payroll Management</h2>
                    
                    {teamMembers.length === 0 ? (
                      <div style={{ 
                        padding: '3rem', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px', 
                        border: '1px solid #e0e0e0',
                        textAlign: 'center'
                      }}>
                        <p style={{ fontStyle: 'italic', color: '#666' }}>No team members added yet. Add team members in the "Team members" section to manage payroll.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Payroll Table Header */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 1.5fr', 
                          gap: '1rem',
                          padding: '1rem 1.5rem',
                          backgroundColor: '#1e3a5f',
                          borderRadius: '8px 8px 0 0',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          <div>Employee Name</div>
                          <div>Hourly Wage</div>
                          <div>Total Hours</div>
                          <div>Account Number</div>
                          <div>Routing Number</div>
                        </div>
                        
                        {/* Employee Payroll Rows */}
                        {teamMembers.map((employee, index) => (
                          <div
                            key={employee.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 1.5fr',
                              gap: '1rem',
                              padding: '1rem 1.5rem',
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                              border: '1px solid #e0e0e0',
                              borderTop: index === 0 ? 'none' : '1px solid #e0e0e0',
                              alignItems: 'center'
                            }}
                          >
                            {/* Employee Name */}
                            <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                              {employee.name}
                            </div>
                            
                            {/* Hourly Wage */}
                            <div style={{ color: '#333' }}>
                              {employee.hourlyPay ? `$${parseFloat(employee.hourlyPay).toFixed(2)}/hr` : 'Not set'}
                            </div>
                            
                            {/* Total Hours Worked */}
                            <div style={{ color: '#333' }}>
                              {formatHoursMinutes(calculateTotalMinutesWorked(employee.id))}
                            </div>
                            
                            {/* Account Number Input */}
                            <div>
                              <input
                                type="text"
                                value={payrollInfo[employee.id]?.accountNumber || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '')
                                  setPayrollInfo(prev => ({
                                    ...prev,
                                    [employee.id]: {
                                      ...prev[employee.id],
                                      accountNumber: value
                                    }
                                  }))
                                }}
                                placeholder="Account Number"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </div>
                            
                            {/* Routing Number Input */}
                            <div>
                              <input
                                type="text"
                                value={payrollInfo[employee.id]?.routingNumber || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 9)
                                  setPayrollInfo(prev => ({
                                    ...prev,
                                    [employee.id]: {
                                      ...prev[employee.id],
                                      routingNumber: value
                                    }
                                  }))
                                }}
                                placeholder="Routing Number"
                                maxLength={9}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        
                        {/* Payroll Summary */}
                        <div style={{ 
                          marginTop: '1.5rem', 
                          padding: '1.5rem', 
                          backgroundColor: '#e8f5e9', 
                          borderRadius: '8px',
                          border: '1px solid #c8e6c9'
                        }}>
                          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#2e7d32' }}>Payroll Summary</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Employees</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a5f' }}>{teamMembers.length}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Hours (All Employees)</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a5f' }}>
                                {formatHoursMinutes(teamMembers.reduce((sum, emp) => sum + calculateTotalMinutesWorked(emp.id), 0))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Estimated Total Pay</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#2e7d32' }}>
                                ${teamMembers.reduce((sum, emp) => {
                                  const hours = parseFloat(calculateTotalHoursWorked(emp.id))
                                  const rate = parseFloat(emp.hourlyPay) || 0
                                  return sum + (hours * rate)
                                }, 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Instructions */}
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
                            <strong>Note:</strong> Account and routing numbers are saved automatically. Hours are calculated from clock in/out records. Ensure employees have hourly pay rates set in Team members section.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                  
                  {activeSettingsSection === 'Compliance' && (
                  <div className="settings-form">
                    <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '600', color: '#1e3a5f' }}>Compliance & W-4 Forms</h2>
                    
                    {/* Team Members Section */}
                    <div style={{ marginBottom: '3rem' }}>
                      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600', color: '#333' }}>Team Members Information</h3>
                      {teamMembers.length === 0 ? (
                        <div style={{ 
                          padding: '2rem', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '8px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'center',
                          color: '#666'
                        }}>
                          <p style={{ fontStyle: 'italic' }}>No team members added yet. Add team members in the "Team members" section.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {teamMembers.map((employee) => (
                            <div
                              key={employee.id}
                              style={{
                                padding: '1.5rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                              }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', width: '100%' }}>
                                <div>
                                  <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.5rem' }}>Name:</strong>
                                  <div style={{ color: '#333' }}>{employee.name}</div>
                                </div>
                                <div>
                                  <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.5rem' }}>Date of Birth:</strong>
                                  <div style={{ color: '#333' }}>{employee.age ? new Date(employee.age).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div>
                                  <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.5rem' }}>Contact:</strong>
                                  <div style={{ color: '#333' }}>{employee.contact}</div>
                                </div>
                                <div>
                                  <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.5rem' }}>Email:</strong>
                                  <div style={{ color: '#333' }}>{employee.email || 'N/A'}</div>
                                </div>
                                <div>
                                  <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.5rem' }}>Emergency Contact:</strong>
                                  <div style={{ color: '#333' }}>{employee.emergencyContact}</div>
                                </div>
                              </div>
                              
                              {/* W-4 File Drop Zone for this employee */}
                              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
                                <strong style={{ color: '#1e3a5f', display: 'block', marginBottom: '0.75rem' }}>W-4 Form for {employee.name}:</strong>
                                <div
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const files = Array.from(e.dataTransfer.files)
                                    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
                                    if (pdfFiles.length > 0) {
                                      const file = pdfFiles[0]
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        const fileData = {
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          data: event.target.result,
                                          uploadedAt: new Date().toISOString()
                                        }
                                        setW4Files(prev => ({
                                          ...prev,
                                          [employee.id]: fileData
                                        }))
                                      }
                                      reader.readAsDataURL(file)
                                    } else {
                                      alert('Please drop a PDF file (W-4 form)')
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onClick={() => {
                                    const input = document.createElement('input')
                                    input.type = 'file'
                                    input.accept = '.pdf,application/pdf'
                                    input.onchange = (e) => {
                                      const file = e.target.files[0]
                                      if (file) {
                                        const reader = new FileReader()
                                        reader.onload = (event) => {
                                          const fileData = {
                                            name: file.name,
                                            size: file.size,
                                            type: file.type,
                                            data: event.target.result,
                                            uploadedAt: new Date().toISOString()
                                          }
                                          setW4Files(prev => ({
                                            ...prev,
                                            [employee.id]: fileData
                                          }))
                                        }
                                        reader.readAsDataURL(file)
                                      }
                                    }
                                    input.click()
                                  }}
                                  style={{
                                    border: '2px dashed #1e3a5f',
                                    borderRadius: '8px',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: w4Files[employee.id] ? '#e8f5e9' : '#f8f9fa',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!w4Files[employee.id]) {
                                      e.currentTarget.style.backgroundColor = '#e3f2fd'
                                      e.currentTarget.style.borderColor = '#1976d2'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!w4Files[employee.id]) {
                                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                                      e.currentTarget.style.borderColor = '#1e3a5f'
                                    }
                                  }}
                                >
                                  {w4Files[employee.id] ? (
                                    <div>
                                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                      </svg>
                                      <p style={{ color: '#4caf50', fontWeight: '600', marginBottom: '0.5rem' }}>W-4 Form Uploaded</p>
                                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{w4Files[employee.id].name}</p>
                                      <p style={{ color: '#999', fontSize: '0.8rem' }}>
                                        {(w4Files[employee.id].size / 1024).toFixed(2)} KB
                                      </p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (window.confirm('Are you sure you want to remove this W-4 form?')) {
                                            setW4Files(prev => {
                                              const newFiles = { ...prev }
                                              delete newFiles[employee.id]
                                              return newFiles
                                            })
                                          }
                                        }}
                                        style={{
                                          marginTop: '0.75rem',
                                          padding: '0.5rem 1rem',
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.85rem',
                                          fontWeight: '600'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                      </svg>
                                      <p style={{ color: '#1e3a5f', fontWeight: '600', marginBottom: '0.25rem' }}>Drop W-4 Form Here</p>
                                      <p style={{ color: '#666', fontSize: '0.9rem' }}>or click to browse</p>
                                      <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.5rem' }}>PDF files only</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Navigation Footer */}
            <div className="navigation-footer" style={{ flexShrink: 0 }}>
              <div className="nav-footer-left">
                <button 
                  className="nav-footer-btn"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === null ? 'active' : ''}`}
                  onClick={() => setActiveView(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Menu</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Transaction' ? 'active' : ''}`}
                  onClick={() => setActiveView('Transaction')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>Transactions</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Timesheets' ? 'active' : ''}`}
                  onClick={() => setActiveView('Timesheets')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>Clock in/out</span>
                </button>
                <button 
                  className={`nav-footer-btn ${activeView === 'Settings' ? 'active' : ''}`}
                  onClick={() => setActiveView('Settings')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Settings</span>
                </button>
              </div>
              <div className="nav-footer-right">
              </div>
            </div>
          </div>
        ) : (
          <React.Fragment>
            {/* Left Panel - Products */}
            <div className="products-panel">
          <div className="products-header">
            <div className="header-left">
              <button className="icon-button" onClick={() => setIsCategoryModalOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div className="category-buttons">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="header-right">
              <button 
                className={`edit-menu-btn ${isEditMode ? 'active' : ''}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Product
              </button>
              {isEditMode && (
                <button 
                  className="auto-import-menu-btn"
                  onClick={() => setIsAutoImportModalOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Auto Import Menu
                </button>
              )}
              <div className="search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  id="search-products"
                  name="search-products"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className={`product-card ${isEditMode ? 'edit-mode' : ''}`}
                onClick={!isEditMode ? () => {
                  // If product is from a different section and we're searching, switch to that section
                  if (searchQuery.trim() && product.category && product.category !== selectedCategory && product.category !== 'All') {
                    setSelectedCategory(product.category)
                    // Clear search to show all items in the new section
                    setSearchQuery('')
                  }
                  
                  // Check if product has toppings
                  const hasToppings = product.toppings && product.toppings.length > 0
                  
                  if (!hasToppings) {
                    // No toppings - add directly to cart without modal
                    addToCart(product, [], {})
                  } else {
                    // Has toppings - open toppings modal with pre-selected toppings
                    setSelectedProductForToppings(product)
                    const preSelectedToppings = (product.toppings || [])
                      .filter(t => {
                        const toppingObj = typeof t === 'string' ? { name: t, preSelected: false } : t
                        return toppingObj.preSelected === true
                      })
                    const preSelectedToppingsList = preSelectedToppings.map(t => typeof t === 'string' ? t : t)
                    const preSelectedPortions = {}
                    preSelectedToppings.forEach(t => {
                      const toppingObj = typeof t === 'string' ? { name: t } : t
                      const name = toppingObj.name || ''
                      if (name) preSelectedPortions[name] = 'full'
                    })
                    setSelectedToppings(preSelectedToppingsList)
                    setToppingPortions(preSelectedPortions)
                    setIsToppingsModalOpen(true)
                  }
                } : undefined}
              >
                {isEditMode && (
                  <button
                    className="delete-product-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProduct(product.id)
                    }}
                    title="Delete product"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
                {(() => {
                  const imageUrl = getImageUrl(product.image)
                  // Always try to show blob URLs (they're temporary but should display)
                  // For other images, check if they're marked as failed
                  const isBlobUrl = product.image?.startsWith('blob:')
                  const isPendingBlob = isBlobUrl && pendingBlobUrls.has(product.image)
                  // Show image if: it exists AND (it's a blob URL OR it's not marked as failed)
                  const hasImage = imageUrl && (isBlobUrl || !failedImages.has(product.id))
                  
                  // Debug logging
                  if (product.image) {
                    console.log(`Product ${product.id} (${product.name}): image=${product.image}, imageUrl=${imageUrl}, hasImage=${hasImage}, isBlob=${isBlobUrl}, failedImages.has=${failedImages.has(product.id)}, pendingBlobUrls.has=${pendingBlobUrls.has(product.image)}`)
                  }
                  
                  return (
                    <>
                      {/* Image always renders first, above the product name - square dimensions */}
                      {hasImage ? (
                        <div className="product-image-placeholder" style={{ position: 'relative' }}>
                          <img 
                            key={`${product.id}-${product.image || 'no-image'}`}
                            src={imageUrl} 
                            alt={product.name} 
                            className="product-image"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              // If image fails to load, check if it's a pending blob URL first
                              const isPendingBlob = product.image?.startsWith('blob:') && pendingBlobUrls.has(product.image)
                              
                              if (isPendingBlob) {
                                console.log('⏳ Blob URL is pending, not marking as failed yet:', imageUrl)
                                // Don't mark as failed yet - blob URLs might need a moment
                                // Don't hide the image either - let it retry
                                return
                              }
                              
                              // For non-pending images, mark as failed
                              console.error('❌ Failed to load image:', imageUrl, 'for product:', product.name)
                              console.error('❌ Product image value:', product.image)
                              console.error('❌ Error details:', e.target.error || 'Unknown error')
                              setFailedImages(prev => new Set(prev).add(product.id))
                              e.target.style.display = 'none'
                            }}
                            onLoad={() => {
                              console.log('✅ Image loaded successfully:', imageUrl, 'for product:', product.name)
                              // Remove from failed images if it was previously marked as failed
                              setFailedImages(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(product.id)
                                return newSet
                              })
                            }}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isEditMode && (
                            <button 
                              className="edit-item-btn" 
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(product)
                              }}
                              title="Edit Item"
                              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit Item
                            </button>
                          )}
                        </div>
                      ) : isEditMode ? (
                        <div className="product-image-placeholder edit-mode-placeholder">
                          <button className="edit-item-btn" onClick={() => startEditing(product)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit Item
                          </button>
                        </div>
                      ) : (
                        <div className="product-image-placeholder ingredients-placeholder">
                          {product.ingredients && product.ingredients.length > 0 ? (
                            <div className="ingredients-display">
                              <h4 className="ingredients-title">Ingredients</h4>
                              <ul className="ingredients-list">
                                {product.ingredients.map((ingredient, idx) => (
                                  <li key={idx}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="no-ingredients-message">
                              <p>No ingredients listed</p>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Product name and price on same line */}
                      <div className="product-name-price-row">
                        <h3 className="product-name">{product.name}</h3>
                        <span className="product-price">${product.price.toFixed(2)}</span>
                      </div>
                      <p className="product-description">{product.description}</p>
                      <div className="product-buttons">
                        <button 
                          className="product-action-btn ingredients-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Open ingredients modal
                            setSelectedProductForIngredients(product)
                            setIsIngredientsModalOpen(true)
                          }}
                        >
                          Ingredients
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            ))}
            {isEditMode && (
              <div 
                className="product-card add-product-card"
                onClick={startAddingProduct}
              >
                <div className="product-image-placeholder edit-mode-placeholder">
                  <button className="edit-item-btn add-product-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Product
                  </button>
                </div>
                <h3 className="product-name">Add New Product</h3>
                <p className="product-description">Click to add a new product to your menu</p>
              </div>
            )}
          </div>
          
          {/* Navigation Footer */}
          <div className="navigation-footer">
            <div className="nav-footer-left">
              <button 
                className="nav-footer-btn"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </button>
              <button 
                className={`nav-footer-btn ${activeView === null ? 'active' : ''}`}
                onClick={() => setActiveView(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Menu</span>
              </button>
              <button 
                className={`nav-footer-btn ${activeView === 'Transaction' ? 'active' : ''}`}
                onClick={() => setActiveView('Transaction')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                <span>Transactions</span>
              </button>
              <button 
                className={`nav-footer-btn ${activeView === 'Timesheets' ? 'active' : ''}`}
                onClick={() => setActiveView('Timesheets')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Clock in/out</span>
              </button>
              <button 
                className={`nav-footer-btn ${activeView === 'Settings' ? 'active' : ''}`}
                onClick={() => setActiveView('Settings')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Settings</span>
              </button>
            </div>
            <div className="nav-footer-right">
            </div>
          </div>
          </div>

        {/* Edit Product Modal */}
        {isEditModalOpen && (editingProductId || isAddingProduct) && (
          <div className="modal-overlay" onClick={cancelEditing}>
            <div className={`modal-content ${activeEditSection === 'toppings' ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{isAddingProduct ? 'Add Product' : 'Edit Product'}</h2>
                <button className="modal-close-btn" onClick={cancelEditing}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="modal-section-tabs">
                <button
                  type="button"
                  className={`section-tab-btn ${activeEditSection === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveEditSection('details')}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={`section-tab-btn ${activeEditSection === 'toppings' ? 'active' : ''}`}
                  onClick={() => setActiveEditSection('toppings')}
                >
                  Toppings
                </button>
                <button
                  type="button"
                  className={`section-tab-btn ${activeEditSection === 'ingredients' ? 'active' : ''}`}
                  onClick={() => setActiveEditSection('ingredients')}
                >
                  Ingredients
                </button>
              </div>
              <div className="modal-body">
                <div className="product-edit-form">
                  {activeEditSection === 'details' && (
                    <>
                  <div className="form-group">
                    <label htmlFor="product-name">Product Name</label>
                    <input
                      type="text"
                      id="product-name"
                      name="product-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="product-price">Price</label>
                    <input
                      type="text"
                      id="product-price"
                      name="product-price"
                      value={formatPriceForDisplay(editFormData.price)}
                      onChange={handlePriceChange}
                      onFocus={handlePriceFocus}
                      placeholder="$0.00"
                      className="price-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="product-section">Section</label>
                    <select
                      id="product-section"
                      name="product-section"
                      value={productSection}
                      onChange={(e) => setProductSection(e.target.value)}
                      className="section-select"
                      disabled={categories.filter(cat => cat !== 'All').length === 0}
                    >
                      {categories.filter(cat => cat !== 'All').length === 0 ? (
                        <option value="">No sections available - Add one first</option>
                      ) : (
                        categories.filter(cat => cat !== 'All').map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))
                      )}
                    </select>
                    {isAddingProduct && categories.filter(cat => cat !== 'All').length > 0 && (
                      <p className="form-hint">Product will be added to "{productSection || categories.filter(cat => cat !== 'All')[0]}" section. You can change it if needed.</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="product-image">Product Image</label>
                    <div className="image-upload-section">
                      {editFormData.imagePreview && (
                        <div className="image-preview-small">
                          <img 
                            src={editFormData.imagePreview} 
                            alt="Product preview" 
                            onError={(e) => {
                              console.error('Failed to load image preview:', editFormData.imagePreview)
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="image-upload-buttons">
                        <label htmlFor="product-image" className="file-upload-btn-small">
                          <input
                            type="file"
                            id="product-image"
                            name="product-image"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                          />
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          {editFormData.imagePreview ? 'Change' : 'Upload'}
                        </label>
                        {editFormData.imagePreview && (
                          <button
                            type="button"
                            className="remove-image-btn-small"
                            onClick={handleRemoveImage}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                    </>
                  )}

                  {activeEditSection === 'toppings' && (
                    <div className="form-group">
                      <div className="toppings-header">
                        <button
                          type="button"
                          className="add-item-btn"
                          onClick={() => {
                            setEditFormData({
                              ...editFormData,
                              toppings: [...(editFormData.toppings || []), { name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                            })
                          }}
                        >
                          Add Toppings
                        </button>
                      </div>
                      <div className="list-section">
                        <div className="list-items">
                          {(editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []).map((topping, index) => {
                              const toppingName = typeof topping === 'string' ? topping : topping.name || ''
                              const toppingPrice = typeof topping === 'string' ? 0 : topping.price || 0
                              const halfSameAsBase = typeof topping === 'string' ? false : (topping.halfSameAsBase || false)
                              const hasPortions = typeof topping === 'string' ? false : (topping.hasPortions !== undefined ? topping.hasPortions : true)
                              const hasHalf = typeof topping === 'string' ? (hasPortions) : (topping.hasHalf !== undefined ? topping.hasHalf : (hasPortions))
                              const hasDouble = typeof topping === 'string' ? (hasPortions) : (topping.hasDouble !== undefined ? topping.hasDouble : (hasPortions))
                              const halfPrice = typeof topping === 'string' ? (toppingPrice * 0.5) : (topping.halfPrice !== undefined ? topping.halfPrice : (halfSameAsBase ? toppingPrice : (toppingPrice * 0.5)))
                              const doublePrice = typeof topping === 'string' ? (toppingPrice * 2) : (topping.doublePrice !== undefined ? topping.doublePrice : (toppingPrice * 2))
                              const isPreSelected = typeof topping === 'string' ? false : (topping.preSelected || false)
                              return (
                                <div 
                                  key={index} 
                                  className={`list-item topping-item ${draggedToppingIndex === index ? 'dragging' : ''} ${dragOverToppingIndex === index ? 'drag-over' : ''}`}
                                  draggable
                                  onDragStart={(e) => handleToppingDragStart(e, index)}
                                  onDragOver={(e) => handleToppingDragOver(e, index)}
                                  onDragLeave={handleToppingDragLeave}
                                  onDrop={(e) => handleToppingDrop(e, index)}
                                  onDragEnd={handleToppingDragEnd}
                                >
                                  <div className="topping-drag-handle" title="Drag to reorder">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="9" cy="6" r="1.5"></circle>
                                      <circle cx="15" cy="6" r="1.5"></circle>
                                      <circle cx="9" cy="12" r="1.5"></circle>
                                      <circle cx="15" cy="12" r="1.5"></circle>
                                      <circle cx="9" cy="18" r="1.5"></circle>
                                      <circle cx="15" cy="18" r="1.5"></circle>
                                    </svg>
                                  </div>
                                  <div className="topping-content-wrapper">
                                    <div className="topping-header-row">
                                      <div className="topping-checkbox-wrapper">
                                        <input
                                          type="checkbox"
                                          id={`topping-has-portions-${index}`}
                                          name={`topping-has-portions-${index}`}
                                          checked={hasPortions}
                                          onChange={(e) => {
                                            const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                            const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                            const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: toppingPrice, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                            newToppings[index] = { ...currentTopping, hasPortions: e.target.checked }
                                            setEditFormData({
                                              ...editFormData,
                                              toppings: newToppings
                                            })
                                          }}
                                          className="portion-toggle-checkbox"
                                        />
                                      </div>
                                      <div className="topping-text-wrapper">
                                        <span className="portion-toggle-text">Enable Portions</span>
                                      </div>
                                      <div className="topping-spacer"></div>
                                      <div className="topping-spacer"></div>
                                    </div>
                                    <div className="topping-prices-row">
                                      <button
                                        type="button"
                                        className={`star-btn ${isPreSelected ? 'active' : ''}`}
                                        onClick={() => {
                                          const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                          const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                          const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                          newToppings[index] = { ...currentTopping, preSelected: !isPreSelected }
                                          setEditFormData({
                                            ...editFormData,
                                            toppings: newToppings
                                          })
                                        }}
                                        title={isPreSelected ? 'Remove pre-selection' : 'Pre-select this topping'}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isPreSelected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                      </button>
                                      <input
                                        type="text"
                                        id={`topping-name-${index}`}
                                        name={`topping-name-${index}`}
                                        value={toppingName}
                                        onChange={(e) => {
                                          const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                          const newToppings = [...currentToppings]
                                          // If this is the first item and toppings array was empty, initialize it
                                          if (newToppings.length === 0) {
                                            newToppings.push({ name: e.target.value, price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true })
                                          } else {
                                            const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                            newToppings[index] = { ...currentTopping, name: e.target.value, price: toppingPrice }
                                          }
                                          setEditFormData({
                                            ...editFormData,
                                            toppings: newToppings
                                          })
                                        }}
                                        onFocus={(e) => {
                                          // Select all text when focused if empty
                                          if (e.target.value === '') {
                                            e.target.select()
                                          }
                                        }}
                                        className="topping-name-input"
                                        placeholder="Topping name"
                                      />
                                      <div className="topping-price-input-wrapper">
                                        <span className="price-prefix">$</span>
                                        <input
                                          type="text"
                                          id={`topping-price-${index}`}
                                          name={`topping-price-${index}`}
                                          value={(() => {
                                            const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                            const currentTopping = currentToppings[index] || (index === 0 ? { name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : null)
                                            // If there's a raw price value being typed (like ".75"), show it
                                            if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawPrice !== undefined) {
                                              return currentTopping._rawPrice
                                            }
                                            // Otherwise show the formatted price
                                            if (toppingPrice === 0) return ''
                                            return toppingPrice.toString()
                                          })()}
                                          onChange={(e) => {
                                            let value = e.target.value.replace(/[^0-9.]/g, '')
                                            
                                            const parts = value.split('.')
                                            if (parts.length > 2) return
                                            if (parts[1] && parts[1].length > 2) return
                                            
                                            const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                            const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                            const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                            
                                            // If value starts with "." (like ".75"), store as raw until user finishes typing
                                            if (value === '' || (value.startsWith('.') && parts[0] === '')) {
                                              newToppings[index] = { ...currentTopping, name: toppingName, price: 0, _rawPrice: value }
                                            } else {
                                              const priceValue = parseFloat(value) || 0
                                              newToppings[index] = { ...currentTopping, name: toppingName, price: priceValue }
                                              // Remove _rawPrice if it exists
                                              if (newToppings[index]._rawPrice !== undefined) {
                                                delete newToppings[index]._rawPrice
                                              }
                                            }
                                            
                                            setEditFormData({
                                              ...editFormData,
                                              toppings: newToppings
                                            })
                                          }}
                                          onFocus={(e) => {
                                            // Move cursor to the end (right side) of the input
                                            setTimeout(() => {
                                              e.target.setSelectionRange(e.target.value.length, e.target.value.length)
                                            }, 0)
                                          }}
                                          onBlur={(e) => {
                                            // On blur, ensure we have a valid number
                                            const newToppings = [...editFormData.toppings]
                                            const currentTopping = newToppings[index]
                                            if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawPrice !== undefined) {
                                              // Convert raw price to actual price
                                              const rawValue = currentTopping._rawPrice
                                              const priceValue = rawValue === '' || rawValue === '.' ? 0 : (parseFloat(rawValue) || 0)
                                              newToppings[index] = { ...currentTopping, price: priceValue }
                                              delete newToppings[index]._rawPrice
                                              setEditFormData({
                                                ...editFormData,
                                                toppings: newToppings
                                              })
                                            }
                                          }}
                                          className="topping-price-input"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div className="portion-section">
                                        <div className="portion-prices">
                                          <div className="portion-price-item">
                                            <input
                                              type="checkbox"
                                              id={`topping-has-half-${index}`}
                                              name={`topping-has-half-${index}`}
                                              checked={hasHalf}
                                              onChange={(e) => {
                                                const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                                const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: toppingPrice, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                                newToppings[index] = { ...currentTopping, hasHalf: e.target.checked }
                                                setEditFormData({
                                                  ...editFormData,
                                                  toppings: newToppings
                                                })
                                              }}
                                              className="portion-toggle-checkbox"
                                            />
                                            <span className="portion-label">1/2</span>
                                            <div className="portion-price-input-wrapper">
                                              <span className="price-prefix">$</span>
                                              <input
                                                type="text"
                                                id={`topping-half-price-${index}`}
                                                name={`topping-half-price-${index}`}
                                                disabled={!hasPortions || !hasHalf}
                                                value={(() => {
                                                  const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                  const currentTopping = currentToppings[index] || (index === 0 ? { name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : null)
                                                  // If there's a raw half price value being typed (like ".75"), show it
                                                  if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawHalfPrice !== undefined) {
                                                    return currentTopping._rawHalfPrice
                                                  }
                                                  // Otherwise show the formatted price
                                                  if (halfPrice === 0) return ''
                                                  return halfPrice.toString()
                                                })()}
                                                onChange={(e) => {
                                                    let value = e.target.value.replace(/[^0-9.]/g, '')
                                                    const parts = value.split('.')
                                                    if (parts.length > 2) return
                                                    if (parts[1] && parts[1].length > 2) return
                                                    const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                    const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                                    const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: toppingPrice, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                                    
                                                    // If value starts with "." (like ".75"), store as raw until user finishes typing
                                                    if (value === '' || (value.startsWith('.') && parts[0] === '')) {
                                                      newToppings[index] = { ...currentTopping, halfPrice: 0, _rawHalfPrice: value }
                                                    } else {
                                                      const priceValue = parseFloat(value) || 0
                                                      newToppings[index] = { ...currentTopping, halfPrice: priceValue }
                                                      // Remove _rawHalfPrice if it exists
                                                      if (newToppings[index]._rawHalfPrice !== undefined) {
                                                        delete newToppings[index]._rawHalfPrice
                                                      }
                                                    }
                                                    
                                                    setEditFormData({
                                                      ...editFormData,
                                                      toppings: newToppings
                                                    })
                                                  }}
                                                  onFocus={(e) => {
                                                    setTimeout(() => {
                                                      e.target.setSelectionRange(e.target.value.length, e.target.value.length)
                                                    }, 0)
                                                  }}
                                                  onBlur={(e) => {
                                                    // On blur, ensure we have a valid number
                                                    const newToppings = [...editFormData.toppings]
                                                    const currentTopping = newToppings[index]
                                                    if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawHalfPrice !== undefined) {
                                                      // Convert raw price to actual price
                                                      const rawValue = currentTopping._rawHalfPrice
                                                      const priceValue = rawValue === '' || rawValue === '.' ? 0 : (parseFloat(rawValue) || 0)
                                                      newToppings[index] = { ...currentTopping, halfPrice: priceValue }
                                                      delete newToppings[index]._rawHalfPrice
                                                      setEditFormData({
                                                        ...editFormData,
                                                        toppings: newToppings
                                                      })
                                                    }
                                                  }}
                                                  className="portion-price-input"
                                                  placeholder="0.00"
                                                />
                                              </div>
                                            </div>
                                            <div className="portion-price-item">
                                              <input
                                                type="checkbox"
                                                id={`topping-has-double-${index}`}
                                                name={`topping-has-double-${index}`}
                                                checked={hasDouble}
                                                onChange={(e) => {
                                                  const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                  const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                                  const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: toppingPrice, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                                  newToppings[index] = { ...currentTopping, hasDouble: e.target.checked }
                                                  setEditFormData({
                                                    ...editFormData,
                                                    toppings: newToppings
                                                  })
                                                }}
                                                className="portion-toggle-checkbox"
                                              />
                                              <span className="portion-label">2x</span>
                                              <div className="portion-price-input-wrapper">
                                                <span className="price-prefix">$</span>
                                                <input
                                                  type="text"
                                                  id={`topping-double-price-${index}`}
                                                  name={`topping-double-price-${index}`}
                                                  disabled={!hasPortions || !hasDouble}
                                                  value={(() => {
                                                    const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                    const currentTopping = currentToppings[index] || (index === 0 ? { name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : null)
                                                    // If there's a raw double price value being typed (like ".75"), show it
                                                    if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawDoublePrice !== undefined) {
                                                      return currentTopping._rawDoublePrice
                                                    }
                                                    // Otherwise show the formatted price
                                                    if (doublePrice === 0) return ''
                                                    return doublePrice.toString()
                                                  })()}
                                                  onChange={(e) => {
                                                    let value = e.target.value.replace(/[^0-9.]/g, '')
                                                    const parts = value.split('.')
                                                    if (parts.length > 2) return
                                                    if (parts[1] && parts[1].length > 2) return
                                                    const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                                    const newToppings = currentToppings.length > 0 ? [...currentToppings] : [{ name: '', price: 0, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true }]
                                                    const currentTopping = typeof newToppings[index] === 'string' ? { name: newToppings[index], price: toppingPrice, halfSameAsBase: false, preSelected: false, hasPortions: true, hasHalf: true, hasDouble: true } : newToppings[index]
                                                    
                                                    // If value starts with "." (like ".75"), store as raw until user finishes typing
                                                    if (value === '' || (value.startsWith('.') && parts[0] === '')) {
                                                      newToppings[index] = { ...currentTopping, doublePrice: 0, _rawDoublePrice: value }
                                                    } else {
                                                      const priceValue = parseFloat(value) || 0
                                                      newToppings[index] = { ...currentTopping, doublePrice: priceValue }
                                                      // Remove _rawDoublePrice if it exists
                                                      if (newToppings[index]._rawDoublePrice !== undefined) {
                                                        delete newToppings[index]._rawDoublePrice
                                                      }
                                                    }
                                                    
                                                    setEditFormData({
                                                      ...editFormData,
                                                      toppings: newToppings
                                                    })
                                                  }}
                                                  onFocus={(e) => {
                                                    setTimeout(() => {
                                                      e.target.setSelectionRange(e.target.value.length, e.target.value.length)
                                                    }, 0)
                                                  }}
                                                  onBlur={(e) => {
                                                    // On blur, ensure we have a valid number
                                                    const newToppings = [...editFormData.toppings]
                                                    const currentTopping = newToppings[index]
                                                    if (currentTopping && typeof currentTopping === 'object' && currentTopping._rawDoublePrice !== undefined) {
                                                      // Convert raw price to actual price
                                                      const rawValue = currentTopping._rawDoublePrice
                                                      const priceValue = rawValue === '' || rawValue === '.' ? 0 : (parseFloat(rawValue) || 0)
                                                      newToppings[index] = { ...currentTopping, doublePrice: priceValue }
                                                      delete newToppings[index]._rawDoublePrice
                                                      setEditFormData({
                                                        ...editFormData,
                                                        toppings: newToppings
                                                      })
                                                    }
                                                  }}
                                                  className="portion-price-input"
                                                  placeholder="0.00"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="list-item-actions">
                                    <button
                                      type="button"
                                      className="remove-item-btn"
                                      onClick={() => {
                                        const currentToppings = editFormData.toppings && editFormData.toppings.length > 0 ? editFormData.toppings : []
                                        const filteredToppings = currentToppings.filter((_, i) => i !== index)
                                        setEditFormData({
                                          ...editFormData,
                                          toppings: filteredToppings
                                        })
                                      }}
                                    >
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                      </div>
                    </div>
                  )}

                  {activeEditSection === 'ingredients' && (
                    <div className="form-group">
                      <div className="ingredients-header">
                        <label htmlFor="product-ingredients">Ingredients</label>
                        {editFormData.toppings && editFormData.toppings.length > 0 && (
                          <button
                            type="button"
                            className="auto-import-btn"
                            onClick={handleAutoImportToppings}
                            title="Import toppings as ingredients"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Auto Import
                          </button>
                        )}
                      </div>
                      <textarea
                        id="product-ingredients"
                        name="product-ingredients"
                        value={ingredientsText}
                        onChange={(e) => setIngredientsText(e.target.value)}
                        placeholder={`Enter ingredients, one per line or separated by commas\nExample:\nMilk\nSugar\nVanilla extract`}
                        className="ingredients-textarea"
                        rows={8}
                      />
                      <p className="form-hint">Enter ingredients one per line or separated by commas</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel-small" onClick={cancelEditing}>Cancel</button>
                <button className="btn-save-small" onClick={() => handleSaveProduct(editingProductId || null)}>
                  {isAddingProduct ? 'Add Product' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Edit Modal */}
        {isCategoryModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Item Sections</h2>
                <button className="modal-close-btn" onClick={() => setIsCategoryModalOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="category-list">
                  {categories.map((category, index) => (
                    <div 
                      key={index} 
                      data-index={index}
                      className={`category-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    >
                      {editingCategoryIndex === index ? (
                        <div className="category-edit-form">
                          <input
                            type="text"
                            id={`category-edit-${index}`}
                            name={`category-edit-${index}`}
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveCategory()}
                            className="category-input"
                            autoFocus
                          />
                          <div className="category-edit-actions">
                            <button className="btn-save-small" onClick={handleSaveCategory}>Save</button>
                            <button className="btn-cancel-small" onClick={handleCancelCategoryEdit}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="category-content">
                            {index !== 0 && (
                              <div 
                                className="drag-handle"
                                onMouseDown={(e) => handleMouseDown(e, index)}
                                title="Drag to reorder"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="9" cy="5" r="1"></circle>
                                  <circle cx="9" cy="12" r="1"></circle>
                                  <circle cx="9" cy="19" r="1"></circle>
                                  <circle cx="15" cy="5" r="1"></circle>
                                  <circle cx="15" cy="12" r="1"></circle>
                                  <circle cx="15" cy="19" r="1"></circle>
                                </svg>
                              </div>
                            )}
                            <span className="category-name">{category}</span>
                          </div>
                          <div className="category-actions">
                            {index !== 0 && (
                              <>
                                <button 
                                  className="category-action-btn edit"
                                  onClick={() => handleEditCategory(index)}
                                  title="Edit category"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button 
                                  className="category-action-btn delete"
                                  onClick={() => handleDeleteCategory(index)}
                                  title="Delete category"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="add-category-section">
                  <input
                    type="text"
                    id="new-category-name"
                    name="new-category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Enter new category name"
                    className="category-input"
                  />
                  <button className="btn-add-category" onClick={handleAddCategory}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Right Panel - Order */}
          <div className="order-panel">
          <div className="order-header">
            <h2>Current Order</h2>
            <div className="order-badge">{cartItemCount} items</div>
            <button className="icon-button" onClick={clearCart}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>

          <div className="order-type-selector">
            <button
              type="button"
              className={`order-type-btn ${orderType === 'Dine In' ? 'active' : ''}`}
              onClick={() => setOrderType('Dine In')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                <path d="M7 2v20"></path>
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"></path>
                <path d="M21 15v7"></path>
              </svg>
              Dine In
            </button>
            <button
              type="button"
              className={`order-type-btn ${orderType === 'Takeout' ? 'active' : ''}`}
              onClick={() => setOrderType('Takeout')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              Takeout
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map(item => {
                const itemPrice = item.totalPrice !== undefined ? item.totalPrice : item.price
                return (
                  <div key={item.cartItemKey || item.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name-price">
                        <h4>{item.name}</h4>
                        <p className="cart-item-price">${itemPrice.toFixed(2)}</p>
                      </div>
                      {item.selectedToppings && item.selectedToppings.length > 0 && (
                        <div className="cart-item-toppings">
                          {item.selectedToppings.map((topping, index) => {
                            const toppingName = typeof topping === 'string' ? topping : topping.name || ''
                            const portion = topping.portion || 'full'
                            const displayName = portion !== 'full' ? `${toppingName} (${portion.charAt(0).toUpperCase() + portion.slice(1)})` : toppingName
                            return (
                              <span key={index} className="cart-topping-pill">
                                {displayName}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.cartItemKey || item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemKey || item.id, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="order-footer">
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (8.5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="payment-buttons">
            <button className="payment-btn crypto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <line x1="6" y1="10" x2="6" y2="14"></line>
                <line x1="10" y1="10" x2="10" y2="14"></line>
                <line x1="14" y1="10" x2="14" y2="14"></line>
                <line x1="18" y1="10" x2="18" y2="14"></line>
              </svg>
              Crypto
            </button>
            <button 
              className="payment-btn pay"
              onClick={() => {
                if (!orderType) {
                  setIsOrderTypeWarningModalOpen(true)
                  return
                }
                setIsCustomerNameModalOpen(true)
              }}
              disabled={!cart || cart.length === 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Pay
            </button>
          </div>
          </div>
        </div>
          </React.Fragment>
        )}
      </div>

      {/* Toppings Selection Modal */}
      {isToppingsModalOpen && selectedProductForToppings && (
        <div className="modal-overlay" onClick={() => {
          setIsToppingsModalOpen(false)
          setSelectedToppings([])
          setToppingPortions({})
          setSelectedProductForToppings(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Toppings - {selectedProductForToppings.name}</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsToppingsModalOpen(false)
                setSelectedToppings([])
                setToppingPortions({})
                setSelectedProductForToppings(null)
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {selectedProductForToppings.toppings && selectedProductForToppings.toppings.length > 0 ? (
                <div className="toppings-selection-list">
                  {categorizeToppings(selectedProductForToppings.toppings).map((categoryGroup, groupIndex) => (
                    <React.Fragment key={categoryGroup.category}>
                      {/* Category separator */}
                      <div className="topping-category-separator">
                        <span className="topping-category-label">{categoryGroup.category}</span>
                        <div className="topping-category-line"></div>
                      </div>
                      
                      {/* Toppings in this category */}
                      {categoryGroup.items.map(({ topping, originalIndex }) => {
                        const toppingName = typeof topping === 'string' ? topping : topping.name || ''
                        const basePrice = typeof topping === 'string' ? 0 : topping.price || 0
                        const halfSameAsBase = typeof topping === 'string' ? false : (topping.halfSameAsBase || false)
                        const hasPortions = typeof topping === 'string' ? true : (topping.hasPortions !== undefined ? topping.hasPortions : true)
                        const hasHalf = typeof topping === 'string' ? (hasPortions) : (topping.hasHalf !== undefined ? topping.hasHalf : (hasPortions))
                        const hasDouble = typeof topping === 'string' ? (hasPortions) : (topping.hasDouble !== undefined ? topping.hasDouble : (hasPortions))
                        const customHalfPrice = typeof topping === 'string' ? undefined : topping.halfPrice
                        const customDoublePrice = typeof topping === 'string' ? undefined : topping.doublePrice
                        const isSelected = selectedToppings.some(t => {
                          const tName = typeof t === 'string' ? t : t.name || ''
                          return tName === toppingName
                        })
                        let currentPortion = toppingPortions[toppingName] || 'full'
                        // If portion is half but hasHalf is false, revert to full
                        if (currentPortion === 'half' && !hasHalf) {
                          currentPortion = 'full'
                        }
                        // If portion is double but hasDouble is false, revert to full
                        if (currentPortion === 'double' && !hasDouble) {
                          currentPortion = 'full'
                        }
                        
                        // Calculate price based on portion
                        let displayPrice = basePrice
                        if (hasPortions) {
                          if (currentPortion === 'half' && hasHalf) {
                            if (customHalfPrice !== undefined) {
                              displayPrice = customHalfPrice
                            } else {
                              displayPrice = halfSameAsBase ? basePrice : basePrice * 0.5
                            }
                          } else if (currentPortion === 'double' && hasDouble) {
                            if (customDoublePrice !== undefined) {
                              displayPrice = customDoublePrice
                            } else {
                              displayPrice = basePrice * 2
                            }
                          }
                        }
                        
                        const toggleTopping = () => {
                          if (isSelected) {
                            setSelectedToppings(selectedToppings.filter(t => {
                              const tName = typeof t === 'string' ? t : t.name || ''
                              return tName !== toppingName
                            }))
                            const newPortions = { ...toppingPortions }
                            delete newPortions[toppingName]
                            setToppingPortions(newPortions)
                          } else {
                            setSelectedToppings([...selectedToppings, topping])
                            setToppingPortions({ ...toppingPortions, [toppingName]: 'full' })
                          }
                        }

                        return (
                          <div 
                            key={originalIndex} 
                            className={`topping-selection-item ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => {
                              // Don't toggle if clicking on portion buttons or checkbox
                              const target = e.target
                              const isPortionButton = target.closest('.topping-portion-buttons') || target.closest('.portion-btn')
                              const isCheckbox = target.type === 'checkbox' || target.closest('.topping-selection-checkbox')
                              
                              if (!isPortionButton && !isCheckbox) {
                                toggleTopping()
                              }
                            }}
                          >
                            <div className="topping-selection-content">
                              <div className="topping-selection-checkbox">
                                <input
                                  type="checkbox"
                                  id={`topping-select-${toppingName}-${originalIndex}`}
                                  name={`topping-select-${toppingName}-${originalIndex}`}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedToppings([...selectedToppings, topping])
                                      setToppingPortions({ ...toppingPortions, [toppingName]: 'full' })
                                    } else {
                                      setSelectedToppings(selectedToppings.filter(t => {
                                        const tName = typeof t === 'string' ? t : t.name || ''
                                        return tName !== toppingName
                                      }))
                                      const newPortions = { ...toppingPortions }
                                      delete newPortions[toppingName]
                                      setToppingPortions(newPortions)
                                    }
                                  }}
                                />
                              </div>
                              <div className="topping-selection-info">
                                <span className="topping-selection-name">{toppingName}</span>
                                <div className="topping-selection-price-controls">
                                  {basePrice > 0 && (
                                    <>
                                      <span className="topping-selection-price">+${displayPrice.toFixed(2)}</span>
                                      {isSelected && hasPortions && (
                                        <div className="topping-portion-buttons">
                                          <button
                                            type="button"
                                            className={`portion-btn ${currentPortion === 'half' ? 'active' : ''}`}
                                            disabled={!hasHalf}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setToppingPortions({ ...toppingPortions, [toppingName]: 'half' })
                                            }}
                                          >
                                            1/2
                                          </button>
                                          <button
                                            type="button"
                                            className={`portion-btn ${currentPortion === 'full' ? 'active' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setToppingPortions({ ...toppingPortions, [toppingName]: 'full' })
                                            }}
                                          >
                                            Full
                                          </button>
                                          <button
                                            type="button"
                                            className={`portion-btn ${currentPortion === 'double' ? 'active' : ''}`}
                                            disabled={!hasDouble}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setToppingPortions({ ...toppingPortions, [toppingName]: 'double' })
                                            }}
                                          >
                                            2x
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="empty-toppings-message">
                  <p>No toppings available for this item.</p>
                  <p className="hint-text">Add toppings in the edit menu to customize this item.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-small" onClick={() => {
                setIsToppingsModalOpen(false)
                setSelectedToppings([])
                setToppingPortions({})
                setSelectedProductForToppings(null)
              }}>
                Cancel
              </button>
              <button 
                className="btn-save-small" 
                onClick={() => {
                  addToCart(selectedProductForToppings, selectedToppings, toppingPortions)
                  setIsToppingsModalOpen(false)
                  setSelectedToppings([])
                  setToppingPortions({})
                  setSelectedProductForToppings(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredients Modal */}
      {isIngredientsModalOpen && selectedProductForIngredients && (
        <div className="modal-overlay" onClick={() => {
          setIsIngredientsModalOpen(false)
          setSelectedProductForIngredients(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ingredients - {selectedProductForIngredients.name}</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsIngredientsModalOpen(false)
                setSelectedProductForIngredients(null)
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <div className="ingredients-header">
                  <label htmlFor="product-ingredients-view">Ingredients</label>
                </div>
                {selectedProductForIngredients.ingredients && selectedProductForIngredients.ingredients.length > 0 ? (
                  <textarea
                    id="product-ingredients-view"
                    name="product-ingredients-view"
                    value={selectedProductForIngredients.ingredients.join('\n')}
                    readOnly
                    placeholder={`Enter ingredients, one per line or separated by commas\nExample:\nMilk\nSugar\nVanilla extract`}
                    className="ingredients-textarea"
                    rows={8}
                  />
                ) : (
                  <div className="empty-toppings-message">
                    <p>No ingredients listed for this item.</p>
                    <p className="hint-text">Add ingredients in the edit menu to display them here.</p>
                  </div>
                )}
                <p className="form-hint">Enter ingredients one per line or separated by commas</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-small" onClick={() => {
                setIsIngredientsModalOpen(false)
                setSelectedProductForIngredients(null)
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Name Modal for Dine In */}
      {isCustomerNameModalOpen && (
        <div className="modal-overlay" onClick={handleClosePaymentModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enter Customer Name - {orderType}</h2>
              <button className="modal-close-btn" onClick={handleClosePaymentModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="customer-name">Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter first name and last name or initial (e.g., Lisa L or Lisa Smith)"
                  className="form-input"
                  autoFocus
                />
              </div>
              
              {orderType === 'Dine In' && (
                <div className="form-group">
                  <label htmlFor="table-number">Table Number (Optional)</label>
                  <input
                    type="text"
                    id="table-number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Enter table number"
                    className="form-input"
                  />
                </div>
              )}
              
              <div className="payment-method-selection">
                <div className="payment-method-label">
                  <label>Payment Method</label>
                </div>
                <div className="payment-method-options">
                  <button
                    className={`payment-method-btn ${selectedPaymentMethod === 'Card' ? 'selected' : ''}`}
                    onClick={() => handlePaymentMethodSelect('Card')}
                    disabled={isProcessingStripePayment}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    <span>Card</span>
                  </button>
                  <button
                    className={`payment-method-btn ${selectedPaymentMethod === 'Cash' ? 'selected' : ''}`}
                    onClick={() => handlePaymentMethodSelect('Cash')}
                    disabled={isProcessingStripePayment}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span>Cash</span>
                  </button>
                </div>
              </div>
              
              {isProcessingStripePayment && stripePaymentStatus && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#f0f7ff', 
                  border: '1px solid #0066cc',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div className="spinner" style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderWidth: '2px',
                      borderTopColor: '#0066cc'
                    }}></div>
                    <span style={{ fontWeight: '600', color: '#0066cc' }}>Processing Payment</span>
                  </div>
                  <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{stripePaymentStatus}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel-small" 
                onClick={handleClosePaymentModal}
              >
                Cancel
              </button>
              <button 
                className="btn-primary-small" 
                onClick={handleCompletePayment}
                disabled={!validateCustomerName(customerName).valid || !selectedPaymentMethod || !cart || cart.length === 0 || isProcessingStripePayment}
              >
                {isProcessingStripePayment ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Type Warning Modal */}
      {isOrderTypeWarningModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOrderTypeWarningModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '300px', 
              height: '300px', 
              maxWidth: '90vw', 
              maxHeight: '90vw',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="modal-header">
              <h2>Order Type Required</h2>
              <button className="modal-close-btn" onClick={() => setIsOrderTypeWarningModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: 'red', 
                textAlign: 'center', 
                margin: 0 
              }}>
                Please select ORDER TYPE
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary-small" 
                onClick={() => setIsOrderTypeWarningModalOpen(false)}
                style={{ width: '100%' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '600px', height: '600px', maxWidth: '90vw', maxHeight: '90vw', aspectRatio: '1 / 1' }}>
            <div className="modal-header">
              <h2 style={{ textDecoration: 'none', borderBottom: 'none' }}>{selectedTransaction.customerName}</h2>
              <button className="modal-close-btn" onClick={() => setSelectedTransaction(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <div style={{ 
                marginBottom: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid #eee'
              }}>
                <div style={{ 
                  fontSize: '1.2rem', 
                  color: '#666', 
                  display: 'flex', 
                  gap: '1.5rem', 
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <span>
                    <strong>Order Type:</strong> {selectedTransaction.orderType}
                  </span>
                  {selectedTransaction.tableNumber && (
                    <span>
                      <strong>Table:</strong> {selectedTransaction.tableNumber}
                    </span>
                  )}
                  <span>
                    <strong>Payment:</strong> {selectedTransaction.paymentMethod}
                  </span>
                  <span>
                    <strong>Date:</strong> {formatDate(selectedTransaction.timestamp)}
                  </span>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
                  Items:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedTransaction.items.map((item, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '0.75rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#111', fontSize: '1rem', marginBottom: '0.5rem' }}>
                          {item.quantity}x {item.name}
                        </div>
                        {item.selectedToppings && item.selectedToppings.length > 0 && (
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '0.5rem', 
                            marginTop: '0.5rem' 
                          }}>
                            {item.selectedToppings.map((topping, toppingIndex) => {
                              const toppingName = typeof topping === 'string' ? topping : topping.name || ''
                              const portion = topping.portion || 'full'
                              const displayName = portion !== 'full' 
                                ? `${toppingName} (${portion.charAt(0).toUpperCase() + portion.slice(1)})` 
                                : toppingName
                              return (
                                <span 
                                  key={toppingIndex}
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.3rem 0.6rem',
                                    backgroundColor: '#1e3a5f',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  {displayName}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: '600', color: '#111', marginLeft: '1rem', fontSize: '1rem' }}>
                        ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '1.5rem', 
                  paddingTop: '1.5rem', 
                  borderTop: '2px solid #eee',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem'
                  }}>
                    <span style={{ color: '#666' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>${(selectedTransaction.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem'
                  }}>
                    <span style={{ color: '#666' }}>Tax (8.5%):</span>
                    <span style={{ fontWeight: '600' }}>${(selectedTransaction.tax || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.1rem',
                    paddingTop: '0.75rem',
                    borderTop: '2px solid #eee',
                    marginTop: '0.5rem'
                  }}>
                    <span style={{ color: '#111', fontWeight: '700' }}>Total:</span>
                    <span style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '1.2rem', textDecoration: 'none', borderBottom: 'none' }}>${(selectedTransaction.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary-small" 
                onClick={() => setSelectedTransaction(null)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Employee Confirmation Modal */}
      {isRemoveEmployeeModalOpen && employeeToRemove && (
        <div className="modal-overlay" onClick={() => {
          setIsRemoveEmployeeModalOpen(false)
          setEmployeeToRemove(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh', minHeight: 'auto' }}>
            <div className="modal-header">
              <h2>Remove Employee</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsRemoveEmployeeModalOpen(false)
                setEmployeeToRemove(null)
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', textAlign: 'center', overflowY: 'visible', flex: 'none' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: '#333' }}>
                Are you sure you want to remove <strong>{employeeToRemove.name}</strong>?
              </p>
              <p style={{ fontSize: '0.95rem', margin: '0', color: '#666' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', padding: '1rem 1.5rem', borderTop: '2px solid #c0c0c0' }}>
              <button
                onClick={() => {
                  setIsRemoveEmployeeModalOpen(false)
                  setEmployeeToRemove(null)
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTeamMembers(teamMembers.filter(emp => emp.id !== employeeToRemove.id))
                  setIsRemoveEmployeeModalOpen(false)
                  setEmployeeToRemove(null)
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Warning Modal */}
      {isLogoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh', minHeight: 'auto' }}>
            <div className="modal-header">
              <h2>Logout</h2>
              <button className="modal-close-btn" onClick={() => setIsLogoutModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', textAlign: 'center', overflowY: 'visible', flex: 'none' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: '#333' }}>
                Are you sure you want to logout?
              </p>
              <p style={{ fontSize: '0.95rem', margin: '0', color: '#666' }}>
                All unsaved changes will be lost.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', padding: '1rem 1.5rem', borderTop: '2px solid #c0c0c0' }}>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsLoginModalOpen(false)
          setAuthError('')
          setLoginFormData({ email: '', password: '' })
          setShowModalLoginPassword(false)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh', minHeight: 'auto' }}>
            <div className="modal-header">
              <h2>Login</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsLoginModalOpen(false)
                setAuthError('')
                setLoginFormData({ email: '', password: '' })
                setShowModalLoginPassword(false)
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'visible', flex: 'none' }}>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Email</label>
                  <input
                    type="email"
                    id="login-email"
                    value={loginFormData.email}
                    onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showModalLoginPassword ? "text" : "password"}
                      id="login-password"
                      value={loginFormData.password}
                      onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalLoginPassword(!showModalLoginPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                      onMouseOut={(e) => e.target.style.color = '#666'}
                    >
                      {showModalLoginPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {authError && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    color: '#c33',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    {authError}
                  </div>
                )}
                <div className="modal-footer" style={{ display: 'flex', gap: '1rem', padding: '0', borderTop: 'none', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginModalOpen(false)
                      setIsSignupModalOpen(true)
                      setAuthError('')
                      setLoginFormData({ email: '', password: '' })
                      setShowModalLoginPassword(false)
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                  >
                    Sign Up Instead
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#1e3a5f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#152a42'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#1e3a5f'}
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {isSignupModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsSignupModalOpen(false)
          setAuthError('')
          setSignupFormData({ email: '', password: '', confirmPassword: '' })
          setShowModalSignupPassword(false)
          setShowModalSignupConfirmPassword(false)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh', minHeight: 'auto' }}>
            <div className="modal-header">
              <h2>Sign Up</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsSignupModalOpen(false)
                setAuthError('')
                setSignupFormData({ email: '', password: '', confirmPassword: '' })
                setShowModalSignupPassword(false)
                setShowModalSignupConfirmPassword(false)
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'visible', flex: 'none' }}>
              <form onSubmit={handleSignup}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="signup-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Email</label>
                  <input
                    type="email"
                    id="signup-email"
                    value={signupFormData.email}
                    onChange={(e) => setSignupFormData({ ...signupFormData, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="signup-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showModalSignupPassword ? "text" : "password"}
                      id="signup-password"
                      value={signupFormData.password}
                      onChange={(e) => setSignupFormData({ ...signupFormData, password: e.target.value })}
                      placeholder="Enter your password (min 6 characters)"
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalSignupPassword(!showModalSignupPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                      onMouseOut={(e) => e.target.style.color = '#666'}
                    >
                      {showModalSignupPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="signup-confirm-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showModalSignupConfirmPassword ? "text" : "password"}
                      id="signup-confirm-password"
                      value={signupFormData.confirmPassword}
                      onChange={(e) => setSignupFormData({ ...signupFormData, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalSignupConfirmPassword(!showModalSignupConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.color = '#1e3a5f'}
                      onMouseOut={(e) => e.target.style.color = '#666'}
                    >
                      {showModalSignupConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {authError && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    color: '#c33',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    {authError}
                  </div>
                )}
                <div className="modal-footer" style={{ display: 'flex', gap: '1rem', padding: '0', borderTop: 'none', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignupModalOpen(false)
                      setIsLoginModalOpen(true)
                      setAuthError('')
                      setSignupFormData({ email: '', password: '', confirmPassword: '' })
                      setShowModalSignupPassword(false)
                      setShowModalSignupConfirmPassword(false)
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                  >
                    Login Instead
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Auto Import Menu Modal */}
      {isAutoImportModalOpen && (
        <div className="modal-overlay" onClick={() => {
          if (!isImporting) {
            setIsAutoImportModalOpen(false)
            setImportFile(null)
            setImportError(null)
            setImportProgress(null)
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
            <div className="modal-header">
              <h2>Auto Import Menu</h2>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  if (!isImporting) {
                    setIsAutoImportModalOpen(false)
                    setImportFile(null)
                    setImportError(null)
                    setImportProgress(null)
                  }
                }}
                disabled={isImporting}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '2rem' }}>
              <p style={{ marginBottom: '1.5rem', color: '#666', fontSize: '1rem' }}>
                Upload a menu image (PNG, JPG) or PDF file. Our AI will analyze it and automatically create menu sections, products, and toppings.
              </p>

              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `3px dashed ${dragActive ? '#1e3a5f' : '#ddd'}`,
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  backgroundColor: dragActive ? '#f0f7ff' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginBottom: '1.5rem'
                }}
                onClick={() => document.getElementById('menu-file-input')?.click()}
              >
                <input
                  id="menu-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                  disabled={isImporting}
                />
                {importFile ? (
                  <div>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" style={{ marginBottom: '1rem' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <p style={{ margin: '0.5rem 0', fontWeight: '600', color: '#1e3a5f', fontSize: '1.1rem' }}>
                      {importFile.name}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                      {(importFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setImportFile(null)
                        setImportError(null)
                      }}
                      disabled={isImporting}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: '1px solid #ef9a9a',
                        borderRadius: '6px',
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ marginBottom: '1rem' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p style={{ margin: '0.5rem 0', fontWeight: '600', color: '#333', fontSize: '1.1rem' }}>
                      Drop your menu file here
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                      or click to browse
                    </p>
                    <p style={{ margin: '1rem 0 0 0', color: '#999', fontSize: '0.85rem' }}>
                      Supports: PNG, JPG, PDF
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {importError && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#ffebee',
                  border: '2px solid #ef9a9a',
                  borderRadius: '8px',
                  color: '#c62828',
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem'
                }}>
                  {importError}
                </div>
              )}

              {/* Progress Message */}
              {importProgress && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  border: '2px solid #90caf9',
                  borderRadius: '8px',
                  color: '#1565c0',
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}>
                  {importProgress}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel-small"
                onClick={() => {
                  if (!isImporting) {
                    setIsAutoImportModalOpen(false)
                    setImportFile(null)
                    setImportError(null)
                    setImportProgress(null)
                  }
                }}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                className="btn-primary-small"
                onClick={handleMenuImport}
                disabled={!importFile || isImporting}
                style={{ opacity: (!importFile || isImporting) ? 0.5 : 1 }}
              >
                {isImporting ? 'Importing...' : 'Import Menu'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App

