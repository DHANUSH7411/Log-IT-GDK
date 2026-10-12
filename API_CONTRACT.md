# MovieBox REST API Contract

Base URL: `http://localhost:5000/api`  
Frontend Origin: `http://localhost:5173`  
Authentication: HTTP-only session cookie (`moviebox.sid`). Pass `withCredentials: true` with all Axios requests.

---

## 1. System & Health

### `GET /health`
Returns service availability, MySQL connectivity status, and TMDB configuration status.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-11T18:30:00.000Z",
    "database": {
      "connected": true,
      "name": "moviebox_db"
    },
    "tmdb": {
      "configured": true
    }
  }
  ```

---

## 2. Authentication

### `POST /auth/register`
Registers a new user account.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    },
    "message": "Registered and logged in successfully"
  }
  ```
- **Error `400 Bad Request`**: `{ "error": "Email already in use" }` or `{ "error": "Validation error" }`

### `POST /auth/login`
Authenticates user with email and password, establishing a session.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    },
    "message": "Logged in successfully"
  }
  ```
- **Error `401 Unauthorized`**: `{ "error": "Invalid email or password" }`

### `POST /auth/logout`
Terminates the current session and clears the cookie.
- **Response `200 OK`**:
  ```json
  { "message": "Logged out successfully" }
  ```

### `GET /auth/me`
Retrieves the currently authenticated user based on session.
- **Response `200 OK`** (authenticated):
  ```json
  {
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    }
  }
  ```
- **Response `200 OK`** (unauthenticated):
  ```json
  { "user": null }
  ```

---

## 3. Catalogue & TMDB Discovery

All endpoints return normalized items with fields:
`{ id, tmdb_id, media_type, name, release_date, poster_path, backdrop_path, overview, tmdb_rating, genres }`.

### `GET /catalogue/trending?time_window=week`
Trending titles (mix of movies and TV).

### `GET /catalogue/popular?media_type=movie|tv&page=1`
Popular movies or TV series with pagination.

### `GET /catalogue/top-rated?media_type=movie|tv&page=1`
Top rated titles.

### `GET /catalogue/search?query=inception&media_type=all|movie|tv&page=1`
Full-text search.

### `GET /catalogue/discover?media_type=movie|tv&genre=28&sort_by=popularity.desc&year=2024&page=1`
Filtered exploration grid.

### `GET /catalogue/genres?media_type=movie|tv`
List of official genres for filtering.

### `GET /catalogue/details/:mediaType/:tmdbId`
Detailed title information, including backdrop, poster, overview, genres, total episode count (for TV), TMDB score, and trailer/videos where available.

### `GET /catalogue/similar/:mediaType/:tmdbId`
Similar title recommendations directly from TMDB.

---

## 4. Tracker / My List

All tracker endpoints require authentication.

### `GET /tracker`
Returns all tracked titles for the current user.
- **Query params**: `?status=all|plan_to_watch|watching|completed|dropped&media_type=all|movie|tv`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 10,
      "title_id": 4,
      "status": "watching",
      "episodes_watched": 5,
      "current_season": 1,
      "current_episode": 5,
      "updated_at": "2026-10-11T18:00:00Z",
      "title": {
        "id": 4,
        "tmdb_id": 1399,
        "media_type": "tv",
        "name": "Game of Thrones",
        "genres": "Drama, Sci-Fi & Fantasy",
        "release_date": "2011-04-17",
        "poster_path": "/...",
        "backdrop_path": "/...",
        "overview": "...",
        "tmdb_rating": 8.4,
        "total_episodes": 73
      }
    }
  ]
  ```

### `POST /tracker`
Adds a title to the user's tracker. If the title is not yet in the local database, it is automatically upserted.
- **Request Body**:
  ```json
  {
    "tmdb_id": 1399,
    "media_type": "tv",
    "name": "Game of Thrones",
    "genres": "Drama, Sci-Fi & Fantasy",
    "release_date": "2011-04-17",
    "poster_path": "/...",
    "backdrop_path": "/...",
    "overview": "...",
    "tmdb_rating": 8.4,
    "total_episodes": 73,
    "status": "plan_to_watch"
  }
  ```
- **Response `201 Created`**: The saved tracker entry.

### `PATCH /tracker/:id/status`
Updates tracker status (`plan_to_watch`, `watching`, `completed`, `dropped`).
- **Request Body**:
  ```json
  { "status": "watching" }
  ```

### `PATCH /tracker/:id/progress`
Updates episode progress. Enforces bounds: `0 <= episodes_watched <= total_episodes` (if total_episodes is known). Blocked for movies.
- **Request Body**:
  ```json
  {
    "episodes_watched": 6,
    "current_season": 1,
    "current_episode": 6
  }
  ```

### `DELETE /tracker/:id`
Removes the tracker entry for the current user.
- **Response `200 OK`**: `{ "message": "Entry removed" }`

---

## 5. Ratings & Reviews

### `POST /ratings`
Submits or updates a 1-5 star rating. Requires auth.
- **Request Body**:
  ```json
  {
    "tmdb_id": 1399,
    "media_type": "tv",
    "title_payload": { ... },
    "rating": 5
  }
  ```
- **Response `200 OK`**: Saved rating record.

### `GET /ratings/community/:mediaType/:tmdbId`
Returns computed community stats for a title:
- **Response `200 OK`**:
  ```json
  {
    "average": 4.6,
    "total_ratings": 18,
    "distribution": { "1": 0, "2": 1, "3": 2, "4": 5, "5": 10 },
    "user_rating": 5
  }
  ```

### `POST /reviews`
Submits a written review for a title. Requires auth.
- **Request Body**:
  ```json
  {
    "tmdb_id": 1399,
    "media_type": "tv",
    "title_payload": { ... },
    "comment": "Brilliant world-building and character arcs."
  }
  ```

### `GET /reviews/:mediaType/:tmdbId`
Fetches all user reviews for this title.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "comment": "Brilliant world-building and character arcs.",
      "created_at": "2026-10-11T18:00:00Z",
      "user": {
        "id": 1,
        "name": "Jane Doe"
      },
      "user_rating": 5
    }
  ]
  ```

### `DELETE /reviews/:id`
Deletes a review owned by the authenticated user.

---

## 6. Dashboard & Recommendations

Requires authentication.

### `GET /dashboard/stats`
Calculates personal stats derived from the user's tracker entries and ratings:
- **Response `200 OK`**:
  ```json
  {
    "total_tracked": 12,
    "completed": 4,
    "watching": 3,
    "plan_to_watch": 4,
    "dropped": 1,
    "total_episodes_watched": 48,
    "total_ratings": 8,
    "average_user_rating": 4.5,
    "status_distribution": {
      "plan_to_watch": 4,
      "watching": 3,
      "completed": 4,
      "dropped": 1
    },
    "genre_distribution": [
      { "genre": "Sci-Fi & Fantasy", "count": 6 },
      { "genre": "Drama", "count": 5 },
      { "genre": "Action", "count": 3 }
    ]
  }
  ```

### `GET /dashboard/recommendations`
Returns personalized title recommendations:
- Analyzes user's highly rated titles (4 or 5 stars).
- Queries TMDB similar endpoints for those titles.
- Filters out titles already in the user's tracker.
- Ranks repeated suggestions higher.
