import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Award, Clock } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export function LoginPage({ onLogin, isLoading }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      await onLogin(username, password);
    }
  };

  const setDemoCredentials = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin');
    } else {
      setUsername('user');
      setPassword('user');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Welcome content */}
        <div className="text-center lg:text-left space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">
              🎯 CPNS Quiz App
            </h1>
            <p className="text-xl text-gray-600">
              Platform latihan soal CPNS yang komprehensif dan menyenangkan!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">110</div>
              <div className="text-sm text-gray-600">Soal per Paket</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">120</div>
              <div className="text-sm text-gray-600">Menit Ujian</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">2</div>
              <div className="text-sm text-gray-600">Role Pengguna</div>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center">
              <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">A-E</div>
              <div className="text-sm text-gray-600">Pilihan Jawaban</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">✨ Fitur Unggulan:</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                📊 Statistik Detail
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ⏱️ Timer Real-time
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                🎨 UI Modern
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                📱 Responsif
              </Badge>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Masuk ke Akun</CardTitle>
            <CardDescription>
              Pilih role dan masuk untuk mulai berlatih
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login Manual</TabsTrigger>
                <TabsTrigger value="demo">Demo Login</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '🔄 Memproses...' : '🚀 Masuk'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="demo" className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    Gunakan akun demo untuk mencoba aplikasi
                  </p>
                  
                  <Button 
                    onClick={() => setDemoCredentials('admin')}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        👑
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Admin Demo</div>
                        <div className="text-xs text-gray-500">Kelola soal & paket quiz</div>
                      </div>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => setDemoCredentials('user')}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        🎓
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">User Demo</div>
                        <div className="text-xs text-gray-500">Ikuti quiz & lihat hasil</div>
                      </div>
                    </div>
                  </Button>

                  {(username || password) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm space-y-1">
                        <div><strong>Username:</strong> {username}</div>
                        <div><strong>Password:</strong> {password}</div>
                      </div>
                      <Button 
                        onClick={handleSubmit}
                        className="w-full mt-3" 
                        disabled={isLoading}
                      >
                        {isLoading ? '🔄 Memproses...' : '🚀 Masuk dengan Demo'}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}