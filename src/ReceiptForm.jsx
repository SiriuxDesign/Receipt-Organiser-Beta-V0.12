import React, { useState, useCallback, useEffect } from 'react'
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

function ReceiptForm({ receipts, addReceipt, updateReceipt, deleteReceipt }) {
  const [date, setDate] = useState('')
  const [merchant, setMerchant] = useState('')
  const [items, setItems] = useState([{ item: '', category: '', type: '', amount: '' }])
  const [notes, setNotes] = useState('')
  const [receiptImage, setReceiptImage] = useState(null) // Store file object or base64
  const [editingReceiptId, setEditingReceiptId] = useState(null) // Use ID for editing
  const [isDragging, setIsDragging] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [expandedReceipts, setExpandedReceipts] = useState([])

  useEffect(() => {
    // Reset expanded state when receipts change (e.g., after add/update/delete)
    setExpandedReceipts([])
  }, [receipts])

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
    const latestReceipts = receipts.slice(-3)
    const latestIds = latestReceipts.map(r => r.id)

    if (expandedReceipts.length === latestReceipts.length) {
      setExpandedReceipts([])
    } else {
      setExpandedReceipts(latestIds)
    }
  }

  const validateForm = () => {
    const errors = {}
    let isValid = true

    if (!date) {
      errors.date = 'Date is required'
      isValid = false
    }

    if (!merchant.trim()) {
      errors.merchant = 'Merchant is required'
      isValid = false
    }

    const itemErrors = items.map(item => {
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

    setFormErrors(errors)
    return isValid
  }

  const handleAddItem = () => {
    setItems([...items, { item: '', category: '', type: '', amount: '' }])
  }

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(newItems)

      if (formErrors.items) {
        const newItemErrors = [...formErrors.items]
        newItemErrors.splice(index, 1)
        setFormErrors({
          ...formErrors,
          items: newItemErrors.length > 0 ? newItemErrors : undefined
        })
      }
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value

    if (field === 'type') {
      newItems[index].category = ''
    }

    setItems(newItems)

    if (formErrors.items?.[index]?.[field]) {
      const newItemErrors = [...formErrors.items]
      delete newItemErrors[index][field]
      if (Object.keys(newItemErrors[index]).length === 0) {
        newItemErrors[index] = undefined
      }
      setFormErrors({
        ...formErrors,
        items: newItemErrors.some(e => e) ? newItemErrors : undefined
      })
    }
  }

  const handleFileChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      setReceiptImage(file) // Store the file object
    } else {
      setReceiptImage(null)
    }
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file)
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    handleFileChange(file)
  }

  const handleAddOrUpdateReceipt = async () => {
    if (!validateForm()) {
      return
    }

    let receiptImageUrl = null;
    if (receiptImage) {
      const fileExt = receiptImage.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${supabase.auth.user().id}/${fileName}`; // Store under user ID

      const { data, error } = await supabase.storage
        .from('receipt-images') // Create a bucket named 'receipt-images' in Supabase Storage
        .upload(filePath, receiptImage);

      if (error) {
        console.error('Error uploading receipt image:', error.message);
        // Handle error, maybe don't proceed with saving the receipt
        return;
      }
      // Get the public URL of the uploaded image
      const { publicUrl } = supabase.storage.from('receipt-images').getPublicUrl(filePath).data;
      receiptImageUrl = publicUrl;
    } else if (editingReceiptId) {
       // If editing and no new file is uploaded, keep the existing image URL
       const existingReceipt = receipts.find(r => r.id === editingReceiptId);
       receiptImageUrl = existingReceipt ? existingReceipt.receipt_url : null;
    }


    const receiptData = {
      date,
      merchant,
      items: items.map(item => ({
        item: item.item,
        category: item.category,
        type: item.type,
        amount: parseFloat(item.amount) || 0
      })),
      notes,
      receipt_url: receiptImageUrl, // Store the image URL
      total_amount: totalAmount // Use total_amount to match DB schema
    }

    if (editingReceiptId !== null) {
      // Update existing receipt
      await updateReceipt(editingReceiptId, receiptData)
    } else {
      // Add new receipt
      await addReceipt(receiptData)
    }

    resetForm()
  }

  const handleEditReceipt = (id) => {
    const receiptToEdit = receipts.find(r => r.id === id)
    if (receiptToEdit) {
      setDate(receiptToEdit.date)
      setMerchant(receiptToEdit.merchant)
      setItems(receiptToEdit.items.map(item => ({ ...item, amount: String(item.amount) }))) // Convert amount to string for editing
      setNotes(receiptToEdit.notes)
      // We don't load the image file back into the input, just store the URL
      // setReceiptImage(null); // Clear file input
      setEditingReceiptId(id)
      setFormErrors({})
    }
  }

  const handleDeleteReceipt = async (id) => {
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

  const handleCancelEdit = () => {
    resetForm()
    setEditingReceiptId(null)
  }

  const resetForm = () => {
    setDate('')
    setMerchant('')
    setItems([{ item: '', category: '', type: '', amount: '' }])
    setNotes('')
    setReceiptImage(null) // Clear the file object
    setFormErrors({})
    setEditingReceiptId(null)
  }

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  const latestReceipts = receipts.slice(0, 3); // Get the 3 latest receipts (assuming receipts are sorted by date desc)


  return (
    <div>
      <div className="header-actions">
         <button className="button secondary-button" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        <Link to="/history" className="history-button">
          View Receipt History
        </Link>
      </div>

      <h1>Receipt Organiser</h1>

      <div className="form-section"> {/* Added wrapper for spacing */}
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              if (formErrors.date) {
                setFormErrors({...formErrors, date: undefined})
              }
            }}
            className={formErrors.date ? 'error' : ''}
          />
          {formErrors.date && <div className="error-message">{formErrors.date}</div>}
        </div>

        <div className="form-group">
          <label>Merchant</label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => {
              setMerchant(e.target.value)
              if (formErrors.merchant) {
                setFormErrors({...formErrors, merchant: undefined})
              }
            }}
            className={formErrors.merchant ? 'error' : ''}
          />
          {formErrors.merchant && <div className="error-message">{formErrors.merchant}</div>}
        </div>

        {items.map((item, index) => (
          <div key={index} className="item-container">
            <div className="item-group">
              <div className="form-group">
                <label>Item</label>
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                  className={formErrors.items?.[index]?.item ? 'error' : ''}
                />
                {formErrors.items?.[index]?.item && (
                  <div className="error-message">{formErrors.items[index].item}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={item.type}
                    onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                    className={formErrors.items?.[index]?.type ? 'error' : ''}
                  >
                    <option value="">Select type</option>
                    {types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {formErrors.items?.[index]?.type && (
                    <div className="error-message">{formErrors.items[index].type}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className={formErrors.items?.[index]?.category ? 'error' : ''}
                    disabled={!item.type}
                  >
                    <option value="">Select category</option>
                    {getCategoriesForType(item.type).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.items?.[index]?.category && (
                    <div className="error-message">{formErrors.items[index].category}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                  className={formErrors.items?.[index]?.amount ? 'error' : ''}
                  min="0.01"
                  step="0.01"
                />
                {formErrors.items?.[index]?.amount && (
                  <div className="error-message">{formErrors.items[index].amount}</div>
                )}
              </div>
            </div>
            {items.length > 1 && (
              <button
                className="remove-button"
                onClick={() => handleRemoveItem(index)}
              >
                ×
              </button>
            )}
          </div>
        ))}

        <div className="add-item-button-container"> {/* Added wrapper for positioning */}
          <button className="button" onClick={handleAddItem}>Add Another Item</button>
        </div>

        <div className="notes-section">
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="4"
              className="notes-field"
            />
          </div>
        </div>

        <div
          className={`receipt-upload ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="receipt"
            style={{ display: 'none' }}
            onChange={handleFileInput}
            accept="image/*"
          />
          <label htmlFor="receipt">
            {receiptImage ? `Uploaded: ${receiptImage.name}` : (editingReceiptId ? 'Drag & Drop or Click to Upload New Receipt Image' : 'Drag & Drop or Click to Upload Receipt Image')}
          </label>
        </div>
         {editingReceiptId && receipts.find(r => r.id === editingReceiptId)?.receipt_url && !receiptImage && (
            <div className="current-receipt-image-preview">
                <p>Current Image:</p>
                <a href={receipts.find(r => r.id === editingReceiptId).receipt_url} target="_blank" rel="noopener noreferrer">View Current Image</a>
            </div>
         )}


        <div className="total-amount">
          Total Amount: ${totalAmount.toFixed(2)}
        </div>

        <div className="form-actions">
          <button className="button primary-button" onClick={handleAddOrUpdateReceipt}>
            {editingReceiptId !== null ? 'Update Receipt' : 'Add Receipt'}
          </button>
          {editingReceiptId !== null && (
            <button className="button cancel-button" onClick={handleCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </div> {/* End of form-section wrapper */}

      {latestReceipts.length > 0 && (
        <div className="receipts-list">
          <div className="receipts-header">
            <h2>Latest Saved Receipts</h2>
            <div className="header-buttons">
              <button
                className="button secondary-button"
                onClick={toggleAllReceipts}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d={expandedReceipts.length === latestReceipts.length ? "M19 13H5v-2h14v2z" : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"} />
                </svg>
                {expandedReceipts.length === latestReceipts.length ? 'Collapse All' : 'Expand All'}
              </button>
              <Link to="/history" className="button secondary-button">
                View Receipt History
              </Link>
            </div>
          </div>
          {latestReceipts.map((receipt) => {
            return (
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
                    onClick={() => handleEditReceipt(receipt.id)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    className="icon-button delete-icon"
                    onClick={() => handleDeleteReceipt(receipt.id)}
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
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ReceiptForm
