import React, { useState } from 'react';
import { AlertCircle, Key, CheckCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConfigBanner() {
  const { systemHealth } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!systemHealth) return null;

  const tmdbMissing = systemHealth.tmdb && !systemHealth.tmdb.configured;
  const dbOffline = systemHealth.database && !systemHealth.database.connected;

  if (!tmdbMissing && !dbOffline) return null;

  const copyPath = () => {
    navigator.clipboard.writeText('server/.env');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-dark border-bottom border-danger border-opacity-50 text-white px-3 py-2 small">
      <div className="container d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <span>
            {tmdbMissing && (
              <span>
                <strong>TMDB API key not configured:</strong> Live discovery requires a free API key from themoviedb.org.
              </span>
            )}
            {dbOffline && (
              <span className="ms-2 text-warning">
                <strong>MySQL database offline:</strong> Check server connection.
              </span>
            )}
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-sm btn-outline-light d-inline-flex align-items-center gap-1 py-0 px-2 text-nowrap align-self-start align-self-md-auto"
          style={{ fontSize: '12px' }}
        >
          {expanded ? 'Hide Setup Guide' : 'Setup Instructions'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="container mt-3 pt-3 border-top border-secondary border-opacity-25">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <h6 className="text-white fw-bold d-flex align-items-center gap-2 mb-2">
                <Key size={15} className="text-danger" /> How to get a free TMDB API Key:
              </h6>
              <ol className="text-secondary ps-3 mb-0" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <li>Visit <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer" className="text-danger text-decoration-underline">themoviedb.org</a> and create a free account.</li>
                <li>Go to <strong>Settings &rarr; API &rarr; Request an API Key</strong> (Developer).</li>
                <li>Copy your <strong>API Key (v3 auth)</strong>.</li>
                <li>Open <code>server/.env</code> and set: <code>TMDB_API_KEY=your_key_here</code>.</li>
                <li>Restart the server or save to activate live catalogue browsing!</li>
              </ol>
            </div>
            <div className="col-12 col-md-6">
              <h6 className="text-white fw-bold mb-2">Local Status Check:</h6>
              <ul className="list-unstyled text-secondary mb-0" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <li className="d-flex align-items-center gap-2">
                  <span className={`badge ${systemHealth.database?.connected ? 'bg-success' : 'bg-danger'}`}>
                    MySQL
                  </span>
                  <span>{systemHealth.database?.connected ? `Connected (port ${systemHealth.database?.port})` : 'Disconnected'}</span>
                </li>
                <li className="d-flex align-items-center gap-2 mt-2">
                  <span className={`badge ${systemHealth.tmdb?.configured ? 'bg-success' : 'bg-warning text-dark'}`}>
                    TMDB
                  </span>
                  <span>{systemHealth.tmdb?.configured ? 'Configured & Active' : 'API Key missing'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
