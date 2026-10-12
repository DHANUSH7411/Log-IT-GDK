import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Film, Tv, Plus, Check } from 'lucide-react';

export default function MovieCard({ item, onQuickAdd, isTracked = false }) {
  const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
  const tmdbId = item.tmdb_id || item.id;
  const name = item.name || item.title || 'Untitled';
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);
  const rating = item.tmdb_rating || item.vote_average || 0;
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;

  return (
    <div className="moviebox-card h-100 d-flex flex-column position-relative group">
      <Link to={`/title/${mediaType}/${tmdbId}`} className="text-decoration-none text-white d-block overflow-hidden position-relative" style={{ aspectRatio: '2/3', backgroundColor: '#14151b' }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={name}
            className="w-100 h-100 object-fit-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback poster container */}
        <div
          className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center"
          style={{ display: posterUrl ? 'none' : 'flex', backgroundColor: '#1a1c24' }}
        >
          {mediaType === 'tv' ? <Tv size={36} className="text-secondary mb-2" /> : <Film size={36} className="text-secondary mb-2" />}
          <span className="fw-semibold small text-light line-clamp-2">{name}</span>
          <span className="text-muted" style={{ fontSize: '11px' }}>{year || 'No Year'}</span>
        </div>

        {/* Media type badge */}
        <div className="position-absolute top-0 start-0 m-2">
          <span className="badge bg-black bg-opacity-75 text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
            {mediaType === 'tv' ? 'TV' : 'Movie'}
          </span>
        </div>

        {/* TMDB Score badge */}
        {rating > 0 && (
          <div className="position-absolute top-0 end-0 m-2">
            <span className="badge bg-black bg-opacity-75 text-warning d-flex align-items-center gap-1 fw-bold" style={{ fontSize: '10px' }}>
              <Star size={10} fill="#f59e0b" color="#f59e0b" />
              {Number(rating).toFixed(1)}
            </span>
          </div>
        )}
      </Link>

      <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
        <div>
          <Link to={`/title/${mediaType}/${tmdbId}`} className="text-decoration-none text-white">
            <h6 className="fw-bold mb-1 text-truncate text-white" title={name} style={{ fontSize: '14px' }}>
              {name}
            </h6>
          </Link>
          <div className="d-flex align-items-center justify-content-between text-secondary" style={{ fontSize: '12px' }}>
            <span>{year || 'N/A'}</span>
            {item.genres && (
              <span className="text-truncate ps-2" style={{ maxWidth: '120px' }} title={item.genres}>
                {item.genres.split(',')[0]}
              </span>
            )}
          </div>
        </div>

        {onQuickAdd && (
          <div className="mt-2 pt-2 border-top border-secondary border-opacity-25">
            <button
              onClick={() => onQuickAdd(item)}
              className={`btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 ${
                isTracked ? 'btn-outline-success disabled' : 'btn-outline-secondary hover-white'
              }`}
              style={{ fontSize: '12px', padding: '4px 8px' }}
              disabled={isTracked}
            >
              {isTracked ? (
                <>
                  <Check size={13} /> Saved in List
                </>
              ) : (
                <>
                  <Plus size={13} /> Add to List
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
