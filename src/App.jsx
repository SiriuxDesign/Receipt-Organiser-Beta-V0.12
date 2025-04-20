import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ReceiptForm from './ReceiptForm'
import ReceiptHistory from './ReceiptHistory'
import Auth from './Auth'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [receipts, setReceipts] = useState([]) // Use state for receipts fetched from Supabase

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      console.log('Initial session check:', session); // Add logging
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      console.log('Auth state changed:', _event, session); // Add logging
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      console.log('Session exists, fetching receipts...'); // Add logging
      fetchReceipts()
    } else {
      console.log('No session, clearing receipts.'); // Add logging
      setReceipts([]) // Clear receipts if user logs out
    }
  }, [session])

  const fetchReceipts = async () => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('date', { ascending: false }); // Order by date descending by default

    if (error) {
      console.error('Error fetching receipts:', error.message);
    } else {
      setReceipts(data);
    }
  };


  const addReceipt = async (newReceipt) => {
    const { data, error } = await supabase
      .from('receipts')
      .insert([newReceipt])
      .select(); // Select the inserted row to get its ID and updated_at

    if (error) {
      console.error('Error adding receipt:', error.message);
    } else if (data && data.length > 0) {
      setReceipts((prevReceipts) => [data[0], ...prevReceipts]); // Add the new receipt to the state
    }
  }

  const updateReceipt = async (id, updatedReceipt) => {
     const { error } = await supabase
      .from('receipts')
      .update(updatedReceipt)
      .eq('id', id); // Update based on the receipt's ID

    if (error) {
      console.error('Error updating receipt:', error.message);
    } else {
      // Refetch receipts or update state locally
      fetchReceipts(); // Simple approach: refetch all
      // More complex: update state locally if you have the updated data
      // setReceipts(prevReceipts => prevReceipts.map(r => r.id === id ? { ...r, ...updatedReceipt } : r));
    }
  }

  const deleteReceipt = async (id) => {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id); // Delete based on the receipt's ID

    if (error) {
      console.error('Error deleting receipt:', error.message);
    } else {
      setReceipts((prevReceipts) => prevReceipts.filter((receipt) => receipt.id !== id)); // Remove from state
    }
  }

  return (
    <Router>
      <div className="container">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/update-password" element={<Auth />} /> {/* Route for password reset */}
          <Route
            path="/"
            element={
              session ? (
                <ReceiptForm
                  receipts={receipts}
                  addReceipt={addReceipt}
                  updateReceipt={updateReceipt}
                  deleteReceipt={deleteReceipt}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/history"
            element={
              session ? (
                <ReceiptHistory
                  receipts={receipts}
                  updateReceipt={updateReceipt}
                  deleteReceipt={deleteReceipt}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
           {/* Redirect any other path to home or auth */}
          <Route path="*" element={<Navigate to={session ? "/" : "/auth"} replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
