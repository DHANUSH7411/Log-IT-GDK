import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film, Tv, Compass, BookmarkCheck, LayoutDashboard, Search, LogIn, UserPlus, LogOut, User, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { user, logout, systemHealth } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark moviebox-navbar py-2 px-3 px-md-4">
      <div className="container-fluid p-0">
        <BrandLogo size="sm" className="navbar-brand me-4" />

        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#movieboxNavbarContent"
          aria-controls="movieboxNavbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="movieboxNavbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1 gap-md-2">
            <li className="nav-item">
              <Link className={`nav-link px-2 ${isActive('/') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link px-2 d-flex align-items-center gap-1 ${isActive('/movies') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/movies">
                <Film size={15} /> Movies
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link px-2 d-flex align-items-center gap-1 ${isActive('/series') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/series">
                <Tv size={15} /> Series
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link px-2 d-flex align-items-center gap-1 ${isActive('/explore') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/explore">
                <Compass size={15} /> Explore
              </Link>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link px-2 d-flex align-items-center gap-1 ${isActive('/my-list') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/my-list">
                    <BookmarkCheck size={15} /> My List
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link px-2 d-flex align-items-center gap-1 ${isActive('/dashboard') ? 'text-white fw-bold active' : 'text-secondary'}`} to="/dashboard">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="d-flex position-relative">
              <input
                type="search"
                className="form-control form-control-sm bg-dark text-white border-secondary pe-4"
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '180px', borderRadius: '20px', borderColor: '#333' }}
              />
              <button type="submit" className="btn btn-sm text-secondary position-absolute end-0 top-50 translate-middle-y pe-2 border-0 bg-transparent">
                <Search size={14} />
              </button>
            </form>

            {/* Auth actions */}
            {user ? (
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center gap-1 text-light bg-secondary bg-opacity-25 py-1 px-2 rounded-pill small">
                  <User size={14} className="text-danger" />
                  <span className="fw-semibold">{user.name}</span>
                </div>
                <button onClick={logout} className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-pill px-3" title="Log out">
                  <LogOut size={14} />
                  <span className="d-none d-md-inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-sm btn-outline-light d-flex align-items-center gap-1 rounded-pill px-3">
                  <LogIn size={14} />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn btn-sm btn-moviebox d-flex align-items-center gap-1 rounded-pill px-3">
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
