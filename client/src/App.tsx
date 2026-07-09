import React from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppRouter } from './routes/index.tsx';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
