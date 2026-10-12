import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, PlayCircle, Clock, XCircle, Star, Tv, Film, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      setLoading(true);
      try {
        const [statsRes, recRes] = await Promise.allSettled([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recommendations')
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }

        if (recRes.status === 'fulfilled') {
          setRecommendations(recRes.value.data?.recommendations || []);
          setBasedOn(recRes.value.data?.based_on || []);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  if (!user) {
    return (
      <div className="container py-5 text-center min-vh-75 d-flex flex-column align-items-center justify-content-center">
        <LayoutDashboard size={48} className="text-danger mb-3" />
        <h3 className="fw-bold text-white mb-2">Sign in to Access Your Dashboard</h3>
        <p className="text-secondary mb-4">View your personal tracking statistics and tailored title recommendations.</p>
        <Link to="/login" className="btn btn-moviebox rounded-pill px-4">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container text-center py-5 min-vh-75 d-flex flex-column align-items-center justify-content-center">
        <Loader2 size={36} className="text-danger spin mb-3" />
        <p className="text-secondary small">Calculating your personal statistics...</p>
      </div>
    );
  }

  const s = stats || {};
  const totalTracked = s.total_tracked || 0;

  return (
    <div className="container py-4 min-vh-100">
      <div className="mb-4">
        <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
          <LayoutDashboard size={26} className="text-danger" /> Personal Tracker Dashboard
        </h2>
        <p className="text-secondary small mb-0">
          Viewing entertainment metrics and viewing progress for {user.name}
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary small fw-semibold">Tracked Titles</span>
              <Film size={16} className="text-primary" />
            </div>
            <h3 className="fw-bold text-white mb-0">{totalTracked}</h3>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {s.movies_count || 0} movies &bull; {s.series_count || 0} series
            </span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary small fw-semibold">Completed</span>
              <CheckCircle2 size={16} className="text-success" />
            </div>
            <h3 className="fw-bold text-white mb-0">{s.completed || 0}</h3>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {totalTracked > 0 ? Math.round(((s.completed || 0) / totalTracked) * 100) : 0}% completion rate
            </span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary small fw-semibold">Episodes Watched</span>
              <Tv size={16} className="text-warning" />
            </div>
            <h3 className="fw-bold text-white mb-0">{s.total_episodes_watched || 0}</h3>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Across all logged seasons
            </span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary small fw-semibold">Average Rating</span>
              <Star size={16} className="text-danger" />
            </div>
            <h3 className="fw-bold text-white mb-0">{s.average_user_rating > 0 ? s.average_user_rating : '—'}</h3>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              From {s.total_ratings || 0} rated titles
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Row */}
      <div className="row g-4 mb-5">
        {/* Tracker Status Breakdown */}
        <div className="col-12 col-md-6">
          <div className="p-4 rounded-4 border border-secondary border-opacity-25 h-100" style={{ backgroundColor: '#14151b' }}>
            <h5 className="fw-bold text-white mb-3">Viewing Status Breakdown</h5>
            {totalTracked > 0 ? (
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span className="d-flex align-items-center gap-1 text-primary">
                      <Clock size={14} /> Plan to Watch
                    </span>
                    <span className="text-white fw-bold">{s.plan_to_watch || 0}</span>
                  </div>
                  <div className="progress bg-dark" style={{ height: '8px' }}>
                    <div className="progress-bar bg-primary" style={{ width: `${Math.round(((s.plan_to_watch || 0) / totalTracked) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span className="d-flex align-items-center gap-1 text-warning">
                      <PlayCircle size={14} /> Currently Watching
                    </span>
                    <span className="text-white fw-bold">{s.watching || 0}</span>
                  </div>
                  <div className="progress bg-dark" style={{ height: '8px' }}>
                    <div className="progress-bar bg-warning" style={{ width: `${Math.round(((s.watching || 0) / totalTracked) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span className="d-flex align-items-center gap-1 text-success">
                      <CheckCircle2 size={14} /> Completed
                    </span>
                    <span className="text-white fw-bold">{s.completed || 0}</span>
                  </div>
                  <div className="progress bg-dark" style={{ height: '8px' }}>
                    <div className="progress-bar bg-success" style={{ width: `${Math.round(((s.completed || 0) / totalTracked) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span className="d-flex align-items-center gap-1 text-danger">
                      <XCircle size={14} /> Dropped
                    </span>
                    <span className="text-white fw-bold">{s.dropped || 0}</span>
                  </div>
                  <div className="progress bg-dark" style={{ height: '8px' }}>
                    <div className="progress-bar bg-danger" style={{ width: `${Math.round(((s.dropped || 0) / totalTracked) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted small py-4 text-center">
                No titles in tracker yet. Start adding titles to generate your status breakdown.
              </p>
            )}
          </div>
        </div>

        {/* Top Tracked Genres */}
        <div className="col-12 col-md-6">
          <div className="p-4 rounded-4 border border-secondary border-opacity-25 h-100" style={{ backgroundColor: '#14151b' }}>
            <h5 className="fw-bold text-white mb-3">Top Favorite Genres</h5>
            {s.genre_distribution && s.genre_distribution.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {s.genre_distribution.map((item, idx) => (
                  <div key={item.genre}>
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span className="text-white fw-semibold">{item.genre}</span>
                      <span className="text-muted">{item.count} {item.count === 1 ? 'title' : 'titles'}</span>
                    </div>
                    <div className="progress bg-dark" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{ width: `${Math.min(100, Math.round((item.count / totalTracked) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted small py-4 text-center">
                Track titles to reveal your genre preferences.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Personalized Recommendations Section */}
      <div className="pt-4 border-top border-secondary border-opacity-25">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h4 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <Sparkles size={20} className="text-danger" /> Personalized Recommendations
            </h4>
            <p className="text-secondary small mb-0">
              {basedOn.length > 0
                ? `Algorithmic suggestions based on: ${basedOn.join(', ')}`
                : 'Recommendations calculated from your rated titles'}
            </p>
          </div>
          <Link to="/explore" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 hover-white">
            Explore All <ArrowRight size={14} />
          </Link>
        </div>

        {recommendations.length > 0 ? (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
            {recommendations.map((item) => (
              <div className="col" key={`${item.media_type}_${item.tmdb_id}`}>
                <MovieCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-dark border-secondary p-4 rounded-3 text-center text-secondary small">
            Rate titles with 4 or 5 stars to unlock tailored suggestions that exclude titles already in your list.
          </div>
        )}
      </div>
    </div>
  );
}
