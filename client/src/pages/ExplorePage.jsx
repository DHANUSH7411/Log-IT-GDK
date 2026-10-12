import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function ExplorePage({ defaultMediaType = 'all' }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const mediaParam = searchParams.get('type') || defaultMediaType;
  const genreParam = searchParams.get('genre') || '';
  const sortParam = searchParams.get('sort') || 'popularity.desc';
  const yearParam = searchParams.get('year') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [mediaType, setMediaType] = useState(mediaParam);
  const [selectedGenre, setSelectedGenre] = useState(genreParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [year, setYear] = useState(yearParam);

  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackedIds, setTrackedIds] = useState(new Set());

  // Load genres
  useEffect(() => {
    async function fetchGenres() {
      try {
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const res = await api.get(`/catalogue/genres?media_type=${type}`);
        setGenres(res.data.genres || []);
      } catch {
        // ignore genre fetch errors
      }
    }
    fetchGenres();
  }, [mediaType]);

  // Load user's tracker entries
  useEffect(() => {
    async function fetchTracker() {
      if (user) {
        try {
          const res = await api.get('/tracker');
          const keys = new Set(res.data.map(t => `${t.title.media_type}_${t.title.tmdb_id}`));
          setTrackedIds(keys);
        } catch {
          // ignore
        }
      }
    }
    fetchTracker();
  }, [user]);

  // Main fetch catalogue
  const fetchCatalogue = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (searchQuery.trim()) {
        res = await api.get('/catalogue/search', {
          params: {
            query: searchQuery.trim(),
            media_type: mediaType,
            page: pageNum
          }
        });
      } else {
        res = await api.get('/catalogue/discover', {
          params: {
            media_type: mediaType === 'all' ? 'movie' : mediaType,
            genre: selectedGenre || undefined,
            sort_by: sortBy,
            year: year || undefined,
            page: pageNum
          }
        });
      }

      const results = res.data.results || [];
      if (append) {
        setItems(prev => [...prev, ...results]);
      } else {
        setItems(results);
      }
      setPage(res.data.page || 1);
      setTotalPages(res.data.total_pages || 1);
      setTotalResults(res.data.total_results || results.length);
    } catch (err) {
      setError(err.message || 'Failed to load catalogue');
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, mediaType, selectedGenre, sortBy, year]);

  useEffect(() => {
    fetchCatalogue(1, false);
  }, [fetchCatalogue]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({
      ...(searchQuery ? { q: searchQuery } : {}),
      type: mediaType,
      ...(selectedGenre ? { genre: selectedGenre } : {}),
      sort: sortBy,
      ...(year ? { year } : {})
    });
    fetchCatalogue(1, false);
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchCatalogue(page + 1, true);
    }
  };

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
      alert(err.message || 'Failed to add to tracker');
    }
  };

  return (
    <div className="container py-4">
      {/* Title & Filter Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-white mb-1">
            {defaultMediaType === 'movie' ? 'Explore Movies' : defaultMediaType === 'tv' ? 'Explore TV Series' : 'Explore Catalogue'}
          </h2>
          <p className="text-secondary small mb-0">
            {totalResults > 0 ? `Showing ${items.length} of ${totalResults} titles` : 'Discover movies and series'}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="d-flex position-relative" style={{ minWidth: '260px' }}>
          <input
            type="search"
            className="form-control bg-dark text-white border-secondary rounded-pill pe-5"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn text-secondary position-absolute end-0 top-50 translate-middle-y me-2 border-0 bg-transparent">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-3 mb-4 border border-secondary border-opacity-25" style={{ backgroundColor: '#14151b' }}>
        <div className="row g-2 align-items-center">
          {defaultMediaType === 'all' && (
            <div className="col-6 col-md-3">
              <label className="text-muted small mb-1">Media Type</label>
              <select
                className="form-select form-select-sm bg-dark text-white border-secondary"
                value={mediaType}
                onChange={(e) => {
                  setMediaType(e.target.value);
                  setSelectedGenre('');
                }}
              >
                <option value="all">All Media</option>
                <option value="movie">Movies Only</option>
                <option value="tv">TV Series Only</option>
              </select>
            </div>
          )}

          <div className="col-6 col-md-3">
            <label className="text-muted small mb-1">Genre</label>
            <select
              className="form-select form-select-sm bg-dark text-white border-secondary"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="">All Genres</option>
              {genres.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label className="text-muted small mb-1">Sort By</label>
            <select
              className="form-select form-select-sm bg-dark text-white border-secondary"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Release Date (Newest)</option>
              <option value="vote_count.desc">Most Reviewed</option>
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label className="text-muted small mb-1">Release Year</label>
            <input
              type="number"
              className="form-control form-control-sm bg-dark text-white border-secondary"
              placeholder="e.g. 2024"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="1900"
              max="2030"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-dark border-danger border-opacity-50 text-white p-4 rounded text-center my-4">
          <p className="mb-2 text-danger fw-semibold">{error}</p>
          <button onClick={() => fetchCatalogue(1, false)} className="btn btn-sm btn-outline-light rounded-pill">
            <RefreshCw size={14} className="me-1" /> Try Again
          </button>
        </div>
      )}

      {/* Loading initial state */}
      {loading && items.length === 0 && (
        <div className="text-center py-5">
          <Loader2 size={36} className="text-danger spin mb-3" />
          <p className="text-secondary small">Loading titles from TMDB...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && !error && (
        <div className="text-center py-5 my-5 border border-secondary border-opacity-25 rounded-4 p-5" style={{ backgroundColor: '#14151b' }}>
          <Sparkles size={40} className="text-secondary mb-3" />
          <h4 className="fw-bold text-white mb-1">No Titles Found</h4>
          <p className="text-secondary small mb-3">
            Try adjusting your search query, genre, or release year filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('');
              setYear('');
              setMediaType('all');
            }}
            className="btn btn-sm btn-moviebox rounded-pill px-4"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Results Grid */}
      {items.length > 0 && (
        <>
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3 mb-4">
            {items.map((item) => (
              <div className="col" key={`${item.media_type}_${item.tmdb_id}`}>
                <MovieCard
                  item={item}
                  onQuickAdd={handleQuickAdd}
                  isTracked={trackedIds.has(`${item.media_type}_${item.tmdb_id}`)}
                />
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {page < totalPages && (
            <div className="text-center py-4">
              <button
                onClick={handleLoadMore}
                className="btn btn-outline-light px-4 py-2 rounded-pill fw-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin me-2" />
                    Loading more...
                  </>
                ) : (
                  `Load More Titles (Page ${page} of ${totalPages})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
