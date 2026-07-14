import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppRouter } from './routes/index.tsx';

const App: React.FC = () => {
  useEffect(() => {
    const theme = localStorage.getItem('settings_theme') || 'dark';
    document.documentElement.classList.remove('light-theme-mock', 'cyberpunk-theme-mock');
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme-mock');
    } else if (theme === 'cyberpunk') {
      document.documentElement.classList.add('cyberpunk-theme-mock');
    }
  }, []);

  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
