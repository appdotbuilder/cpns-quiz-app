import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Flag, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { User, QuizSession, Question } from './types';

interface QuizTakingProps {
  session: QuizSession;
  user: User;
  onComplete: () => void;
  onExit: () => void;
}

interface QuizAnswer {
  question_id: number;
  selected_answer: 'A' | 'B' | 'C' | 'D' | 'E' | null;
}

export function QuizTaking({ session, user, onComplete, onExit }: QuizTakingProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(session.time_remaining_seconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load questions for the quiz
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const packageQuestions = await trpc.getQuestionsByPackage.query({ 
          packageId: session.quiz_package_id 
        });
        setQuestions(packageQuestions);
        // Initialize answers array
        setAnswers(packageQuestions.map((q: Question) => ({
          question_id: q.id,
          selected_answer: null
        })));
      } catch (error) {
        toast.error('Gagal memuat soal quiz');
        console.error('Error loading questions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [session.quiz_package_id]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleAutoSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save session every 30 seconds
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (timeRemaining > 0) {
        trpc.updateQuizSession.mutate({
          id: session.id,
          time_remaining_seconds: timeRemaining
        }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(autoSave);
  }, [session.id, timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: number, answer: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setAnswers((prev) => 
      prev.map((ans) => 
        ans.question_id === questionId 
          ? { ...ans, selected_answer: answer }
          : ans
      )
    );
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const validAnswers = answers.filter(ans => ans.selected_answer !== null)
        .map(ans => ({
          question_id: ans.question_id,
          selected_answer: ans.selected_answer!
        }));

      await trpc.completeQuizSession.mutate({
        session_id: session.id,
        answers: validAnswers
      });

      toast.success('⏰ Waktu habis! Quiz otomatis diselesaikan.');
      onComplete();
    } catch (error) {
      toast.error('❌ Gagal menyimpan jawaban');
      console.error('Error auto-submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [session.id, answers, onComplete, isSubmitting]);

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const validAnswers = answers.filter(ans => ans.selected_answer !== null)
        .map(ans => ({
          question_id: ans.question_id,
          selected_answer: ans.selected_answer!
        }));

      await trpc.completeQuizSession.mutate({
        session_id: session.id,
        answers: validAnswers
      });

      toast.success('🎉 Quiz berhasil diselesaikan!');
      onComplete();
    } catch (error) {
      toast.error('❌ Gagal menyelesaikan quiz');
      console.error('Error submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Memuat soal quiz...</p>
            <p className="text-sm text-gray-600">Mohon tunggu sebentar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-red-600 mb-2">Quiz Tidak Tersedia</p>
            <p className="text-sm text-gray-600 mb-4">Paket quiz ini tidak memiliki soal yang aktif.</p>
            <Button onClick={onExit} variant="outline">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(ans => ans.question_id === currentQuestion.id);
  const answeredCount = answers.filter(ans => ans.selected_answer !== null).length;
  const progress = (answeredCount / questions.length) * 100;
  
  // Time warning colors
  const getTimeColor = () => {
    const percentage = (timeRemaining / (session.time_remaining_seconds || 7200)) * 100;
    if (percentage <= 10) return 'text-red-600';
    if (percentage <= 25) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Timer and Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  🎯 Quiz CPNS - {user.username}
                </CardTitle>
                <CardDescription>
                  Soal {currentQuestionIndex + 1} dari {questions.length}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getTimeColor()}`}>
                    <Clock className="w-5 h-5 inline mr-1" />
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-gray-500">Waktu Tersisa</div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Keluar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Keluar dari Quiz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Yakin ingin keluar? Progress quiz akan hilang dan harus dimulai ulang.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={onExit}>
                        Ya, Keluar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress Pengerjaan</span>
                <span>{answeredCount} / {questions.length} terjawab</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">📋 Navigasi Soal</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {questions.map((question: Question, index) => {
                  const hasAnswer = answers.find(ans => ans.question_id === question.id)?.selected_answer !== null;
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <Button
                      key={question.id}
                      size="sm"
                      variant={isCurrent ? 'default' : hasAnswer ? 'secondary' : 'outline'}
                      className={`h-10 ${
                        isCurrent 
                          ? 'bg-blue-600 text-white' 
                          : hasAnswer 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'text-gray-600'
                      }`}
                      onClick={() => handleQuestionJump(index)}
                    >
                      {index + 1}
                      {hasAnswer && !isCurrent && (
                        <CheckCircle className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  );
                })}
              </div>
              
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded text-white text-center text-xs leading-6">N</div>
                  <span>Soal saat ini</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 border border-green-300 rounded text-green-800 text-center text-xs leading-6">N</div>
                  <span>Sudah dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border border-gray-300 rounded text-gray-600 text-center text-xs leading-6">N</div>
                  <span>Belum dijawab</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Question Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    Soal #{currentQuestion.order_number}
                  </CardTitle>
                  <Badge variant="outline">
                    {currentQuestionIndex + 1} / {questions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Answer Options */}
                <RadioGroup
                  value={currentAnswer?.selected_answer || ''}
                  onValueChange={(value: string) => 
                    handleAnswerSelect(currentQuestion.id, value as 'A' | 'B' | 'C' | 'D' | 'E')
                  }
                  className="space-y-3"
                >
                  {[
                    { key: 'A', text: currentQuestion.option_a },
                    { key: 'B', text: currentQuestion.option_b },
                    { key: 'C', text: currentQuestion.option_c },
                    { key: 'D', text: currentQuestion.option_d },
                    { key: 'E', text: currentQuestion.option_e },
                  ].map((option) => (
                    <div key={option.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                      <RadioGroupItem 
                        value={option.key} 
                        id={`option-${option.key}`}
                        className="mt-1"
                      />
                      <Label 
                        htmlFor={`option-${option.key}`} 
                        className="flex-1 cursor-pointer text-sm leading-relaxed"
                      >
                        <span className="font-semibold mr-2">{option.key}.</span>
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Sebelumnya
                  </Button>

                  <div className="text-sm text-gray-600">
                    {currentAnswer?.selected_answer ? (
                      <span className="text-green-600 font-medium">
                        ✅ Dijawab: {currentAnswer.selected_answer}
                      </span>
                    ) : (
                      <span className="text-orange-600 font-medium">
                        ⚠️ Belum dijawab
                      </span>
                    )}
                  </div>

                  {currentQuestionIndex === questions.length - 1 ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <Flag className="w-4 h-4 mr-2" />
                          Selesai Quiz
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Selesaikan Quiz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Anda telah menjawab {answeredCount} dari {questions.length} soal.
                            {answeredCount < questions.length && (
                              <span className="text-orange-600 font-semibold block mt-2">
                                ⚠️ Masih ada {questions.length - answeredCount} soal yang belum dijawab!
                              </span>
                            )}
                            <br /><br />
                            Yakin ingin menyelesaikan quiz ini? Aksi ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleSubmitQuiz}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Menyimpan...' : 'Ya, Selesaikan'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button onClick={handleNextQuestion}>
                      Selanjutnya
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{answeredCount}</div>
                    <div className="text-xs text-gray-600">Dijawab</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">{questions.length - answeredCount}</div>
                    <div className="text-xs text-gray-600">Belum</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{Math.round(progress)}%</div>
                    <div className="text-xs text-gray-600">Progress</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${getTimeColor()}`}>{formatTime(timeRemaining)}</div>
                    <div className="text-xs text-gray-600">Tersisa</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}