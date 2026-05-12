import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    isSpecialist: false,
    name: '',
    fieldOfExpertise: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d
        : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('register_error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('register_title')}</h2>
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
              minLength={8}
            />
          </div>
          <div className="auth-checkbox-row">
            <input
              type="checkbox"
              name="isSpecialist"
              id="isSpecialist"
              checked={form.isSpecialist}
              onChange={handleChange}
            />
            <label htmlFor="isSpecialist">{t('register_as_specialist')}</label>
          </div>
          {form.isSpecialist && (
            <>
              <div>
                <label>{t('register_name')}</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>{t('register_field')}</label>
                <input
                  type="text"
                  name="fieldOfExpertise"
                  value={form.fieldOfExpertise}
                  onChange={handleChange}
                />
              </div>
            </>
          )}
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? t('register_registering') : t('register_btn')}
          </button>
        </form>
        <p className="auth-link">
          {t('register_have_account')} <Link to="/login">{t('nav_login')}</Link>
        </p>
      </div>
    </div>
  );
}
