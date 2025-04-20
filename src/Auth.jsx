import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const navigate = useNavigate(); // Get the navigate function

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Logged in successfully!')
      navigate('/'); // Navigate to the home page on successful login
    }
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Registration successful! Check your email for confirmation.')
      setIsRegistering(false) // Switch back to login after registration attempt
    }
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password', // Redirect to a page where user can set new password
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset email sent. Check your inbox.')
      setIsForgotPassword(false) // Switch back to login
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated successfully!');
      // Optionally redirect to login page
      // window.location.href = '/'; // You might want to navigate to login or home here
    }
    setLoading(false);
  };


  if (window.location.pathname === '/update-password') {
      return (
          <div className="auth-container">
              <div className="auth-form">
                  <h2>Update Password</h2>
                  <form onSubmit={handleUpdatePassword}>
                      <div className="form-group">
                          <label htmlFor="password">New Password</label>
                          <input
                              type="password"
                              id="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                          />
                      </div>
                      <button type="submit" className="button primary-button" disabled={loading}>
                          {loading ? 'Updating...' : 'Update Password'}
                      </button>
                      {message && <p className="success-message">{message}</p>}
                      {error && <p className="error-message">{error}</p>}
                  </form>
              </div>
          </div>
      );
  }


  return (
    <div className="auth-container">
      <div className="auth-form">
        {isForgotPassword ? (
          <>
            <h2>Forgot Password</h2>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="button primary-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <p className="auth-switch" onClick={() => setIsForgotPassword(false)}>Back to Login</p>
            </form>
          </>
        ) : isRegistering ? (
          <>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="button primary-button" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <p className="auth-switch" onClick={() => setIsRegistering(false)}>Already have an account? Login</p>
            </form>
          </>
        ) : (
          <>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="button primary-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <p className="auth-switch" onClick={() => setIsRegistering(true)}>Don't have an account? Register</p>
              <p className="auth-switch" onClick={() => setIsForgotPassword(true)}>Forgot Password?</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default Auth
