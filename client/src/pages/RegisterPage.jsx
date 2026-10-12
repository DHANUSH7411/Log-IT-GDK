import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5 d-flex align-items-center justify-content-center min-vh-75">
      <div className="w-100" style={{ maxWidth: '440px' }}>
        <div className="text-center mb-4">
          <div className="mb-3">
            <BrandLogo size="lg" />
          </div>
          <h2 className="fw-bold text-white mb-1">Create an Account</h2>
          <p className="text-secondary small">Join Log IT! to track your movies &amp; series.</p>
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
              <label className="form-label text-light small fw-semibold">Your Name</label>
              <input
                type="text"
                className="form-control bg-dark text-white border-secondary"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-light small fw-semibold">Email Address</label>
              <input
                type="email"
                className="form-control bg-dark text-white border-secondary"
                placeholder="jane@example.com"
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-moviebox w-100 py-2 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-bold"
              disabled={submitting}
            >
              <UserPlus size={18} />
              <span>{submitting ? 'Creating Account...' : 'Register'}</span>
            </button>
          </form>
        </div>

        <div className="text-center mt-3 text-secondary small">
          Already have an account?{' '}
          <Link to="/login" className="text-danger fw-semibold text-decoration-none">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
