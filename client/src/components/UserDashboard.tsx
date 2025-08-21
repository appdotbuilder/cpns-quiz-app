import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { QuizTaking } from '@/components/QuizTaking';
import { QuizResults } from '@/components/QuizResults';
import { toast } from 'sonner';
import { LogOut, Play, Trophy, Clock, Target, BookOpen, Award, BarChart3 } from 'lucide-react';
import type { User, QuizPackage, QuizSession, QuizResult, UserStatistics } from './types';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

export function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const [quizPackages, setQuizPackages] = useState<QuizPackage[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [packages, session, results, stats] = await Promise.all([
        trpc.getQuizPackages.query(),
        trpc.getActiveQuizSession.query({ userId: user.id }),
        trpc.getQuizResults.query({ userId: user.id }),
        trpc.getUserStatistics.query({ userId: user.id })
      ]);
      
      setQuizPackages(packages.filter(pkg => pkg.is_active));
      setActiveSession(session);
      setQuizResults(results);
      setUserStats(stats);
    } catch (error) {
      toast.error('Gagal memuat data');
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = async (packageId: number) => {
    try {
      const session = await trpc.startQuizSession.mutate({
        user_id: user.id,
        quiz_package_id: packageId
      });
      setActiveSession(session);
      setActiveTab('quiz');
      toast.success('🚀 Quiz dimulai! Semangat!');
    } catch (error) {
      toast.error('❌ Gagal memulai quiz');
      console.error('Error starting quiz:', error);
    }
  };

  const handleQuizComplete = () => {
    setActiveSession(null);
    setActiveTab('results');
    loadData(); // Refresh data
  };

  const activePackages = quizPackages.filter(pkg => pkg.is_active);
  const completionRate = userStats ? 
    Math.round((userStats.total_quizzes_taken / Math.max(activePackages.length, 1)) * 100) : 0;

  if (activeSession && activeTab === 'quiz') {
    return (
      <div className="min-h-screen">
        <QuizTaking 
          session={activeSession} 
          user={user}
          onComplete={handleQuizComplete}
          onExit={() => {
            setActiveSession(null);
            setActiveTab('dashboard');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🎓 Dashboard Peserta
            </h1>
            <p className="text-gray-600 mt-1">
              Selamat datang, <span className="font-semibold">{user.username}</span>! Siap untuk latihan CPNS hari ini?
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
                  <p className="text-blue-100 text-sm font-medium">Total Latihan</p>
                  <p className="text-3xl font-bold">{userStats?.total_quizzes_taken || 0}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Nilai Terbaik</p>
                  <p className="text-3xl font-bold">{userStats?.best_score?.toFixed(1) || 0}</p>
                </div>
                <Trophy className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Rata-rata Nilai</p>
                  <p className="text-3xl font-bold">{userStats?.average_score?.toFixed(1) || 0}</p>
                </div>
                <Target className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Waktu Belajar</p>
                  <p className="text-3xl font-bold">{userStats?.total_time_spent_minutes || 0}</p>
                  <p className="text-orange-100 text-xs">menit</p>
                </div>
                <Clock className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        {userStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Progress Belajar
              </CardTitle>
              <CardDescription>
                Pantau perkembangan latihan soal CPNS Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tingkat Penyelesaian</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-3" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">{userStats.total_quizzes_taken}</div>
                  <div className="text-sm text-blue-600">Quiz Diselesaikan</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{userStats.average_score.toFixed(1)}</div>
                  <div className="text-sm text-green-600">Nilai Rata-rata</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-800">{Math.floor(userStats.total_time_spent_minutes / 60)}h {userStats.total_time_spent_minutes % 60}m</div>
                  <div className="text-sm text-purple-600">Total Belajar</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">🏠 Dashboard</TabsTrigger>
            <TabsTrigger value="quiz">📝 Mulai Quiz</TabsTrigger>
            <TabsTrigger value="results">📊 Hasil Quiz</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 Paket Quiz Tersedia
                  </CardTitle>
                  <CardDescription>
                    Pilih paket soal untuk berlatih
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : activePackages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Belum ada paket quiz yang aktif</p>
                      <p className="text-sm">Tunggu admin mengaktifkan paket quiz</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activePackages.slice(0, 4).map((pkg: QuizPackage) => (
                        <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{pkg.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {pkg.total_questions} soal • {pkg.time_limit_minutes} menit
                                </p>
                                {pkg.description && (
                                  <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleStartQuiz(pkg.id)}
                                className="ml-4"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Mulai
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {activePackages.length > 4 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setActiveTab('quiz')}
                        >
                          Lihat Semua Paket ({activePackages.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏆 Pencapaian Terbaru
                  </CardTitle>
                  <CardDescription>
                    Hasil quiz terakhir yang telah diselesaikan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {quizResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Belum ada hasil quiz</p>
                      <p className="text-sm">Mulai quiz pertama Anda!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quizResults.slice(0, 5).map((result: QuizResult, index) => (
                        <div key={result.session_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{result.quiz_package_title}</div>
                            <div className="text-xs text-gray-500">
                              {result.completed_at.toLocaleDateString()} • 
                              {Math.floor(result.completion_time_minutes)}m {Math.round((result.completion_time_minutes % 1) * 60)}s
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {result.total_score.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {result.total_correct}/{result.total_questions}
                            </div>
                          </div>
                        </div>
                      ))}
                      {quizResults.length > 5 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setActiveTab('results')}
                        >
                          Lihat Semua Hasil
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tips Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💡 Tips Sukses CPNS
                </CardTitle>
                <CardDescription>
                  Strategi dan tips untuk memaksimalkan hasil latihan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">⏰ Manajemen Waktu</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Alokasikan ~65 detik per soal</li>
                      <li>• Kerjakan soal mudah terlebih dahulu</li>
                      <li>• Jangan terlalu lama pada satu soal</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">🎯 Strategi Pengerjaan</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Baca soal dengan cermat</li>
                      <li>• Eliminasi jawaban yang jelas salah</li>
                      <li>• Gunakan teknik educated guess</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">📚 Persiapan Mental</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Latihan rutin setiap hari</li>
                      <li>• Analisis hasil untuk perbaikan</li>
                      <li>• Jaga kondisi fisik dan mental</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">📝 Teknik Ujian</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Review jawaban sebelum submit</li>
                      <li>• Tetap tenang dan fokus</li>
                      <li>• Jangan panik jika ada soal sulit</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🚀 Mulai Quiz Baru
                </CardTitle>
                <CardDescription>
                  Pilih paket soal yang ingin Anda kerjakan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activePackages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">Belum Ada Paket Quiz</h3>
                    <p>Belum ada paket quiz yang aktif saat ini.</p>
                    <p className="text-sm">Hubungi admin untuk mengaktifkan paket quiz.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activePackages.map((pkg: QuizPackage) => (
                      <Card key={pkg.id} className="hover:shadow-lg transition-all">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{pkg.title}</CardTitle>
                              {pkg.description && (
                                <CardDescription className="mt-1">{pkg.description}</CardDescription>
                              )}
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Aktif
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                              <div className="text-lg font-semibold text-blue-800">{pkg.total_questions}</div>
                              <div className="text-xs text-blue-600">Soal</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                              <div className="text-lg font-semibold text-orange-800">{pkg.time_limit_minutes}</div>
                              <div className="text-xs text-orange-600">Menit</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <Target className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                              <div className="text-lg font-semibold text-purple-800">A-E</div>
                              <div className="text-xs text-purple-600">Pilihan</div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleStartQuiz(pkg.id)}
                            className="w-full"
                            size="lg"
                          >
                            <Play className="w-5 h-5 mr-2" />
                            Mulai Quiz Sekarang
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <QuizResults userId={user.id} results={quizResults} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}