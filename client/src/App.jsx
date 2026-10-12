import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ConfigBanner from './components/ConfigBanner';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import TitleDetailsPage from './pages/TitleDetailsPage';
import MyListPage from './pages/MyListPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100 bg-dark text-light">
          <ConfigBanner />
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/movies" element={<ExplorePage defaultMediaType="movie" />} />
              <Route path="/series" element={<ExplorePage defaultMediaType="tv" />} />
              <Route path="/explore" element={<ExplorePage defaultMediaType="all" />} />
              <Route path="/title/:mediaType/:id" element={<TitleDetailsPage />} />
              <Route path="/my-list" element={<MyListPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
