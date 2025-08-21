import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { QuizPackageManager } from '@/components/QuizPackageManager';
import { QuestionManager } from '@/components/QuestionManager';
import { toast } from 'sonner';
import { LogOut, Package, HelpCircle, BarChart3, Users, Clock, Award } from 'lucide-react';
import type { User, QuizPackage } from './types';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [quizPackages, setQuizPackages] = useState<QuizPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<QuizPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadQuizPackages();
  }, []);

  const loadQuizPackages = async () => {
    try {
      setIsLoading(true);
      const packages = await trpc.getQuizPackages.query();
      setQuizPackages(packages);
    } catch (error) {
      toast.error('Gagal memuat paket quiz');
      console.error('Error loading quiz packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageUpdated = () => {
    loadQuizPackages();
  };

  const handleManageQuestions = (pkg: QuizPackage) => {
    setSelectedPackage(pkg);
    setActiveTab('questions');
  };

  const totalQuestions = quizPackages.reduce((sum, pkg) => sum + pkg.total_questions, 0);
  const activePackages = quizPackages.filter(pkg => pkg.is_active);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              👑 Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Selamat datang, <span className="font-semibold">{user.username}</span>! Kelola paket quiz dan soal dengan mudah.
            </p>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Paket</p>
                  <p className="text-3xl font-bold">{quizPackages.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Paket Aktif</p>
                  <p className="text-3xl font-bold">{activePackages.length}</p>
                </div>
                <Award className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Soal</p>
                  <p className="text-3xl font-bold">{totalQuestions}</p>
                </div>
                <HelpCircle className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Rata-rata Waktu</p>
                  <p className="text-3xl font-bold">120</p>
                  <p className="text-orange-100 text-xs">menit</p>
                </div>
                <Clock className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="packages">📦 Kelola Paket</TabsTrigger>
            <TabsTrigger value="questions">❓ Kelola Soal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📈 Status Paket Quiz
                  </CardTitle>
                  <CardDescription>
                    Overview semua paket quiz yang telah dibuat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : quizPackages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Belum ada paket quiz</p>
                      <p className="text-sm">Buat paket quiz pertama Anda!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quizPackages.slice(0, 5).map((pkg: QuizPackage) => (
                        <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold">{pkg.title}</div>
                            <div className="text-sm text-gray-500">
                              {pkg.total_questions} soal • {pkg.time_limit_minutes} menit
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                              {pkg.is_active ? '✅ Aktif' : '⏸️ Nonaktif'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageQuestions(pkg)}
                            >
                              Kelola Soal
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Aksi cepat untuk mengelola quiz
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => setActiveTab('packages')}
                    className="w-full justify-start" 
                    size="lg"
                  >
                    <Package className="w-5 h-5 mr-3" />
                    Buat Paket Quiz Baru
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab('questions')}
                    variant="outline" 
                    className="w-full justify-start" 
                    size="lg"
                  >
                    <HelpCircle className="w-5 h-5 mr-3" />
                    Tambah Soal
                  </Button>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Tips Admin</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Pastikan setiap paket memiliki 110 soal</li>
                      <li>• Set waktu ujian standar 120 menit</li>
                      <li>• Berikan penjelasan untuk setiap jawaban</li>
                      <li>• Aktifkan paket setelah soal lengkap</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="packages">
            <QuizPackageManager 
              packages={quizPackages}
              onPackageUpdated={handlePackageUpdated}
              onManageQuestions={handleManageQuestions}
              currentUserId={user.id}
            />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionManager 
              selectedPackage={selectedPackage}
              packages={quizPackages}
              onPackageSelect={setSelectedPackage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}