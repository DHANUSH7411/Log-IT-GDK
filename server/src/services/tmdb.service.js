import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Known genre mappings for fast enrichment
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

class TMDBService {
  get apiKey() {
    return (process.env.TMDB_API_KEY || '').trim();
  }

  get accessToken() {
    return (process.env.TMDB_ACCESS_TOKEN || '').trim();
  }

  isConfigured() {
    return Boolean(this.apiKey || this.accessToken);
  }

  getHeaders() {
    const headers = { 'Accept': 'application/json' };
    if (this.accessToken && !this.apiKey) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  buildUrl(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey);
    }
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val));
      }
    });
    return url.toString();
  }

  async fetchTMDB(endpoint, params = {}) {
    if (!this.isConfigured()) {
      const err = new Error(
        'TMDB API key is missing. Please add your TMDB_API_KEY in server/.env. (Get a free key at https://www.themoviedb.org/settings/api)'
      );
      err.status = 503;
      err.code = 'TMDB_CREDENTIAL_MISSING';
      throw err;
    }

    const url = this.buildUrl(endpoint, params);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.status_message || `TMDB API returned HTTP ${response.status}`);
        err.status = response.status;
        if (response.status === 401) {
          err.code = 'TMDB_INVALID_KEY';
          err.message = 'Invalid TMDB API key in server/.env (401 Unauthorized).';
        }
        throw err;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('TMDB request timed out after 8 seconds');
        err.status = 504;
        err.code = 'TMDB_TIMEOUT';
        throw err;
      }
      if (error.status) {
        throw error;
      }
      const netErr = new Error(
        `Unable to reach TMDB API (${error.cause?.code || error.code || error.message}). Please check internet connection or TMDB status.`
      );
      netErr.status = 502;
      netErr.code = 'TMDB_NETWORK_ERROR';
      throw netErr;
    }
  }

  normalizeItem(item, explicitType = null) {
    const mediaType = explicitType || item.media_type || (item.title ? 'movie' : 'tv');
    
    // Map genre IDs or genre objects to string
    let genresStr = '';
    if (Array.isArray(item.genres) && item.genres.length > 0) {
      genresStr = item.genres.map(g => g.name).join(', ');
    } else if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
      genresStr = item.genre_ids
        .map(id => GENRE_MAP[id] || '')
        .filter(Boolean)
        .join(', ');
    }

    return {
      tmdb_id: item.id,
      media_type: mediaType,
      name: item.title || item.name || 'Untitled',
      original_name: item.original_title || item.original_name || '',
      release_date: item.release_date || item.first_air_date || '',
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      overview: item.overview || '',
      tmdb_rating: typeof item.vote_average === 'number' ? Number(item.vote_average.toFixed(1)) : 0.0,
      vote_count: item.vote_count || 0,
      genres: genresStr,
      total_episodes: item.number_of_episodes || null,
      total_seasons: item.number_of_seasons || null
    };
  }

  async getTrending(timeWindow = 'week') {
    const data = await this.fetchTMDB(`/trending/all/${timeWindow}`);
    const results = (data.results || [])
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => this.normalizeItem(item));
    return { results, page: data.page, total_pages: data.total_pages };
  }

  async getPopular(mediaType = 'movie', page = 1) {
    const endpoint = mediaType === 'tv' ? '/tv/popular' : '/movie/popular';
    const data = await this.fetchTMDB(endpoint, { page });
    const results = (data.results || []).map(item => this.normalizeItem(item, mediaType));
    return { results, page: data.page, total_pages: data.total_pages, total_results: data.total_results };
  }

  async getTopRated(mediaType = 'movie', page = 1) {
    const endpoint = mediaType === 'tv' ? '/tv/top_rated' : '/movie/top_rated';
    const data = await this.fetchTMDB(endpoint, { page });
    const results = (data.results || []).map(item => this.normalizeItem(item, mediaType));
    return { results, page: data.page, total_pages: data.total_pages, total_results: data.total_results };
  }

  async search(query, mediaType = 'all', page = 1) {
    let endpoint = '/search/multi';
    if (mediaType === 'movie') endpoint = '/search/movie';
    if (mediaType === 'tv') endpoint = '/search/tv';

    const data = await this.fetchTMDB(endpoint, { query, page, include_adult: false });
    const results = (data.results || [])
      .filter(item => mediaType !== 'all' || item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => this.normalizeItem(item, mediaType !== 'all' ? mediaType : null));
    return { results, page: data.page, total_pages: data.total_pages, total_results: data.total_results };
  }

  async discover(options = {}) {
    const { mediaType = 'movie', genre, sortBy = 'popularity.desc', year, page = 1 } = options;
    const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';

    const params = {
      page,
      sort_by: sortBy,
      include_adult: false
    };

    if (genre) params.with_genres = genre;
    if (year) {
      if (mediaType === 'tv') params.first_air_date_year = year;
      else params.primary_release_year = year;
    }

    const data = await this.fetchTMDB(endpoint, params);
    const results = (data.results || []).map(item => this.normalizeItem(item, mediaType));
    return { results, page: data.page, total_pages: data.total_pages, total_results: data.total_results };
  }

  async getGenres(mediaType = 'movie') {
    const endpoint = mediaType === 'tv' ? '/genre/tv/list' : '/genre/movie/list';
    const data = await this.fetchTMDB(endpoint);
    return data.genres || [];
  }

  async getDetails(mediaType, tmdbId) {
    const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const data = await this.fetchTMDB(endpoint, { append_to_response: 'videos,credits' });
    const normalized = this.normalizeItem(data, mediaType);

    // Extract videos/trailer if available
    let trailerKey = null;
    if (data.videos && Array.isArray(data.videos.results)) {
      const trailer = data.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      if (trailer) trailerKey = trailer.key;
    }

    return {
      ...normalized,
      tagline: data.tagline || '',
      status: data.status || '',
      runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null),
      number_of_seasons: data.number_of_seasons || null,
      number_of_episodes: data.number_of_episodes || null,
      trailer_youtube_key: trailerKey,
      cast: (data.credits?.cast || []).slice(0, 8).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path
      }))
    };
  }

  async getSimilar(mediaType, tmdbId) {
    const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}/similar` : `/movie/${tmdbId}/similar`;
    const data = await this.fetchTMDB(endpoint);
    const results = (data.results || []).slice(0, 10).map(item => this.normalizeItem(item, mediaType));
    return results;
  }
}

export const tmdbService = new TMDBService();
export default tmdbService;
