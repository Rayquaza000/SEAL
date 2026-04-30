import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, LogIn } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error | needs-login
  const [message, setMessage] = useState('');

  useEffect(() => {
    const accept = async () => {
      if (!user) {
        setStatus('needs-login');
        return;
      }
      try {
        const { data } = await api.post(`/workspaces/accept-invite/${token}`);
        await fetchMe();
        setStatus('success');
        setMessage(data.workspace?.name || 'the workspace');
        setTimeout(() => navigate('/dashboard'), 2500);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired invitation link.');
      }
    };
    accept();
  }, [token, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-seal-950 via-seal-900 to-seal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 bg-seal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-black text-2xl">S</span>
        </div>

        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-seal-600 mx-auto mb-4" />
            <p className="text-gray-600">Processing your invitation...</p>
          </>
        )}

        {status === 'needs-login' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to accept</h2>
            <p className="text-gray-500 text-sm mb-6">You need to be logged in to accept this workspace invitation.</p>
            <div className="space-y-3">
              <Link
                to={`/login`}
                state={{ redirectTo: `/invite/${token}` }}
                className="btn-primary w-full justify-center"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </Link>
              <Link to="/register" className="btn-secondary w-full justify-center">
                Create account
              </Link>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-gray-500 text-sm">You've joined <strong>{message}</strong>. Redirecting you to the dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Failed</h2>
            <p className="text-gray-500 text-sm mb-5">{message}</p>
            <Link to="/dashboard" className="btn-primary w-full justify-center">Go to Dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
