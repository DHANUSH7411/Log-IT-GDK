# Log IT! — by GDK (Movie & TV Series Tracker)

**Log IT! — by GDK** is a full-stack entertainment discovery and personal viewing tracker inspired by the browsing experience of premium streaming platforms. It connects to **The Movie Database (TMDB)** for catalogue data and uses a local **MySQL 8.0** relational database to persist user accounts, custom tracker lists, star ratings, and community reviews.

---

## 📌 Architecture Overview

- **Frontend**: React 18, Vite, Bootstrap 5, React Router 6, Axios, Lucide React icons (`http://localhost:5173`)
- **Backend**: Node.js, Express, Helmet, CORS, MySQL2 (`mysql2/promise`), `express-session` with MySQL session storage, `bcryptjs` (`http://localhost:5001`)
- **Database**: MySQL 8.0 relational schema with foreign key constraints, indexes, and session store (`moviebox_db` on port 3307 or 3306)

---

## 🚀 Quick Start Guide (macOS Beginner Friendly)

### 1. Prerequisites

**Node.js (v18+):**
```bash
node -v
npm -v
```

**MySQL 8.0:**
If MySQL is installed at `/usr/local/mysql/`, you can verify with:
```bash
/usr/local/mysql/bin/mysql --version
```
If not installed, download from [dev.mysql.com/downloads/mysql](https://dev.mysql.com/downloads/mysql/) (choose macOS ARM for Apple Silicon).

### 2. Install Project Dependencies
Run from the root project folder (`Log IT!`):
```bash
npm run install:all
```
This installs dependencies for both `server/` and `client/`.

### 3. Configure Environment Variables
Copy the example environment file if not already present:
```bash
cp server/.env.example server/.env
```
Edit `server/.env` and fill in your values:
- `PORT` — backend port (default `5001` to avoid macOS AirPlay conflict)
- `DB_PORT` — MySQL port (`3307` for the project's local instance, or `3306` for system MySQL)
- `DB_USER` / `DB_PASSWORD` — your MySQL credentials
- `TMDB_API_KEY` — your free TMDB API key (see step 4)

> **⚠️ Never commit `server/.env` to version control.** It contains secrets. The `.gitignore` already excludes it.

### 4. How to Get a Free TMDB API Key
1. Register for a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API → Request an API Key (Developer)**.
3. Copy your **API Key (v3 auth)**.
4. Paste it into `server/.env`:
   ```env
   TMDB_API_KEY=your_copied_api_key_here
   ```

### 5. Start MySQL
If you are using the project's local MySQL instance on port 3307:
```bash
/usr/local/mysql/bin/mysqld \
  --datadir="$(pwd)/server/data/mysql_data" \
  --port=3307 \
  --socket=/tmp/moviebox_mysql3307.sock \
  --mysqlx=OFF &
```
If you use your system MySQL (port 3306), just make sure it is running and update `DB_PORT=3306` in `server/.env`.

### 6. Initialize the MySQL Database
```bash
npm run db:init
```
This executes `server/db/schema.sql`, creates the tables (`users`, `titles`, `tracker_entries`, `ratings`, `reviews`, `sessions`), and seeds a default demo account:
- **Email**: `demo@moviebox.local`
- **Password**: `password123`

### 7. Start the Application
Start both frontend and backend concurrently:
```bash
npm run dev
```

Or start them individually in separate terminal tabs:

**Terminal 1 (Backend):**
```bash
npm run dev:server
```
*(Runs on `http://localhost:5001`)*

**Terminal 2 (Frontend):**
```bash
npm run dev:client
```
*(Runs on `http://localhost:5173`)*

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 🔄 Reopening the Project (After Reboot or Closing Terminal)

When you come back to the project later, follow these steps:

```bash
# 1. Open Terminal and navigate to the project folder
cd ~/Downloads/clg/Log\ IT\!

# 2. Start MySQL (if using the local instance on port 3307)
/usr/local/mysql/bin/mysqld \
  --datadir="$(pwd)/server/data/mysql_data" \
  --port=3307 \
  --socket=/tmp/moviebox_mysql3307.sock \
  --mysqlx=OFF &

# 3. Wait a couple of seconds for MySQL to start, then launch the app
npm run dev
```

That's it! The app will be available at `http://localhost:5173`.

> **Tip:** If dependencies are missing (e.g. after pulling new code), run `npm run install:all` first.

---

## 🛠️ macOS Port Conflict Troubleshooting

1. **Why does backend run on port 5001 instead of 5000?**
   - On macOS Monterey and later, Apple's built-in **AirPlay Receiver / ControlCenter** binds to port `5000` by default.
   - To avoid clashes, Log IT! runs the Express backend on port `5001`.
   - The Vite dev server automatically proxies `/api` requests to `http://localhost:5001`, so no extra client configuration is needed.

2. **MySQL Port 3307 vs 3306:**
   - Log IT! is preconfigured to use an isolated user-level MySQL on port `3307` (`DB_PORT=3307`).
   - If your local MySQL service runs on standard port `3306`, change `DB_PORT=3306` in `server/.env`.

---

## 📂 Project Structure

```
Log IT!/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # Axios HTTP client
│   │   ├── components/      # Navbar, Footer, BrandLogo, MovieCard, etc.
│   │   ├── context/         # AuthContext (session state)
│   │   ├── pages/           # HomePage, ExplorePage, TitleDetailsPage, etc.
│   │   ├── App.jsx          # React Router routes
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Dark cinematic theme
│   ├── index.html
│   └── vite.config.js       # Vite config with /api proxy
├── server/                  # Express backend
│   ├── src/
│   │   ├── config/          # Database pool (db.js)
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/          # auth, catalogue, tracker, ratings, reviews, dashboard
│   │   ├── services/        # TMDB service, title upsert
│   │   └── index.js         # Express entry point
│   ├── db/
│   │   └── schema.sql       # MySQL schema (6 tables)
│   ├── scripts/             # DB init, MySQL start helpers
│   ├── .env.example         # Template (no secrets)
│   └── .env                 # Your local secrets (git-ignored)
├── .gitignore
├── API_CONTRACT.md          # Full REST API documentation
├── README.md                # This file
└── package.json             # Root scripts (dev, install:all, db:init)
```

---

## 🧪 Testing and Verification Checklist

| Feature | Verified Endpoint / Action | Status |
| :--- | :--- | :--- |
| **System Health** | `GET /api/health` | ✅ Healthy (`200 OK`) |
| **Authentication** | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | ✅ Session cookie persisted in MySQL |
| **Seeded Demo User** | `demo@moviebox.local` / `password123` | ✅ Available for quick testing |
| **Tracker Operations** | `GET /api/tracker`, `POST /api/tracker`, `PATCH /api/tracker/:id/status` | ✅ Tested and verified |
| **Episode Tracking** | `PATCH /api/tracker/:id/progress` (+1 / -1 bounds) | ✅ Tested and verified |
| **Ratings System** | `POST /api/ratings`, `GET /api/ratings/community/:mediaType/:tmdbId` | ✅ SQL aggregates & 1-5 distribution |
| **User Reviews** | `POST /api/reviews`, `GET /api/reviews/:mediaType/:tmdbId` | ✅ Tested and verified |
| **Personal Dashboard**| `GET /api/dashboard/stats`, `GET /api/dashboard/recommendations` | ✅ Real DB statistics & suggestions |
| **Frontend Rendering**| Vite build (`npm run build`) | ✅ Zero errors, clean bundle |

---

## 📄 API Documentation
Refer to [`API_CONTRACT.md`](./API_CONTRACT.md) for full REST endpoint specifications, request payloads, and status codes.
