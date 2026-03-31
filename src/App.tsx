import { useState } from 'react';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        {isLoggedIn ? (
          <DashboardPage />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </div>
    </TooltipProvider>
  );
}
