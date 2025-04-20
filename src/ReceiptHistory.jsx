import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient' // Import supabase client

const personalCategories = [
  'Food & Groceries',
  'Rent & Mortgage',
  'Utilities',
  'Phone & Internet',
  'Transport',
  'Health & Medical',
  'Education Fees',
  'Childcare',
  'Insurance',
  'Entertainment',
  'Subscriptions',
  'Clothing & Shopping',
  'Travel & Holidays',
  'Gifts & Donations',
  'Fitness & Wellness',
  'Pet Expenses',
  'Home Maintenance'
]

const workExpenseCategories = [
  'Home Office Expenses',
  'Phone & Internet',
  'Work-Related Travel',
  'Uniforms & Protective Clothing',
  'Self-Education or Training',
  'Tools & Equipment',
  'Union or Membership Fees',
  'Work-Related Subscriptions',
  'Parking & Tolls',
  'Stationery & Office Supplies',
  'Laptop or Computer',
  'Professional Development'
]

const businessCategories = [
  'Advertising & Marketing',
  'Business Insurance',
  'Website & Hosting Fees',
  'Software Subscriptions',
  'Contractor & Staff Wages',
  'Superannuation Contributions',
  'Business Travel & Accommodation',
  'Rent & Utilities',
  'Accounting & Legal Fees',
  'Office Equipment & Furniture',
  'Vehicle Expenses',
  'Bank Fees & Interest',
  'Stock or Inventory Purchases',
  'Training & Seminars',
  'Business Licences & Permits',
  'BAS or ATO Payments',
  'Client Gifts & Entertainment'
]

const investmentCategories = [
  'Shares & Brokerage Fees',
  'Investment Property Expenses',
  'Interest on Investment Loans',
  'Financial Adviser Fees',
  'Capital Gains Tax Records',
  'Rental Property Management Fees',
  'Maintenance & Repairs',
  'Depreciation Reports',
  'Strata Fees',
  'Council Rates & Water Charges',
  'Investment Research Tools',
  'Dividends & Distribution Statements',
  'Bank Fees',
  'Tax Agent Fees'
]

const defaultCategories = ['Food & Dining', 'Transportation', 'Utilities', 'Entertainment', 'Other']
const types = ['Personal', 'Work Expense', 'Business', 'Investment']

