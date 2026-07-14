import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';
import { Compass, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Verification token is missing from the link.');
        return;
      }
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Verification failed. The link may have expired.');
      }
    };
    performVerification();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-650/15">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">DevPilot Account Activation</h2>
            <p className="text-xs text-slate-500">Autonomous software development assistant</p>
          </div>
        </div>

        <div className="py-6 flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activating Account</h3>
                <p className="text-xs text-slate-400 mt-1">Verifying your secure token...</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 text-emerald-400 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Email Verified Successfully!</h3>
                <p className="text-xs text-slate-455 leading-relaxed mt-2 max-w-xs mx-auto">
                  Your email has been authenticated. Your DevPilot workspace access is now fully authorized and secure.
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-rose-500/10 p-4 rounded-full border border-rose-500/20 text-rose-455">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activation Failed</h3>
                <p className="text-xs text-rose-400/80 leading-relaxed mt-2 max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="pt-2 border-t border-slate-850">
          <Link to="/login" className="w-full block">
            <Button className="w-full">
              {status === 'success' ? 'Sign In Now' : 'Back to Login'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
