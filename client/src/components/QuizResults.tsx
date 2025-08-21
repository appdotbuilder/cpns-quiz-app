import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Trophy, Clock, Target, Eye, TrendingUp, Calendar } from 'lucide-react';
import type { QuizResult, QuizResultDetail, QuizResultDetails } from './types';

interface QuizResultsProps {
  userId: number;
  results: QuizResult[];
}



export function QuizResults({ userId, results }: QuizResultsProps) {
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [resultDetails, setResultDetails] = useState<QuizResultDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = async (result: QuizResult) => {
    setSelectedResult(result);
    setIsLoadingDetails(true);
    setDetailsOpen(true);
    
    try {
      const response = await trpc.getQuizResultDetails.query({ sessionId: result.session_id });
      if (response && response.answers) {
        // Transform the API response to match our component's expected format
        const transformedDetails: QuizResultDetail[] = response.answers.map(item => ({
          question: item.question,
          user_answer: item.userAnswer.selected_answer,
          is_correct: item.userAnswer.is_correct
        }));
        setResultDetails(transformedDetails);
      } else {
        setResultDetails([]);
        toast.info('Tidak ada detail jawaban untuk quiz ini');
      }
    } catch (error) {
      toast.error('Gagal memuat detail hasil');
      console.error('Error loading result details:', error);
      setResultDetails([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: '🏆 Excellent', class: 'bg-green-100 text-green-800' };
    if (score >= 60) return { variant: 'secondary' as const, text: '👍 Good', class: 'bg-yellow-100 text-yellow-800' };
    return { variant: 'destructive' as const, text: '📝 Need Practice', class: 'bg-red-100 text-red-800' };
  };

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Belum Ada Hasil Quiz</h3>
          <p className="text-gray-500 mb-6">
            Selesaikan quiz pertama Anda untuk melihat hasilnya di sini
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Halaman
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalQuizzes = results.length;
  const averageScore = results.reduce((sum, result) => sum + result.total_score, 0) / totalQuizzes;
  const bestScore = Math.max(...results.map(result => result.total_score));
  const totalTimeSpent = results.reduce((sum, result) => sum + result.completion_time_minutes, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{totalQuizzes}</div>
            <div className="text-sm text-gray-600">Quiz Diselesaikan</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
              {averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Nilai Rata-rata</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getScoreColor(bestScore)}`}>
              {bestScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Nilai Terbaik</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor(totalTimeSpent / 60)}h {Math.round(totalTimeSpent % 60)}m
            </div>
            <div className="text-sm text-gray-600">Total Waktu</div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Riwayat Hasil Quiz
          </CardTitle>
          <CardDescription>
            Detail hasil dari setiap quiz yang telah diselesaikan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result: QuizResult, index) => {
              const scoreBadge = getScoreBadge(result.total_score);
              const percentage = (result.total_correct / result.total_questions) * 100;
              
              return (
                <Card key={result.session_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {result.quiz_package_title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {result.completed_at.toLocaleDateString('id-ID', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(result.completion_time_minutes)}m {Math.round((result.completion_time_minutes % 1) * 60)}s
                          </span>
                        </div>
                      </div>
                      <Badge className={scoreBadge.class}>
                        {scoreBadge.text}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className={`text-2xl font-bold ${getScoreColor(result.total_score)}`}>
                          {result.total_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-blue-600">Nilai</div>
                      </div>
                      
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-800">
                          {result.total_correct}
                        </div>
                        <div className="text-xs text-green-600">Benar</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-800">
                          {result.total_questions - result.total_correct}
                        </div>
                        <div className="text-xs text-gray-600">Salah</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Tingkat Keberhasilan</span>
                        <span className="font-semibold">{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(result)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Lihat Detail Jawaban
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Result Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              📋 Detail Hasil: {selectedResult?.quiz_package_title}
            </DialogTitle>
            <DialogDescription>
              Review jawaban Anda dan penjelasan untuk setiap soal
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : resultDetails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-semibold mb-2">Detail Tidak Tersedia</p>
              <p className="text-sm">Detail jawaban untuk quiz ini tidak tersedia saat ini.</p>
              <p className="text-sm">Fitur ini sedang dalam pengembangan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {selectedResult && (
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className={`text-xl font-bold ${getScoreColor(selectedResult.total_score)}`}>
                          {selectedResult.total_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">Nilai Final</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">
                          {selectedResult.total_correct}
                        </div>
                        <div className="text-xs text-gray-600">Benar</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-red-600">
                          {selectedResult.total_questions - selectedResult.total_correct}
                        </div>
                        <div className="text-xs text-gray-600">Salah</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-600">
                          {Math.floor(selectedResult.completion_time_minutes)}m
                        </div>
                        <div className="text-xs text-gray-600">Waktu</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Question Details */}
              <div className="space-y-4">
                {resultDetails.map((detail: QuizResultDetail, index) => (
                  <Card key={detail.question.id} className={`border-l-4 ${
                    detail.is_correct ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'
                  }`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Soal #{detail.question.order_number}</span>
                        <Badge variant={detail.is_correct ? 'default' : 'destructive'}>
                          {detail.is_correct ? '✅ Benar' : '❌ Salah'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-white rounded border">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {detail.question.question_text}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {[
                          { key: 'A', text: detail.question.option_a },
                          { key: 'B', text: detail.question.option_b },
                          { key: 'C', text: detail.question.option_c },
                          { key: 'D', text: detail.question.option_d },
                          { key: 'E', text: detail.question.option_e },
                        ].map((option) => {
                          const isCorrect = option.key === detail.question.correct_answer;
                          const isUserAnswer = option.key === detail.user_answer;
                          
                          return (
                            <div 
                              key={option.key} 
                              className={`p-3 rounded border text-sm ${
                                isCorrect 
                                  ? 'bg-green-100 border-green-300 text-green-800' 
                                  : isUserAnswer
                                  ? 'bg-red-100 border-red-300 text-red-800'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-semibold min-w-[20px]">{option.key}.</span>
                                <span>{option.text}</span>
                                {isCorrect && <span className="ml-auto">✅ Benar</span>}
                                {isUserAnswer && !isCorrect && <span className="ml-auto">👈 Pilihan Anda</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {detail.question.explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>💡 Penjelasan:</strong> {detail.question.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}