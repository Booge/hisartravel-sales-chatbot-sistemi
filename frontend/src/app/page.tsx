'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '' });

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (isSetup) {
        res = await authAPI.setup(form);
      } else {
        res = await authAPI.login(form.email, form.password);
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bağlantı hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
          <h1>Hisar ChatBot</h1>
          <p>{isSetup ? 'İlk yönetici hesabını oluştur' : 'Dashboard\'a giriş yap'}</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSetup && (
            <div className="form-group">
              <label>İsim</label>
              <input
                type="text"
                className="form-input"
                placeholder="Adınız"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@hisartravel.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : isSetup ? (
              '🚀 Hesap Oluştur'
            ) : (
              '🔐 Giriş Yap'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => { setIsSetup(!isSetup); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-accent)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {isSetup ? '← Giriş sayfasına dön' : 'İlk kurulum? Admin hesabı oluştur →'}
          </button>
        </div>
      </div>
    </div>
  );
}
