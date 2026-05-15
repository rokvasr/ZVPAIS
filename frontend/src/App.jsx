import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventManagement from './components/EventManagement';
import EventForm from './components/EventForm';
import CalculationReview from './components/CalculationReview';
import MaterialList from './components/MaterialList';
import MaterialForm from './components/MaterialForm';
import EventMap from './components/EventMap';
import ObjectList from './components/ObjectList';
import ObjectForm from './components/ObjectForm';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import IndexingCoefficientManager from './components/IndexingCoefficientManager';
import PollutionSeverity from './components/PollutionSeverity';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import './App.css';

function NavBar() {
  const { isAuthenticated, isSpecialist, user, logout } = useAuth();
  const { lang, toggle, t } = useLanguage();

  return (
    <nav>
      <ul>
        {isAuthenticated ? (
          <>
            <li><Link to="/">{t('nav_home')}</Link></li>
            <li><Link to="/events">{t('nav_events')}</Link></li>
            <li><Link to="/materials">{t('nav_materials')}</Link></li>
            <li><Link to="/objects">{t('nav_objects')}</Link></li>
            <li><Link to="/reports">{t('nav_reports')}</Link></li>
            <li><Link to="/map">{t('nav_map')}</Link></li>
            <li><Link to="/pollution">{t('nav_pollution')}</Link></li>
            {isSpecialist && <li><Link to="/indexing">{t('nav_in_coeff')}</Link></li>}
            <li className="nav-user">
              <span className="nav-role">{isSpecialist ? t('nav_specialist') : t('nav_user')}</span>
              <span className="nav-email">{user.email}</span>
              <button className="nav-logout" onClick={logout}>{t('nav_logout')}</button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">{t('nav_login')}</Link></li>
            <li><Link to="/register">{t('nav_register')}</Link></li>
          </>
        )}
        <li>
          <button
            onClick={toggle}
            style={{ background: 'none', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.85em', opacity: 0.75 }}
          >
            {lang === 'lt' ? 'EN' : 'LT'}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <div>
            <NavBar />
            <div className="page-content"><div className="card">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                <Route path="/" element={
                  <ProtectedRoute>
                    <WelcomePage />
                  </ProtectedRoute>
                } />

                <Route path="/events" element={<ProtectedRoute><EventManagement /></ProtectedRoute>} />
                <Route path="/events/new" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
                <Route path="/events/edit/:id" element={<ProtectedRoute requireSpecialist><EventForm /></ProtectedRoute>} />
                <Route path="/events/:id/calculation" element={<ProtectedRoute><CalculationReview /></ProtectedRoute>} />

                <Route path="/materials" element={<ProtectedRoute><MaterialList /></ProtectedRoute>} />
                <Route path="/materials/new" element={<ProtectedRoute><MaterialForm /></ProtectedRoute>} />
                <Route path="/materials/edit/:id" element={<ProtectedRoute requireSpecialist><MaterialForm /></ProtectedRoute>} />

                <Route path="/map" element={<ProtectedRoute><EventMap /></ProtectedRoute>} />

                <Route path="/objects" element={<ProtectedRoute><ObjectList /></ProtectedRoute>} />
                <Route path="/objects/new" element={<ProtectedRoute><ObjectForm /></ProtectedRoute>} />
                <Route path="/objects/edit/:id" element={<ProtectedRoute requireSpecialist><ObjectForm /></ProtectedRoute>} />

                <Route path="/reports" element={<ProtectedRoute><ReportList /></ProtectedRoute>} />
                <Route path="/reports/new" element={<ProtectedRoute requireSpecialist><ReportForm /></ProtectedRoute>} />
                <Route path="/reports/edit/:id" element={<ProtectedRoute requireSpecialist><ReportForm /></ProtectedRoute>} />

                <Route path="/pollution" element={<ProtectedRoute><PollutionSeverity /></ProtectedRoute>} />
                <Route path="/indexing" element={<ProtectedRoute requireSpecialist><IndexingCoefficientManager /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div></div>
          </div>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function WelcomePage() {
  const { t } = useLanguage();
  return <h1>{t('welcome')}</h1>;
}

export default App;