function ReceiptHistory({ receipts, updateReceipt, deleteReceipt }) {
  const [expandedReceipts, setExpandedReceipts] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [currentReceiptId, setCurrentReceiptId] = useState(null) // Use ID for editing
  const [editFormData, setEditFormData] = useState({
    date: '',
    merchant: '',
    items: [{ item: '', category: '', type: '', amount: '' }],
    notes: '',
    receipt_url: null, // Store URL for editing
    newReceiptImage: null, // Store new file object if uploaded during edit
  })
  const [editFormErrors, setEditFormErrors] = useState({})
  const [isDragging, setIsDragging] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterFinancialYear, setFilterFinancialYear] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date', 'merchant', 'totalAmount'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc', 'desc'

  const getCategoriesForType = (type) => {
    switch(type) {
      case 'Personal':
        return personalCategories
      case 'Work Expense':
        return workExpenseCategories
      case 'Business':
        return businessCategories
      case 'Investment':
        return investmentCategories
      default:
        return defaultCategories
    }
  }

  const toggleReceiptExpansion = (id) => {
    if (expandedReceipts.includes(id)) {
      setExpandedReceipts(expandedReceipts.filter(i => i !== id))
    } else {
      setExpandedReceipts([...expandedReceipts, id])
    }
  }

  const toggleAllReceipts = () => {
    if (expandedReceipts.length === filteredAndSortedReceipts.length) {
      setExpandedReceipts([])
    } else {
      setExpandedReceipts(filteredAndSortedReceipts.map(r => r.id))
    }
  }

  const handleEditClick = (id) => {
    const receiptToEdit = receipts.find(r => r.id === id)
    if (receiptToEdit) {
      setCurrentReceiptId(id)
      setEditFormData({
        date: receiptToEdit.date,
        merchant: receiptToEdit.merchant,
        items: receiptToEdit.items.map(item => ({ ...item, amount: String(item.amount) })), // Convert amount to string for input value
        notes: receiptToEdit.notes,
        receipt_url: receiptToEdit.receipt_url, // Load existing URL
        newReceiptImage: null, // Clear new file input
      })
      setIsEditing(true)
      setEditFormErrors({})
    }
  }

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
       // Optional: Delete image from storage if it exists
      const receiptToDelete = receipts.find(r => r.id === id);
      if (receiptToDelete && receiptToDelete.receipt_url) {
         try {
            // Extract the file path from the public URL
            const urlParts = receiptToDelete.receipt_url.split('/storage/v1/object/public/receipt-images/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                 const { error: deleteError } = await supabase.storage
                    .from('receipt-images')
                    .remove([filePath]);
                if (deleteError) {
                    console.error('Error deleting image from storage:', deleteError.message);
                }
            }
         } catch (e) {
             console.error('Error processing image URL for deletion:', e);
         }
      }
      await deleteReceipt(id)
      setExpandedReceipts(expandedReceipts.filter(i => i !== id))
    }
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData({ ...editFormData, [name]: value })
    if (editFormErrors[name]) {
      setEditFormErrors({...editFormErrors, [name]: undefined})
    }
  }

  const handleEditItemChange = (index, field, value) => {
    const newItems = [...editFormData.items]
    newItems[index][field] = value

    if (field === 'type') {
      newItems[index].category = ''
    }

    setEditFormData({ ...editFormData, items: newItems })

    if (editFormErrors.items?.[index]?.[field]) {
      const newItemErrors = [...editFormErrors.items]
      delete newItemErrors[index][field]
      if (Object.keys(newItemErrors[index]).length === 0) {
        newItemErrors[index] = undefined
      }
      setEditFormErrors({
        ...editFormErrors,
        items: newItemErrors.some(e => e) ? newItemErrors : undefined
      })
    }
  }

  const handleAddEditItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, { item: '', category: '', type: '', amount: '' }]
    })
  }

  const handleRemoveEditItem = (index) => {
    if (editFormData.items.length > 1) {
      const newItems = editFormData.items.filter((_, i) => i !== index)
      setEditFormData({ ...editFormData, items: newItems })

      if (editFormErrors.items) {
        const newItemErrors = [...editFormErrors.items]
        newItemErrors.splice(index, 1)
        setEditFormErrors({
          ...editFormErrors,
          items: newItemErrors.length > 0 ? newItemErrors : undefined
        })
      }
    }
  }

  const handleEditFileChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      setEditFormData({ ...editFormData, newReceiptImage: file, receipt_url: null }) // Store new file, clear old URL
    } else {
      setEditFormData({ ...editFormData, newReceiptImage: null }) // Clear new file
    }
  }

  const handleEditDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleEditDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleEditDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleEditFileChange(file)
  }, [])

  const handleEditFileInput = (e) => {
    const file = e.target.files[0]
    handleEditFileChange(file)
  }

  const validateEditForm = () => {
    const errors = {}
    let isValid = true

    if (!editFormData.date) {
      errors.date = 'Date is required'
      isValid = false
    }

    if (!editFormData.merchant.trim()) {
      errors.merchant = 'Merchant is required'
      isValid = false
    }

    const itemErrors = editFormData.items.map(item => {
      const itemError = {}
      if (!item.item.trim()) {
        itemError.item = 'Item is required'
        isValid = false
      }
      if (!item.category) {
        itemError.category = 'Category is required'
        isValid = false
      }
      if (!item.type) {
        itemError.type = 'Type is required'
        isValid = false
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        itemError.amount = 'Valid amount is required'
        isValid = false
      }
      return itemError
    })

    if (itemErrors.some(error => Object.keys(error).length > 0)) {
      errors.items = itemErrors
    }

    setEditFormErrors(errors)
    return isValid
  }

  const handleUpdateReceipt = async () => {
    if (!validateEditForm()) {
      return
    }

    let receiptImageUrl = editFormData.receipt_url; // Start with existing URL

    if (editFormData.newReceiptImage) {
      // Upload new image if a new file was selected
      const fileExt = editFormData.newReceiptImage.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${supabase.auth.user().id}/${fileName}`; // Store under user ID

      const { data, error } = await supabase.storage
        .from('receipt-images') // Create a bucket named 'receipt-images' in Supabase Storage
        .upload(filePath, editFormData.newReceiptImage);

      if (error) {
        console.error('Error uploading new receipt image:', error.message);
        // Handle error, maybe don't proceed with saving the receipt
        return;
      }
      // Get the public URL of the uploaded image
      const { publicUrl } = supabase.storage.from('receipt-images').getPublicUrl(filePath).data;
      receiptImageUrl = publicUrl;

      // Optional: Delete the old image from storage if it existed
      if (editFormData.receipt_url) {
         try {
            const urlParts = editFormData.receipt_url.split('/storage/v1/object/public/receipt-images/');
            if (urlParts.length > 1) {
                const oldFilePath = urlParts[1];
                 const { error: deleteError } = await supabase.storage
                    .from('receipt-images')
                    .remove([oldFilePath]);
                if (deleteError) {
                    console.error('Error deleting old image from storage:', deleteError.message);
                }
            }
         } catch (e) {
             console.error('Error processing old image URL for deletion:', e);
         }
      }
    } else if (editFormData.receipt_url === null && editFormData.newReceiptImage === null) {
        // If image was removed during edit (cleared file input and no new file), set URL to null
        receiptImageUrl = null;
    }


    const updatedReceiptData = {
      date: editFormData.date,
      merchant: editFormData.merchant,
      items: editFormData.items.map(item => ({
        item: item.item,
        category: item.category,
        type: item.type,
        amount: parseFloat(item.amount) || 0
      })),
      notes: editFormData.notes,
      receipt_url: receiptImageUrl, // Store the image URL
      total_amount: editTotalAmount // Use total_amount to match DB schema
    }

    await updateReceipt(currentReceiptId, updatedReceiptData)

    setIsEditing(false)
    setCurrentReceiptId(null)
    setEditFormData({
      date: '',merchant: '',
      items: [{ item: '', category: '', type: '', amount: '' }],
      notes: '',
      receipt_url: null,
      newReceiptImage: null,
    })
    setEditFormErrors({})
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentReceiptId(null)
    setEditFormData({
      date: '',merchant: '',
      items: [{ item: '', category: '', type: '', amount: '' }],
      notes: '',
      receipt_url: null,
      newReceiptImage: null,
    })
    setEditFormErrors({})
  }

  const editTotalAmount = editFormData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  // Filtering and Sorting Logic
  const filteredAndSortedReceipts = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();

    let filteredReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date);
      const yearMatch = filterYear ? receiptDate.getFullYear() === parseInt(filterYear) : true;

      const financialYearMatch = filterFinancialYear ? (() => {
        const [startYear, endYear] = filterFinancialYear.split('-').map(Number);
        const financialYearStart = new Date(startYear, 6, 1); // July 1st
        const financialYearEnd = new Date(endYear, 5, 30); // June 30th
        return receiptDate >= financialYearStart && receiptDate <= financialYearEnd;
      })() : true;

      // Check if merchant or notes match the search term
      const merchantOrNotesMatch = searchTermLower === '' ||
                                   receipt.merchant.toLowerCase().includes(searchTermLower) ||
                                   receipt.notes.toLowerCase().includes(searchTermLower);

      // Check if any item matches the search term, type filter, or category filter
      const itemMatches = receipt.items.some(item => {
        const itemSearchMatch = searchTermLower === '' ||
                                item.item.toLowerCase().includes(searchTermLower) ||
                                item.category.toLowerCase().includes(searchTermLower) ||
                                item.type.toLowerCase().includes(searchTermLower) ||
                                String(item.amount).includes(searchTermLower); // Search by amount string

        const typeMatch = filterType ? item.type === filterType : true;
        const categoryMatch = filterCategory ? item.category === filterCategory : true;

        return itemSearchMatch && typeMatch && categoryMatch;
      });

      // Include the receipt if it matches year/financial year filters AND (merchant/notes match search OR any item matches item filters/search)
      return (yearMatch && financialYearMatch) && (merchantOrNotesMatch || itemMatches);
    });

    // Apply sorting to the filtered list of receipts
    filteredReceipts.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'merchant') {
        comparison = a.merchant.localeCompare(b.merchant);
      } else if (sortBy === 'totalAmount') {
        comparison = a.total_amount - b.total_amount; // Use total_amount
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredReceipts;
  }, [receipts, searchTerm, filterType, filterCategory, filterYear, filterFinancialYear, sortBy, sortOrder]);

  // Effect to expand all filtered receipts when filters/search change
  useEffect(() => {
    if (filteredAndSortedReceipts.length > 0) {
      setExpandedReceipts(filteredAndSortedReceipts.map(r => r.id));
    } else {
      setExpandedReceipts([]);
    }
  }, [filteredAndSortedReceipts]); // Depend on the filtered list changing


  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc'); // Default to ascending when changing column
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set();
    receipts.forEach(receipt => {
      const date = new Date(receipt.date);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [receipts]);

  const availableFinancialYears = useMemo(() => {
    const financialYears = new Set();
    receipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed

      if (month >= 6) { // July to December
        financialYears.add(`${year}-${year + 1}`);
      } else { // January to June
        financialYears.add(`${year - 1}-${year}`);
      }
    });
    return Array.from(financialYears).sort((a, b) => {
      const [aStart] = a.split('-').map(Number);
      const [bStart] = b.split('-').map(Number);
      return bStart - aStart;
    });
  }, [receipts]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterCategory('');
    setFilterYear('');
    setFilterFinancialYear('');
    setSortBy('date');
    setSortOrder('desc');
  };


  return (
    <div>
      <div className="header-actions">
         <button className="button secondary-button" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        <Link to="/" className="back-button">
          Back to Main
        </Link>
      </div>

      <h1>Receipt History</h1>

      <div className="filter-sort-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by item, type, category, amount, merchant, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="wide-search-input"
          />
        </div>

        <div className="filters">
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setFilterCategory(''); }}>
            <option value="">All Types</option>
            {types.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} disabled={!filterType}>
            <option value="">All Categories</option>
            {getCategoriesForType(filterType).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterFinancialYear(''); }}>
            <option value="">All Years</option>
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>

           <select value={filterFinancialYear} onChange={(e) => { setFilterFinancialYear(e.target.value); setFilterYear(''); }}>
            <option value="">All Financial Years</option>
            {availableFinancialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>

        <div className="sort-and-reset"> {/* New wrapper div */}
          <div className="sort-options">
            <span>Sort by:</span>
            <button
              className={`sort-button ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => handleSort('date')}
            >
              Date
              {sortBy === 'date' && (
                <svg viewBox="0 0 24 24" width="18" height="18">
                   <path d={sortOrder === 'asc' ? "M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" : "M12 18.17L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17zm0-12.34L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83z"}/>
                </svg>
              )}
            </button>
            <button
              className={`sort-button ${sortBy === 'merchant' ? 'active' : ''}`}
              onClick={() => handleSort('merchant')}
            >
              Merchant
               {sortBy === 'merchant' && (
                <svg viewBox="0 0 24 24" width="18" height="18">
                   <path d={sortOrder === 'asc' ? "M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" : "M12 18.17L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17zm0-12.34L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83z"}/>
                </svg>
              )}
            </button>
            <button
              className={`sort-button ${sortBy === 'totalAmount' ? 'active' : ''}`}
              onClick={() => handleSort('totalAmount')}
            >
              Amount
               {sortBy === 'totalAmount' && (
                <svg viewBox="0 0 24 24" width="18" height="18">
                   <path d={sortOrder === 'asc' ? "M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" : "M12 18.17L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17zm0-12.34L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83z"}/>
                </svg>
              )}
            </button>
          </div>
           <button className="button secondary-button reset-button" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      </div>


      {filteredAndSortedReceipts.length > 0 ? (
        <div className="receipts-list">
          <div className="receipts-header">
            <h2>Filtered Receipts ({filteredAndSortedReceipts.length})</h2>
            <button
              className="button secondary-button"
              onClick={toggleAllReceipts}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d={expandedReceipts.length === filteredAndSortedReceipts.length ? "M19 13H5v-2h14v2z" : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"} />
              </svg>
              {expandedReceipts.length === filteredAndSortedReceipts.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          {filteredAndSortedReceipts.map((receipt) => (
            <div key={receipt.id} className="saved-receipt">
              <div className="receipt-header">
                <h3>{receipt.merchant} - {new Date(receipt.date).toLocaleDateString()}</h3>
                <div className="icon-actions">
                  <button
                    className="icon-button expand-icon"
                    onClick={() => toggleReceiptExpansion(receipt.id)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d={expandedReceipts.includes(receipt.id) ? "M19 13H5v-2h14v2z" : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"} />
                    </svg>
                  </button>
                  {receipt.receipt_url && (
                    <a
                      href={receipt.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-button preview-icon"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </a>
                  )}
                  <button
                    className="icon-button edit-icon"
                    onClick={() => handleEditClick(receipt.id)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    className="icon-button delete-icon"
                    onClick={() => handleDeleteClick(receipt.id)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p>Total: ${receipt.total_amount.toFixed(2)}</p>

              {expandedReceipts.includes(receipt.id) && (
                <div className="receipt-details">
                  <div className="details-header">
                    <span>Item</span>
                    <span>Type</span>
                    <span>Category</span>
                    <span>Amount</span>
                  </div>
                  {/* Render filtered items */}
                  {receipt.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="receipt-item">
                      <span>{item.item}</span>
                      <span>{item.type}</span>
                      <span>{item.category}</span>
                      <span>${parseFloat(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  {receipt.notes && (
                    <div className="receipt-notes">
                      <strong>Notes:</strong> {receipt.notes}
                    </div>
                  )}
                </div>
              )}

              {receipt.receipt_url && (
                <div className="receipt-preview">
                  <a
                    href={receipt.receipt_url}
                    download={`receipt_${receipt.id}.png`}
                    className="download-link"
                  >
                    Download Receipt
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-receipts">
          <p>No receipts found matching your criteria.</p>
        </div>
      )}

      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Receipt</h2>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={editFormData.date}
                onChange={handleEditFormChange}
                className={editFormErrors.date ? 'error' : ''}
              />
              {editFormErrors.date && <div className="error-message">{editFormErrors.date}</div>}
            </div>

            <div className="form-group">
              <label>Merchant</label>
              <input
                type="text"
                name="merchant"
                value={editFormData.merchant}
                onChange={handleEditFormChange}
                className={editFormErrors.merchant ? 'error' : ''}
              />
              {editFormErrors.merchant && <div className="error-message">{editFormErrors.merchant}</div>}
            </div>

            {editFormData.items.map((item, index) => (
              <div key={index} className="item-container">
                <div className="item-group">
                  <div className="form-group">
                    <label>Item</label>
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => handleEditItemChange(index, 'item', e.target.value)}
                      className={editFormErrors.items?.[index]?.item ? 'error' : ''}
                    />
                    {editFormErrors.items?.[index]?.item && (
                      <div className="error-message">{editFormErrors.items[index].item}</div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => handleEditItemChange(index, 'type', e.target.value)}
                        className={editFormErrors.items?.[index]?.type ? 'error' : ''}
                      >
                        <option value="">Select type</option>
                        {types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {editFormErrors.items?.[index]?.type && (
                        <div className="error-message">{editFormErrors.items[index].type}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => handleEditItemChange(index, 'category', e.target.value)}
                        className={editFormErrors.items?.[index]?.category ? 'error' : ''}
                        disabled={!item.type}
                      >
                        <option value="">Select category</option>
                        {getCategoriesForType(item.type).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {editFormErrors.items?.[index]?.category && (
                        <div className="error-message">{editFormErrors.items[index].category}</div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleEditItemChange(index, 'amount', e.target.value)}
                      className={editFormErrors.items?.[index]?.amount ? 'error' : ''}
                      min="0.01"
                      step="0.01"
                    />
                    {editFormErrors.items?.[index]?.amount && (
                      <div className="error-message">{editFormErrors.items[index].amount}</div>
                    )}
                  </div>
                </div>
                {editFormData.items.length > 1 && (
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveEditItem(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button className="button" onClick={handleAddEditItem}>Add Another Item</button>

            <div className="notes-section">
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={editFormData.notes}
                  onChange={handleEditFormChange}
                  rows="4"
                  className="notes-field"
                />
              </div>
            </div>

            <div
              className={`receipt-upload ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleEditDragOver}
              onDragLeave={handleEditDragLeave}
              onDrop={handleEditDrop}
            >
              <input
                type="file"
                id="edit-receipt"
                style={{ display: 'none' }}
                onChange={handleEditFileInput}
                accept="image/*"
              />
              <label htmlFor="edit-receipt">
                {editFormData.newReceiptImage ? `Uploaded: ${editFormData.newReceiptImage.name}` : (editFormData.receipt_url ? 'Drag & Drop or Click to Upload New Receipt Image' : 'Drag & Drop or Click to Upload Receipt Image')}
              </label>
            </div>
             {editFormData.receipt_url && !editFormData.newReceiptImage && (
                <div className="current-receipt-image-preview">
                    <p>Current Image:</p>
                    <a href={editFormData.receipt_url} target="_blank" rel="noopener noreferrer">View Current Image</a>
                </div>
             )}


            <div className="total-amount">
              Total Amount: ${editTotalAmount.toFixed(2)}
            </div>

            <div className="form-actions">
              <button className="button primary-button" onClick={handleUpdateReceipt}>
                Update Receipt
              </button>
              <button className="button cancel-button" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceiptHistory
