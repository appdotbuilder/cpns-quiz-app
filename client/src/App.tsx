import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginPage } from '@/components/LoginPage';
import { AdminDashboard } from '@/components/AdminDashboard';
import { UserDashboard } from '@/components/UserDashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { User } from './components/types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for saved session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('cpns-quiz-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('cpns-quiz-user');
      }
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await trpc.login.mutate({ username, password });
      setCurrentUser(user);
      localStorage.setItem('cpns-quiz-user', JSON.stringify(user));
      toast.success(`Selamat datang, ${user?.username}! 🎉`);
    } catch (error) {
      toast.error('Username atau password salah! ❌');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cpns-quiz-user');
    toast.success('Berhasil logout! 👋');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoginPage onLogin={handleLogin} isLoading={isLoading} />
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {currentUser.role === 'admin' ? (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <UserDashboard user={currentUser} onLogout={handleLogout} />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;