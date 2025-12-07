import React, { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'

// Sample product data
const initialProducts = []

const initialCategories = ['All']
const API_BASE_URL = 'https://localhost:4001/api'
const IMAGE_BASE_URL = 'https://localhost:4001'

// LocalStorage keys
const STORAGE_KEYS = {
  CART: 'pos_cart',
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  ORDER_TYPE: 'pos_order_type',
  SELECTED_CATEGORY: 'pos_selected_category'
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

  const [selectedCategory, setSelectedCategory] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SELECTED_CATEGORY, 'All')
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState(() => loadFromStorage(STORAGE_KEYS.CART, []))
  const [orderType, setOrderType] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ORDER_TYPE, 'Dine In')
  )
  const [activeView, setActiveView] = useState(null)
  const [products, setProducts] = useState(() => loadFromStorage(STORAGE_KEYS.PRODUCTS, initialProducts))
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

  // Reusable function to load products from backend
  const reloadProductsFromBackend = async () => {
    try {
      console.log('📡 Reloading products from:', `${API_BASE_URL}/products`)
      const response = await axios.get(`${API_BASE_URL}/products`)
      console.log('✅ Products reloaded successfully:', response.data?.length || 0, 'products')
      
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

  // Load products from backend on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // First verify backend is available
        try {
          const healthResponse = await axios.get(`https://localhost:4001/api/health`)
          console.log('✅ Backend health check passed:', healthResponse.data)
        } catch (healthError) {
          console.warn('⚠️ Backend server not available. Make sure it is running on https://localhost:4001')
          console.warn('   Health check error:', healthError.response?.status || healthError.message)
          console.warn('   Start it with: cd Back && npm start')
          const savedProducts = loadFromStorage(STORAGE_KEYS.PRODUCTS, [])
          if (savedProducts.length > 0) {
            setProducts(savedProducts)
          }
          return
        }

        console.log('📡 Fetching products from:', `${API_BASE_URL}/products`)
        const response = await axios.get(`${API_BASE_URL}/products`)
        console.log('✅ Products loaded successfully:', response.data?.length || 0, 'products')
        
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
          // Backend has no products - check if we have products in localStorage to sync
          const savedProducts = loadFromStorage(STORAGE_KEYS.PRODUCTS, [])
          if (savedProducts.length > 0) {
            console.log('🔄 Backend is empty but localStorage has products. Syncing to backend...')
            // Sync products to backend (without images - they're blob URLs)
            const productsToSync = savedProducts.map(p => ({
              ...p,
              image: p.image && !p.image.startsWith('blob:') ? p.image : null
            }))
            
            // Try to sync each product to backend
            for (const product of productsToSync) {
              try {
                const formData = new FormData()
                formData.append('name', product.name)
                formData.append('price', product.price.toString())
                formData.append('category', product.category || 'Other')
                formData.append('toppings', JSON.stringify(product.toppings || []))
                formData.append('ingredients', JSON.stringify(product.ingredients || []))
                // Note: We can't sync blob URLs, so images will be lost
                
                await axios.post(`${API_BASE_URL}/products`, formData)
                console.log(`✅ Synced product "${product.name}" to backend`)
              } catch (syncError) {
                console.warn(`⚠️ Failed to sync product "${product.name}" to backend:`, syncError.message)
              }
            }
            
            // Reload products from backend after sync
            const reloadResponse = await axios.get(`${API_BASE_URL}/products`)
            if (reloadResponse.data && reloadResponse.data.length > 0) {
              setProducts(reloadResponse.data)
              localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(reloadResponse.data))
            } else {
              // Still empty, use localStorage
              setProducts(productsToSync)
            }
          }
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
        // If backend fails, use localStorage backup if available
        const savedProducts = loadFromStorage(STORAGE_KEYS.PRODUCTS, [])
        if (savedProducts.length > 0) {
          // Clean up blob URLs from localStorage products too
          const cleanedProducts = savedProducts.map(product => {
            if (product.image && product.image.startsWith('blob:')) {
              console.warn(`Removing invalid blob URL from product ${product.id}:`, product.image)
              return { ...product, image: null }
            }
            return product
          })
          setProducts(cleanedProducts)
        }
      }
    }
    loadProducts()
  }, [])

  // Save cart to localStorage whenever it changes
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

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
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

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
        removeImage: false
      }))
    }
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
        await axios.delete(`${API_BASE_URL}/products/${productId}`)
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

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()])
      setNewCategoryName('')
    }
  }

  const handleEditCategory = (index) => {
    if (index === 0) return // Can't edit "All"
    setEditingCategoryIndex(index)
    setNewCategoryName(categories[index])
  }

  const handleSaveCategory = () => {
    if (editingCategoryIndex !== null && newCategoryName.trim()) {
      const updatedCategories = [...categories]
      const oldCategory = updatedCategories[editingCategoryIndex]
      updatedCategories[editingCategoryIndex] = newCategoryName.trim()
      
      // Update products with the old category to use the new category name
      setProducts(products.map(p => 
        p.category === oldCategory ? { ...p, category: newCategoryName.trim() } : p
      ))
      
      // If the selected category was the one being edited, update it
      if (selectedCategory === oldCategory) {
        setSelectedCategory(newCategoryName.trim())
      }
      
      setCategories(updatedCategories)
      setEditingCategoryIndex(null)
      setNewCategoryName('')
    }
  }

  const handleDeleteCategory = (index) => {
    if (index === 0) return // Can't delete "All"
    const categoryToDelete = categories[index]
    const updatedCategories = categories.filter((_, i) => i !== index)
    
    // Update products in deleted category to "All" or first available category
    setProducts(products.map(p => 
      p.category === categoryToDelete ? { ...p, category: 'All' } : p
    ))
    
    // If the selected category was deleted, switch to "All"
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory('All')
    }
    
    setCategories(updatedCategories)
  }

  const handleCancelCategoryEdit = () => {
    setEditingCategoryIndex(null)
    setNewCategoryName('')
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

    // Group toppings by common base words
    const groups = {}
    const singleWordToppings = []
    
    toppingNames.forEach(topping => {
      const words = topping.split(/\s+/)
      
      if (words.length > 1) {
        // Multi-word topping: use last word as base (e.g., "white rice" -> base: "rice", variant: "white")
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
      
      // Get variants and sort them
      const variants = items.map(item => item.variant).sort()
      
      // Format as "Base variant1/variant2" (e.g., "Rice white/brown")
      // Even for single variant, use this format for consistency
      formattedIngredients.push(`${capitalizedBase} ${variants.join('/')}`)
    })

    // For single-word toppings, try to group them if they seem related
    // For now, if there are multiple single words, we could group them
    // But based on the example "meat chicken/beef", we might need user input or heuristics
    // For simplicity, if there are 2+ single words, group them as "meat" category
    // Otherwise, add them individually
    if (singleWordToppings.length > 1) {
      // Group single words together (e.g., "chicken", "beef" -> "meat chicken/beef")
      const sortedSingleWords = singleWordToppings.sort()
      formattedIngredients.push(`meat ${sortedSingleWords.join('/')}`)
    } else if (singleWordToppings.length === 1) {
      // Single word topping, add as-is
      formattedIngredients.push(singleWordToppings[0])
    }

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

  return (
    <div className="app-container">
      <div className="main-content">
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

          {/* Bottom Navigation */}
          <div className="bottom-nav">
            <button
              className="nav-btn"
              onClick={(e) => {
                e.preventDefault()
                if (window.confirm('Are you sure you want to log out?')) {
                  // Clear local storage
                  localStorage.removeItem(STORAGE_KEYS.CART)
                  localStorage.removeItem(STORAGE_KEYS.ORDER_TYPE)
                  localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY)
                  // Clear cart state
                  setCart([])
                  // Optionally reload the page or redirect
                  window.location.reload()
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log out
            </button>
            <button
              className={`nav-btn ${activeView === 'Register' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveView('Register')
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Menu
            </button>
            <button
              className={`nav-btn ${activeView === 'Transaction' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveView('Transaction')
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Transaction
            </button>
            <button
              className={`nav-btn ${activeView === 'Checks' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveView('Checks')
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              Checks
            </button>
            <button
              className={`nav-btn ${activeView === 'Analytics' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveView('Analytics')
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Analytics
            </button>
            <button
              className={`nav-btn ${activeView === 'Settings' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveView('Settings')
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
              </svg>
              Settings
            </button>
          </div>
        </div>

        {/* Edit Product Modal */}
        {isEditModalOpen && (editingProductId || isAddingProduct) && (
          <div className="modal-overlay" onClick={cancelEditing}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                                <div key={index} className="list-item topping-item">
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
            <button className="payment-btn pay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Pay
            </button>
          </div>
        </div>
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
                  {selectedProductForToppings.toppings.map((topping, index) => {
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
                    
                    return (
                      <div 
                        key={index} 
                        className={`topping-selection-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="topping-selection-content">
                          <div className="topping-selection-checkbox">
                            <input
                              type="checkbox"
                              id={`topping-select-${toppingName}-${index}`}
                              name={`topping-select-${toppingName}-${index}`}
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
                  <label>Ingredients</label>
                </div>
                {selectedProductForIngredients.ingredients && selectedProductForIngredients.ingredients.length > 0 ? (
                  <textarea
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

    </div>
  )
}

export default App
