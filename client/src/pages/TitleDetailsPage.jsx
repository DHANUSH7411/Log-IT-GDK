import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Plus, Check, Play, Tv, Film, Clock, Calendar, Users, MessageSquare, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function TitleDetailsPage() {
  const { mediaType, id } = useParams();
  const { user } = useAuth();

  const [title, setTitle] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [trackerEntry, setTrackerEntry] = useState(null);

  // Forms
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [trackerStatus, setTrackerStatus] = useState('plan_to_watch');

  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTitleData() {
      setLoading(true);
      setError(null);
      try {
        const [detRes, simRes, commRes, revRes] = await Promise.allSettled([
          api.get(`/catalogue/details/${mediaType}/${id}`),
          api.get(`/catalogue/similar/${mediaType}/${id}`),
          api.get(`/ratings/community/${mediaType}/${id}`),
          api.get(`/reviews/${mediaType}/${id}`)
        ]);

        if (detRes.status === 'fulfilled') {
          setTitle(detRes.value.data);
        } else {
          setError(detRes.reason.message || 'Failed to load title details');
        }

        if (simRes.status === 'fulfilled' && simRes.value.data?.results) {
          setSimilar(simRes.value.data.results);
        }

        if (commRes.status === 'fulfilled') {
          setCommunityStats(commRes.value.data);
          if (commRes.value.data.user_rating) {
            setUserRating(commRes.value.data.user_rating);
          }
        }

        if (revRes.status === 'fulfilled') {
          setReviews(revRes.value.data || []);
        }

        // Fetch tracker entry if logged in
        if (user) {
          const trackRes = await api.get('/tracker');
          const entry = trackRes.data.find(
            t => t.title.tmdb_id === parseInt(id, 10) && t.title.media_type === mediaType
          );
          if (entry) {
            setTrackerEntry(entry);
            setTrackerStatus(entry.status);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTitleData();
    window.scrollTo(0, 0);
  }, [mediaType, id, user]);

  const handleStatusChange = async (newStatus) => {
    if (!user) {
      alert('Please log in to manage your tracker.');
      return;
    }

    try {
      if (trackerEntry) {
        const res = await api.patch(`/tracker/${trackerEntry.id}/status`, { status: newStatus });
        setTrackerEntry(res.data);
        setTrackerStatus(newStatus);
      } else {
        const res = await api.post('/tracker', {
          tmdb_id: title.tmdb_id,
          media_type: title.media_type,
          name: title.name,
          genres: title.genres,
          release_date: title.release_date,
          poster_path: title.poster_path,
          backdrop_path: title.backdrop_path,
          overview: title.overview,
          tmdb_rating: title.tmdb_rating,
          total_episodes: title.total_episodes,
          status: newStatus
        });
        setTrackerEntry(res.data);
        setTrackerStatus(newStatus);
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleEpisodeProgress = async (delta) => {
    if (!trackerEntry) return;
    try {
      const res = await api.patch(`/tracker/${trackerEntry.id}/progress`, { delta });
      setTrackerEntry(res.data);
      setTrackerStatus(res.data.status);
    } catch (err) {
      alert(err.message || 'Failed to update episode progress');
    }
  };

  const handleRate = async (star) => {
    if (!user) {
      alert('Please log in to submit a rating.');
      return;
    }
    setSubmittingRating(true);
    try {
      const res = await api.post('/ratings', {
        tmdb_id: title.tmdb_id,
        media_type: title.media_type,
        rating: star,
        title_payload: title
      });
      setUserRating(star);
      setCommunityStats(res.data.stats);
    } catch (err) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to write a review.');
      return;
    }
    if (!reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await api.post('/reviews', {
        tmdb_id: title.tmdb_id,
        media_type: title.media_type,
        comment: reviewComment,
        title_payload: title
      });
      setReviews(prev => [res.data, ...prev]);
      setReviewComment('');
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-5 min-vh-75 d-flex flex-column align-items-center justify-content-center">
        <Loader2 size={40} className="text-danger spin mb-3" />
        <h5 className="text-white">Loading Title Details...</h5>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-dark border-secondary p-4 rounded-4" style={{ backgroundColor: '#14151b' }}>
          <h4 className="text-white fw-bold mb-2">Error Loading Title</h4>
          <p className="text-secondary">{error || 'Title could not be found'}</p>
          <Link to="/" className="btn btn-moviebox rounded-pill px-4 mt-2">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const backdropUrl = title.backdrop_path ? `https://image.tmdb.org/t/p/original${title.backdrop_path}` : null;
  const posterUrl = title.poster_path ? `https://image.tmdb.org/t/p/w500${title.poster_path}` : null;

  return (
    <div className="min-vh-100 pb-5">
      {/* Backdrop Header */}
      <div
        className="position-relative"
        style={{
          minHeight: '50vh',
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundColor: '#12141a'
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'linear-gradient(180deg, rgba(15,16,20,0.4) 0%, rgba(15,16,20,0.9) 75%, #0f1014 100%)'
          }}
        />

        <div className="container position-relative pt-4" style={{ zIndex: 2 }}>
          <Link to={-1} className="btn btn-sm btn-outline-light rounded-pill px-3 d-inline-flex align-items-center gap-1 mb-4">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </div>

      {/* Main Info Box */}
      <div className="container position-relative" style={{ marginTop: '-180px', zIndex: 3 }}>
        <div className="row g-4">
          {/* Left Column: Portrait Poster */}
          <div className="col-12 col-md-4 col-lg-3">
            <div className="rounded-3 overflow-hidden shadow-lg border border-secondary border-opacity-50" style={{ backgroundColor: '#16171d', aspectRatio: '2/3' }}>
              {posterUrl ? (
                <img src={posterUrl} alt={title.name} className="w-100 h-100 object-fit-cover" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center text-secondary">
                  {title.media_type === 'tv' ? <Tv size={48} className="mb-2" /> : <Film size={48} className="mb-2" />}
                  <span>{title.name}</span>
                </div>
              )}
            </div>

            {/* Tracker Actions Box */}
            <div className="p-3 rounded-3 mt-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
              <label className="text-secondary small fw-semibold mb-2 d-block">
                Tracker Status {trackerEntry && <span className="text-success">&bull; Tracked</span>}
              </label>

              <select
                className="form-select form-select-sm bg-dark text-white border-secondary mb-3"
                value={trackerStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="plan_to_watch">Plan to Watch</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>

              {/* TV Series Episode Progress */}
              {title.media_type === 'tv' && trackerEntry && (
                <div className="border-top border-secondary border-opacity-25 pt-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-secondary">Episodes Watched:</span>
                    <span className="small fw-bold text-white">
                      {trackerEntry.episodes_watched} / {title.number_of_episodes || title.total_episodes || '—'}
                    </span>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      onClick={() => handleEpisodeProgress(-1)}
                      className="btn btn-sm btn-outline-secondary w-50 py-1"
                      disabled={trackerEntry.episodes_watched <= 0}
                    >
                      -1 Ep
                    </button>
                    <button
                      onClick={() => handleEpisodeProgress(1)}
                      className="btn btn-sm btn-moviebox w-50 py-1"
                      disabled={
                        Boolean(title.number_of_episodes && trackerEntry.episodes_watched >= title.number_of_episodes)
                      }
                    >
                      +1 Ep
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Title Info & Synopsis */}
          <div className="col-12 col-md-8 col-lg-9 text-white">
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span className="badge bg-danger text-uppercase fw-bold px-2 py-1" style={{ fontSize: '11px' }}>
                {title.media_type === 'tv' ? 'TV Series' : 'Movie'}
              </span>
              {title.release_date && (
                <span className="d-flex align-items-center gap-1 text-secondary small">
                  <Calendar size={13} /> {title.release_date}
                </span>
              )}
              {title.runtime && (
                <span className="d-flex align-items-center gap-1 text-secondary small">
                  <Clock size={13} /> {title.runtime} mins
                </span>
              )}
              {title.number_of_episodes && (
                <span className="d-flex align-items-center gap-1 text-secondary small">
                  <Tv size={13} /> {title.number_of_episodes} Episodes ({title.number_of_seasons} Seasons)
                </span>
              )}
            </div>

            <h1 className="fw-extrabold display-5 mb-2">{title.name}</h1>

            {title.tagline && (
              <p className="fst-italic text-secondary mb-3">"{title.tagline}"</p>
            )}

            {/* Ratings Bar: TMDB vs Community */}
            <div className="d-flex align-items-center gap-4 py-3 px-4 rounded-3 mb-4 flex-wrap border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
              {/* TMDB External Rating */}
              <div className="d-flex align-items-center gap-2">
                <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '42px', height: '42px', fontSize: '14px' }}>
                  {title.tmdb_rating}
                </div>
                <div>
                  <div className="small fw-bold text-white">TMDB Score</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>{title.vote_count || 0} votes</div>
                </div>
              </div>

              {/* Log IT! Community Rating */}
              <div className="d-flex align-items-center gap-2 ps-md-4 border-start border-secondary border-opacity-25">
                <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '42px', height: '42px', fontSize: '14px' }}>
                  {communityStats?.average > 0 ? communityStats.average : '—'}
                </div>
                <div>
                  <div className="small fw-bold text-white">Log IT! Score</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    {communityStats?.total_ratings || 0} user ratings
                  </div>
                </div>
              </div>

              {/* User Rating Selector */}
              <div className="ms-auto d-flex flex-column align-items-start align-items-md-end">
                <span className="text-secondary small mb-1">Your Rating:</span>
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="btn btn-sm p-0 border-0 bg-transparent"
                      title={`Rate ${star} star`}
                    >
                      <Star
                        size={22}
                        fill={(hoverRating || userRating) >= star ? '#e50914' : 'none'}
                        color={(hoverRating || userRating) >= star ? '#e50914' : '#6b7280'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            <div className="mb-4">
              <h5 className="fw-bold text-white mb-2">Synopsis</h5>
              <p className="text-light lead fs-6" style={{ lineHeight: '1.7' }}>
                {title.overview || 'No synopsis available for this title.'}
              </p>
            </div>

            {/* Genres */}
            {title.genres && (
              <div className="mb-4">
                <h6 className="text-secondary small fw-bold text-uppercase mb-2">Genres</h6>
                <div className="d-flex gap-2 flex-wrap">
                  {title.genres.split(',').map(g => (
                    <span key={g.trim()} className="badge bg-secondary bg-opacity-25 text-white px-3 py-2 rounded-pill">
                      {g.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cast preview */}
            {title.cast && title.cast.length > 0 && (
              <div className="mb-4">
                <h6 className="text-secondary small fw-bold text-uppercase mb-2">Featured Cast</h6>
                <div className="d-flex gap-3 overflow-auto pb-2">
                  {title.cast.map(c => (
                    <div key={c.id} className="text-center" style={{ minWidth: '90px' }}>
                      <div className="rounded-circle overflow-hidden mx-auto mb-1" style={{ width: '60px', height: '60px', backgroundColor: '#222' }}>
                        {c.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} className="w-100 h-100 object-fit-cover" />
                        ) : (
                          <Users size={30} className="text-secondary mt-3" />
                        )}
                      </div>
                      <div className="text-white small text-truncate" style={{ fontSize: '11px', maxWidth: '90px' }}>{c.name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: '10px', maxWidth: '90px' }}>{c.character}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Community Rating Distribution & Reviews Section */}
        <div className="row g-4 mt-5">
          <div className="col-12 col-lg-5">
            <div className="p-4 rounded-4 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
              <h5 className="fw-bold text-white mb-3">Community Rating Distribution</h5>
              {communityStats?.total_ratings > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {[5, 4, 3, 2, 1].map(num => {
                    const count = communityStats.distribution[num] || 0;
                    const pct = communityStats.total_ratings > 0 ? Math.round((count / communityStats.total_ratings) * 100) : 0;
                    return (
                      <div key={num} className="d-flex align-items-center gap-2 small">
                        <span className="text-white d-flex align-items-center gap-1" style={{ width: '40px' }}>
                          {num} <Star size={12} fill="#e50914" color="#e50914" />
                        </span>
                        <div className="progress flex-grow-1 bg-dark" style={{ height: '8px' }}>
                          <div className="progress-bar bg-danger" role="progressbar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-muted" style={{ width: '60px', textAlign: 'right' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-secondary small py-4 text-center">
                  No community ratings yet. Be the first to rate this title!
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <div className="p-4 rounded-4 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                  <MessageSquare size={18} className="text-danger" /> User Reviews ({reviews.length})
                </h5>
              </div>

              {/* Review Input Form */}
              {user ? (
                <form onSubmit={handleReviewSubmit} className="mb-4">
                  <textarea
                    className="form-control bg-dark text-white border-secondary mb-2"
                    rows="3"
                    placeholder="Write your thoughts and review for this title..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                    minLength={3}
                  />
                  <div className="text-end">
                    <button
                      type="submit"
                      className="btn btn-sm btn-moviebox px-4 rounded-pill fw-semibold"
                      disabled={submittingReview || !reviewComment.trim()}
                    >
                      {submittingReview ? 'Posting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="alert alert-dark border-secondary p-3 rounded mb-4 text-center small text-secondary">
                  Please <Link to="/login" className="text-danger fw-semibold">log in</Link> to write a review.
                </div>
              )}

              {/* Reviews List */}
              <div className="d-flex flex-column gap-3">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ backgroundColor: '#181920' }}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-white small">{rev.user.name}</span>
                          {rev.user_rating && (
                            <span className="badge bg-danger bg-opacity-25 text-danger d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                              <Star size={9} fill="#e50914" /> {rev.user_rating} / 5
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                          {user && (user.id === rev.user.id || user.role === 'admin') && (
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="btn btn-sm text-secondary hover-danger p-0 border-0 bg-transparent"
                              title="Delete review"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-light small mb-0">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted small">
                    No reviews written yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Titles Shelf */}
        {similar.length > 0 && (
          <div className="mt-5 pt-4 border-top border-secondary border-opacity-25">
            <h4 className="fw-bold text-white mb-3">More Like This</h4>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
              {similar.slice(0, 6).map((item) => (
                <div className="col" key={`${item.media_type}_${item.tmdb_id}`}>
                  <MovieCard item={item} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
