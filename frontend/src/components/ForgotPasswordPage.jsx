import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError(t('forgot_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('forgot_title')}</h2>
        {sent ? (
          <>
            <p>{t('forgot_sent')}</p>
            <p className="auth-link"><Link to="/login">{t('forgot_back_login')}</Link></p>
          </>
        ) : (
          <>
            <p>{t('forgot_desc')}</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div>
                <label>{t('login_email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? t('forgot_sending') : t('forgot_submit_btn')}
              </button>
            </form>
            <p className="auth-link"><Link to="/login">{t('forgot_back_login')}</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
