import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import loginIllustration from '../assets/login-illustration.jpg';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleNonFunctional = (e: React.MouseEvent) => {
    e.preventDefault();
    // Non fonctionnel
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        {/* Left Section - Form */}
        <div className="login-form-section">
          <div className="login-tabs">
            <button className="tab active">Login</button>
            <button className="tab" onClick={handleNonFunctional}>Sign up</button>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="Email or phone number"
              />
            </div>
            
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Password"
              />
            </div>
            
            <div className="login-actions">
              <a href="#" className="forgot-password" onClick={handleNonFunctional}>Forgot your password?</a>
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? <span className="spinner"></span> : 'Login'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Section - Illustration */}
        <div className="login-illustration-section">
           <img src={loginIllustration} alt="Workspace Illustration" className="login-illustration" />
        </div>
      </div>
    </div>
  );
}
