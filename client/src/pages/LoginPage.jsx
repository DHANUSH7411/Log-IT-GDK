import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to log in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@moviebox.local');
    setPassword('password123');
  };

  return (
    <div className="container py-5 d-flex align-items-center justify-content-center min-vh-75">
      <div className="w-100" style={{ maxWidth: '440px' }}>
        <div className="text-center mb-4">
          <div className="mb-3">
            <BrandLogo size="lg" />
          </div>
          <h2 className="fw-bold text-white mb-1">Welcome Back</h2>
          <p className="text-secondary small">Log in to sync your personal tracker, ratings, and reviews.</p>
        </div>

        <div className="p-4 rounded-4 border border-secondary border-opacity-25" style={{ backgroundColor: '#16171d' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 small mb-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-light small fw-semibold">Email Address</label>
              <input
                type="email"
                className="form-control bg-dark text-white border-secondary"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label text-light small fw-semibold">Password</label>
              <input
                type="password"
                className="form-control bg-dark text-white border-secondary"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-moviebox w-100 py-2 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-bold"
              disabled={submitting}
            >
              <LogIn size={18} />
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Account Autofill */}
          <div className="mt-3 pt-3 border-top border-secondary border-opacity-25 text-center">
            <button
              type="button"
              onClick={handleDemoFill}
              className="btn btn-sm btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2 rounded-pill"
            >
              <Sparkles size={14} />
              <span>Use Seeded Demo Account</span>
            </button>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
              Prefills: demo@moviebox.local / password123
            </div>
          </div>
        </div>

        <div className="text-center mt-3 text-secondary small">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-danger fw-semibold text-decoration-none">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
