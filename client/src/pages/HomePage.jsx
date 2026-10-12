import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, Tv, Star, Info, Plus, Check, ChevronRight, TrendingUp, Sparkles, Award } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function HomePage() {
  const { user } = useAuth();
  const [heroTitle, setHeroTitle] = useState(null);
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [trackedIds, setTrackedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [tmdbError, setTmdbError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [trendRes, popMovRes, topRes, popTvRes] = await Promise.allSettled([
          api.get('/catalogue/trending?time_window=day'),
          api.get('/catalogue/popular?media_type=movie&page=1'),
          api.get('/catalogue/top-rated?media_type=movie&page=1'),
          api.get('/catalogue/popular?media_type=tv&page=1')
        ]);

        if (trendRes.status === 'fulfilled' && trendRes.value.data?.results) {
          const results = trendRes.value.data.results;
          setTrending(results);
          if (results.length > 0) {
            setHeroTitle(results[0]);
          }
        } else if (trendRes.status === 'rejected') {
          setTmdbError(trendRes.reason.message);
        }

        if (popMovRes.status === 'fulfilled' && popMovRes.value.data?.results) {
          setPopularMovies(popMovRes.value.data.results);
        }

        if (topRes.status === 'fulfilled' && topRes.value.data?.results) {
          setTopRated(topRes.value.data.results);
        }

        if (popTvRes.status === 'fulfilled' && popTvRes.value.data?.results) {
          setPopularSeries(popTvRes.value.data.results);
        }
      } catch (err) {
        setTmdbError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function loadTracked() {
      if (user) {
        try {
          const res = await api.get('/tracker');
          const keys = new Set(res.data.map(t => `${t.title.media_type}_${t.title.tmdb_id}`));
          setTrackedIds(keys);
        } catch {
          // ignore tracker load failure
        }
      }
    }

    loadData();
    loadTracked();
  }, [user]);

  const handleQuickAdd = async (item) => {
    if (!user) {
      alert('Please log in or register to add titles to your personal tracker.');
      return;
    }

    try {
      await api.post('/tracker', {
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        name: item.name,
        genres: item.genres,
        release_date: item.release_date,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview,
        tmdb_rating: item.tmdb_rating,
        total_episodes: item.total_episodes,
        status: 'plan_to_watch'
      });

      setTrackedIds(prev => new Set(prev).add(`${item.media_type}_${item.tmdb_id}`));
    } catch (err) {
      alert(err.message || 'Failed to add title to tracker');
    }
  };

  const heroBackdrop = heroTitle?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${heroTitle.backdrop_path}`
    : null;

  return (
    <div className="min-vh-100 pb-5">
      {/* Cinematic Hero Section */}
      {heroTitle && (
        <section
          className="position-relative d-flex align-items-end"
          style={{
            minHeight: '75vh',
            backgroundImage: heroBackdrop ? `url(${heroBackdrop})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundColor: '#12141a'
          }}
        >
          {/* Gradients to blend smoothly into page */}
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{
              background: 'linear-gradient(180deg, rgba(15,16,20,0.2) 0%, rgba(15,16,20,0.8) 70%, #0f1014 100%), linear-gradient(90deg, rgba(15,16,20,0.95) 0%, rgba(15,16,20,0.6) 50%, rgba(15,16,20,0.1) 100%)'
            }}
          />

          <div className="container position-relative py-5" style={{ zIndex: 2 }}>
            <div className="row">
              <div className="col-12 col-lg-7">
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <span className="badge bg-danger text-uppercase fw-bold px-2 py-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    {heroTitle.media_type === 'tv' ? 'Featured Series' : 'Featured Movie'}
                  </span>
                  {heroTitle.release_date && (
                    <span className="text-light small fw-medium">
                      {heroTitle.release_date.substring(0, 4)}
                    </span>
                  )}
                  {heroTitle.tmdb_rating > 0 && (
                    <span className="d-flex align-items-center gap-1 text-warning small fw-bold">
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      {heroTitle.tmdb_rating} / 10 TMDB
                    </span>
                  )}
                </div>

                <h1 className="display-4 fw-extrabold text-white mb-3" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {heroTitle.name}
                </h1>

                {heroTitle.genres && (
                  <p className="text-secondary small mb-2">{heroTitle.genres}</p>
                )}

                <p className="text-light lead fs-6 mb-4 line-clamp-3" style={{ maxWidth: '600px', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {heroTitle.overview || 'Discover this acclaimed title on Log IT! and add it to your personal watchlist.'}
                </p>

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <Link
                    to={`/title/${heroTitle.media_type}/${heroTitle.tmdb_id}`}
                    className="btn btn-moviebox d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow"
                  >
                    <Info size={18} />
                    <span>View Title Details</span>
                  </Link>

                  <button
                    onClick={() => handleQuickAdd(heroTitle)}
                    className="btn btn-outline-light d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                    disabled={trackedIds.has(`${heroTitle.media_type}_${heroTitle.tmdb_id}`)}
                  >
                    {trackedIds.has(`${heroTitle.media_type}_${heroTitle.tmdb_id}`) ? (
                      <>
                        <Check size={18} className="text-success" />
                        <span>Saved to My List</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span>Add to My List</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="container mt-4">
        {tmdbError && (
          <div className="alert alert-dark border-secondary p-4 rounded text-center my-4">
            <h5 className="text-white fw-bold mb-2">TMDB Live Data Not Available</h5>
            <p className="text-secondary mb-3">
              {typeof tmdbError === 'string'
                ? tmdbError
                : tmdbError?.message || JSON.stringify(tmdbError)}
            </p>
            <p className="small text-muted mb-0">
              Please check your backend connection, CORS settings, or verify that <code>TMDB_API_KEY</code> is configured on your server.
            </p>
          </div>
        )}

        {/* Shelves */}
        {trending.length > 0 && (
          <section className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <TrendingUp size={20} className="text-danger" />
                <h4 className="fw-bold text-white mb-0">Trending Now</h4>
              </div>
              <Link to="/explore?sort_by=popularity.desc" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 hover-white">
                Explore All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
              {trending.slice(0, 12).map((item) => (
                <div className="col" key={`${item.media_type}_${item.tmdb_id}`}>
                  <MovieCard
                    item={item}
                    onQuickAdd={handleQuickAdd}
                    isTracked={trackedIds.has(`${item.media_type}_${item.tmdb_id}`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {popularMovies.length > 0 && (
          <section className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Film size={20} className="text-danger" />
                <h4 className="fw-bold text-white mb-0">Popular Movies</h4>
              </div>
              <Link to="/movies" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 hover-white">
                View All Movies <ChevronRight size={14} />
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
              {popularMovies.slice(0, 12).map((item) => (
                <div className="col" key={`movie_${item.tmdb_id}`}>
                  <MovieCard
                    item={item}
                    onQuickAdd={handleQuickAdd}
                    isTracked={trackedIds.has(`movie_${item.tmdb_id}`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {popularSeries.length > 0 && (
          <section className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Tv size={20} className="text-danger" />
                <h4 className="fw-bold text-white mb-0">Popular TV Series</h4>
              </div>
              <Link to="/series" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 hover-white">
                View All Series <ChevronRight size={14} />
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
              {popularSeries.slice(0, 12).map((item) => (
                <div className="col" key={`tv_${item.tmdb_id}`}>
                  <MovieCard
                    item={item}
                    onQuickAdd={handleQuickAdd}
                    isTracked={trackedIds.has(`tv_${item.tmdb_id}`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {topRated.length > 0 && (
          <section className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Award size={20} className="text-danger" />
                <h4 className="fw-bold text-white mb-0">Top Rated Masterpieces</h4>
              </div>
              <Link to="/explore?sort_by=vote_average.desc" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 hover-white">
                Explore All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
              {topRated.slice(0, 12).map((item) => (
                <div className="col" key={`top_${item.tmdb_id}`}>
                  <MovieCard
                    item={item}
                    onQuickAdd={handleQuickAdd}
                    isTracked={trackedIds.has(`${item.media_type}_${item.tmdb_id}`)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
