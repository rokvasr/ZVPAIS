import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    api.get('/auth/registration-status')
      .then(r => setRegistrationOpen(r.data.enabled))
      .catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d
        : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('login_error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('login_title')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>{t('login_email')}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div>
            <label>{t('login_password')}</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? t('login_logging_in') : t('login_btn')}
          </button>
        </form>
        {registrationOpen && (
          <p className="auth-link">
            {t('login_no_account')} <Link to="/register">{t('nav_register')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
