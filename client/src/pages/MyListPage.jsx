import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, Film, Tv, Star, Trash2, Plus, Minus, Check, Clock, Filter, Sparkles, Loader2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MyListPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMediaType, setSelectedMediaType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTrackerEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tracker', {
        params: {
          status: selectedStatus,
          media_type: selectedMediaType,
          sort_by: sortBy === 'rating' ? 'rating_desc' : sortBy === 'name' ? 'name_asc' : 'recent'
        }
      });
      setEntries(res.data);
    } catch (err) {
      console.error('Error fetching tracker entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrackerEntries();
    }
  }, [user, selectedStatus, selectedMediaType, sortBy]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/tracker/${id}/status`, { status: newStatus });
      setEntries(prev => prev.map(e => e.id === id ? res.data : e));
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProgressChange = async (id, delta) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/tracker/${id}/progress`, { delta });
      setEntries(prev => prev.map(e => e.id === id ? res.data : e));
    } catch (err) {
      alert(err.message || 'Failed to update progress');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (id, titleName) => {
    if (!window.confirm(`Remove "${titleName}" from your tracker?`)) return;
    try {
      await api.delete(`/tracker/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to remove title');
    }
  };

  if (!user) {
    return (
      <div className="container py-5 text-center min-vh-75 d-flex flex-column align-items-center justify-content-center">
        <BookmarkCheck size={48} className="text-danger mb-3" />
        <h3 className="fw-bold text-white mb-2">Sign in to Access Your Tracker</h3>
        <p className="text-secondary mb-4" style={{ maxWidth: '400px' }}>
          Create a free account to track movies and TV series, log episode progress, and view personal statistics.
        </p>
        <Link to="/login" className="btn btn-moviebox rounded-pill px-4">
          Log In or Register
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4 min-vh-100">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
            <BookmarkCheck size={26} className="text-danger" /> My Tracker List
          </h2>
          <p className="text-secondary small mb-0">
            Managing {entries.length} tracked {entries.length === 1 ? 'title' : 'titles'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="d-flex gap-2 flex-wrap">
          <select
            className="form-select form-select-sm bg-dark text-white border-secondary"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All Statuses</option>
            <option value="watching">Watching</option>
            <option value="plan_to_watch">Plan to Watch</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <select
            className="form-select form-select-sm bg-dark text-white border-secondary"
            value={selectedMediaType}
            onChange={(e) => setSelectedMediaType(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="all">All Media</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Series</option>
          </select>

          <select
            className="form-select form-select-sm bg-dark text-white border-secondary"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="recent">Recently Updated</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Loader2 size={36} className="text-danger spin mb-3" />
          <p className="text-secondary small">Loading your tracker entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-5 my-5 border border-secondary border-opacity-25 rounded-4 p-5" style={{ backgroundColor: '#14151b' }}>
          <Sparkles size={40} className="text-secondary mb-3" />
          <h4 className="fw-bold text-white mb-1">Your Tracker is Empty</h4>
          <p className="text-secondary small mb-3">
            Explore movies and series from the catalogue and click "Add to List" to start tracking.
          </p>
          <Link to="/explore" className="btn btn-moviebox rounded-pill px-4">
            Explore Titles
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {entries.map((entry) => {
            const t = entry.title;
            const posterUrl = t.poster_path ? `https://image.tmdb.org/t/p/w200${t.poster_path}` : null;
            const totalEps = t.total_episodes;
            const watchedEps = entry.episodes_watched;
            const pct = totalEps && totalEps > 0 ? Math.min(100, Math.round((watchedEps / totalEps) * 100)) : 0;

            return (
              <div
                key={entry.id}
                className="p-3 rounded-3 border border-secondary border-opacity-25 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3"
                style={{ backgroundColor: '#14151b' }}
              >
                {/* Left: Poster + Info */}
                <div className="d-flex align-items-center gap-3">
                  <Link
                    to={`/title/${t.media_type}/${t.tmdb_id}`}
                    className="flex-shrink-0 rounded overflow-hidden"
                    style={{ width: '60px', height: '90px', backgroundColor: '#1e2029' }}
                  >
                    {posterUrl ? (
                      <img src={posterUrl} alt={t.name} className="w-100 h-100 object-fit-cover" />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center text-secondary">
                        {t.media_type === 'tv' ? <Tv size={20} /> : <Film size={20} />}
                      </div>
                    )}
                  </Link>

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="badge bg-secondary bg-opacity-50 text-white" style={{ fontSize: '10px' }}>
                        {t.media_type === 'tv' ? 'TV' : 'Movie'}
                      </span>
                      {entry.user_rating && (
                        <span className="badge bg-danger bg-opacity-25 text-danger d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                          <Star size={9} fill="#e50914" /> {entry.user_rating} / 5
                        </span>
                      )}
                    </div>

                    <Link to={`/title/${t.media_type}/${t.tmdb_id}`} className="text-decoration-none text-white">
                      <h6 className="fw-bold mb-1 hover-danger">{t.name}</h6>
                    </Link>

                    <div className="text-secondary small" style={{ fontSize: '12px' }}>
                      {t.genres || 'General'}
                    </div>
                  </div>
                </div>

                {/* Middle: Series Progress or Status */}
                <div className="d-flex flex-column align-items-md-center justify-content-center" style={{ minWidth: '220px' }}>
                  {t.media_type === 'tv' ? (
                    <div className="w-100">
                      <div className="d-flex justify-content-between align-items-center small mb-1">
                        <span className="text-secondary">Progress:</span>
                        <span className="fw-bold text-white">
                          {watchedEps} / {totalEps || '?'} eps ({pct}%)
                        </span>
                      </div>

                      <div className="progress bg-dark mb-2" style={{ height: '6px' }}>
                        <div className="progress-bar bg-danger" role="progressbar" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          onClick={() => handleProgressChange(entry.id, -1)}
                          disabled={updatingId === entry.id || watchedEps <= 0}
                          className="btn btn-sm btn-outline-secondary py-0 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: '11px' }}
                        >
                          <Minus size={11} /> -1 Ep
                        </button>
                        <button
                          onClick={() => handleProgressChange(entry.id, 1)}
                          disabled={updatingId === entry.id || (Boolean(totalEps) && watchedEps >= totalEps)}
                          className="btn btn-sm btn-outline-danger py-0 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: '11px' }}
                        >
                          <Plus size={11} /> +1 Ep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted small">
                      Feature Film
                    </div>
                  )}
                </div>

                {/* Right: Status selector + Remove */}
                <div className="d-flex align-items-center gap-3">
                  <select
                    className="form-select form-select-sm bg-dark text-white border-secondary"
                    value={entry.status}
                    onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                    disabled={updatingId === entry.id}
                    style={{ width: '130px' }}
                  >
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>

                  <button
                    onClick={() => handleRemove(entry.id, t.name)}
                    className="btn btn-sm btn-outline-secondary text-danger border-0 p-1"
                    title="Remove from tracker"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
