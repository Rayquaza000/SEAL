import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await authRegister(form.name, form.email, form.password);
      navigate('/dashboard');
      toast.success('Account created! Create or join a workspace to start.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#EBEBEB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: '#e57373', letterSpacing: 8 }}>SEAL</span>
      </div>
      <p style={{ fontSize: 14, color: '#999', marginBottom: 32 }}>Create your account</p>

      <div className="seal-card" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 32 }}>
        <p style={{ fontWeight: 700, fontSize: 20, marginBottom: 24, color: '#333' }}>Register</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="seal-label">Full Name</label>
            <input type="text" required className="seal-input" placeholder="Pratik Mehta"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="seal-label">Email</label>
            <input type="email" required className="seal-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="seal-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} required className="seal-input"
                placeholder="Min. 6 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="seal-label">Confirm Password</label>
            <input type="password" required className="seal-input" placeholder="••••••••"
              value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-red" style={{ marginTop: 6, width: '100%', padding: '10px' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ fontSize: 13, textAlign: 'center', color: '#999', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#e57373', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
