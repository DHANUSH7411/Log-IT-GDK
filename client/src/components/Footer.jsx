import React from 'react';
import { Film, Heart, ShieldCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="mt-auto py-5 border-top border-secondary border-opacity-25" style={{ backgroundColor: '#0a0b0d' }}>
      <div className="container">
        <div className="row gy-4 align-items-center">
          <div className="col-12 col-md-6">
            <div className="mb-3">
              <BrandLogo size="md" />
            </div>
            <p className="text-secondary small mb-2" style={{ maxWidth: '420px' }}>
              A cinematic discovery and personal tracking platform for cinephiles. Track movies and TV series, log episode progress, write community reviews, and explore real TMDB catalogues.
            </p>
            <div className="text-muted small">
              Log IT! &copy; {new Date().getFullYear()} &bull; Created by GDK &bull; Built with React, Express &amp; MySQL.
            </div>
          </div>

          <div className="col-12 col-md-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Quick Navigation</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><Link to="/" className="text-secondary text-decoration-none hover-white">Home Discovery</Link></li>
              <li><Link to="/movies" className="text-secondary text-decoration-none hover-white">Browse Movies</Link></li>
              <li><Link to="/series" className="text-secondary text-decoration-none hover-white">TV Series &amp; Episodes</Link></li>
              <li><Link to="/explore" className="text-secondary text-decoration-none hover-white">Explore Catalogue</Link></li>
              <li><Link to="/my-list" className="text-secondary text-decoration-none hover-white">Personal Tracker</Link></li>
            </ul>
          </div>

          <div className="col-12 col-md-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Data &amp; Integrity</h6>
            <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 small text-secondary">
              <div className="d-flex align-items-center gap-2 text-light fw-semibold mb-1">
                <Database size={14} className="text-danger" />
                <span>TMDB Powered</span>
              </div>
              <div>This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
