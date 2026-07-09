import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 font-sans">
      <div className="space-y-6 max-w-md mx-auto">
        {/* Visual symbol badge */}
        <div className="bg-indigo-500/10 p-5 rounded-3xl w-max mx-auto ring-1 ring-white/10 text-indigo-400">
          <HelpCircle className="h-10 w-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">404 - Not Found</h1>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            The page or workspace resource you are trying to reach does not exist or has been shifted.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
          <Button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
