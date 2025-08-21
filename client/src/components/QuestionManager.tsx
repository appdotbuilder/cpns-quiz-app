import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, HelpCircle, Package, CheckCircle } from 'lucide-react';
import type { Question, QuizPackage, CreateQuestionInput, UpdateQuestionInput } from './types';

interface QuestionManagerProps {
  selectedPackage: QuizPackage | null;
  packages: QuizPackage[];
  onPackageSelect: (pkg: QuizPackage) => void;
}

export function QuestionManager({ selectedPackage, packages, onPackageSelect }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateQuestionInput>({
    quiz_package_id: 0,
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    correct_answer: 'A',
    explanation: null,
    order_number: 1
  });

  useEffect(() => {
    if (selectedPackage) {
      loadQuestions(selectedPackage.id);
      setFormData((prev: CreateQuestionInput) => ({
        ...prev,
        quiz_package_id: selectedPackage.id,
        order_number: questions.length + 1
      }));
    }
  }, [selectedPackage]);

  useEffect(() => {
    if (questions.length > 0) {
      setFormData((prev: CreateQuestionInput) => ({
        ...prev,
        order_number: questions.length + 1
      }));
    }
  }, [questions]);

  const loadQuestions = async (packageId: number) => {
    try {
      setIsLoading(true);
      const packageQuestions = await trpc.getQuestionsByPackage.query({ packageId });
      setQuestions(packageQuestions);
    } catch (error) {
      toast.error('Gagal memuat soal');
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      quiz_package_id: selectedPackage?.id || 0,
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      correct_answer: 'A',
      explanation: null,
      order_number: questions.length + 1
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setIsLoading(true);
    try {
      await trpc.createQuestion.mutate(formData);
      toast.success('🎉 Soal berhasil dibuat!');
      setIsCreateOpen(false);
      resetForm();
      loadQuestions(selectedPackage.id);
    } catch (error) {
      toast.error('❌ Gagal membuat soal');
      console.error('Error creating question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      quiz_package_id: question.quiz_package_id,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      option_e: question.option_e,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      order_number: question.order_number
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setIsLoading(true);
    try {
      const updateData: UpdateQuestionInput = {
        id: editingQuestion.id,
        question_text: formData.question_text,
        option_a: formData.option_a,
        option_b: formData.option_b,
        option_c: formData.option_c,
        option_d: formData.option_d,
        option_e: formData.option_e,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation,
        order_number: formData.order_number
      };
      await trpc.updateQuestion.mutate(updateData);
      toast.success('✅ Soal berhasil diperbarui!');
      setIsEditOpen(false);
      resetForm();
      setEditingQuestion(null);
      if (selectedPackage) {
        loadQuestions(selectedPackage.id);
      }
    } catch (error) {
      toast.error('❌ Gagal memperbarui soal');
      console.error('Error updating question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteQuestion.mutate({ id });
      toast.success('🗑️ Soal berhasil dihapus!');
      if (selectedPackage) {
        loadQuestions(selectedPackage.id);
      }
    } catch (error) {
      toast.error('❌ Gagal menghapus soal');
      console.error('Error deleting question:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Package Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">❓ Kelola Soal</h2>
          <p className="text-gray-600">Buat dan atur soal untuk setiap paket quiz</p>
        </div>
      </div>

      {/* Package Selector */}
      <Card>
        <CardHeader>
          <CardTitle>📦 Pilih Paket Quiz</CardTitle>
          <CardDescription>
            Pilih paket quiz untuk mengelola soal-soalnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada paket quiz</p>
              <p className="text-sm">Buat paket quiz terlebih dahulu</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {packages.map((pkg: QuizPackage) => (
                <Card 
                  key={pkg.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => onPackageSelect(pkg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{pkg.title}</h3>
                        <p className="text-sm text-gray-600">
                          {pkg.total_questions} soal • {pkg.time_limit_minutes} menit
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                          {pkg.is_active ? '✅ Aktif' : '⏸️ Nonaktif'}
                        </Badge>
                        {selectedPackage?.id === pkg.id && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Management */}
      {selectedPackage && (
        <div className="space-y-4">
          {/* Question Stats & Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-semibold">Soal dalam "{selectedPackage.title}"</h3>
              <Badge variant="outline">
                {questions.length} / 110 soal
              </Badge>
              {questions.length >= 110 && (
                <Badge className="bg-green-100 text-green-800">
                  ✅ Lengkap
                </Badge>
              )}
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Soal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>🎯 Tambah Soal Baru</DialogTitle>
                  <DialogDescription>
                    Buat soal baru untuk paket "{selectedPackage.title}"
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question_text">Pertanyaan</Label>
                    <Textarea
                      id="question_text"
                      placeholder="Tulis pertanyaan di sini..."
                      value={formData.question_text}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateQuestionInput) => ({ ...prev, question_text: e.target.value }))
                      }
                      required
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="option_a">Pilihan A</Label>
                      <Input
                        id="option_a"
                        placeholder="Jawaban A"
                        value={formData.option_a}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ ...prev, option_a: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_b">Pilihan B</Label>
                      <Input
                        id="option_b"
                        placeholder="Jawaban B"
                        value={formData.option_b}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ ...prev, option_b: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_c">Pilihan C</Label>
                      <Input
                        id="option_c"
                        placeholder="Jawaban C"
                        value={formData.option_c}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ ...prev, option_c: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_d">Pilihan D</Label>
                      <Input
                        id="option_d"
                        placeholder="Jawaban D"
                        value={formData.option_d}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ ...prev, option_d: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_e">Pilihan E</Label>
                      <Input
                        id="option_e"
                        placeholder="Jawaban E"
                        value={formData.option_e}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ ...prev, option_e: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="correct_answer">Jawaban Benar</Label>
                      <Select
                        value={formData.correct_answer}
                        onValueChange={(value) =>
                          setFormData((prev: CreateQuestionInput) => ({ 
                            ...prev, 
                            correct_answer: value as 'A' | 'B' | 'C' | 'D' | 'E'
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order_number">Nomor Urut</Label>
                      <Input
                        id="order_number"
                        type="number"
                        min="1"
                        value={formData.order_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateQuestionInput) => ({ 
                            ...prev, 
                            order_number: parseInt(e.target.value) || 1 
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="explanation">Penjelasan (Opsional)</Label>
                    <Textarea
                      id="explanation"
                      placeholder="Penjelasan jawaban..."
                      value={formData.explanation || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateQuestionInput) => ({ 
                          ...prev, 
                          explanation: e.target.value || null 
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Menyimpan...' : 'Simpan Soal'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Belum Ada Soal</h3>
                <p className="text-gray-500 mb-6">
                  Mulai dengan menambahkan soal pertama untuk paket ini
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Soal Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question: Question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        Soal #{question.order_number}: {question.question_text}
                      </CardTitle>
                      <Badge variant="outline">
                        Jawaban: {question.correct_answer}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={question.correct_answer === 'A' ? 'default' : 'secondary'}
                          className="w-8 text-center"
                        >
                          A
                        </Badge>
                        <span className="text-sm">{question.option_a}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={question.correct_answer === 'B' ? 'default' : 'secondary'}
                          className="w-8 text-center"
                        >
                          B
                        </Badge>
                        <span className="text-sm">{question.option_b}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={question.correct_answer === 'C' ? 'default' : 'secondary'}
                          className="w-8 text-center"
                        >
                          C
                        </Badge>
                        <span className="text-sm">{question.option_c}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={question.correct_answer === 'D' ? 'default' : 'secondary'}
                          className="w-8 text-center"
                        >
                          D
                        </Badge>
                        <span className="text-sm">{question.option_d}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={question.correct_answer === 'E' ? 'default' : 'secondary'}
                          className="w-8 text-center"
                        >
                          E
                        </Badge>
                        <span className="text-sm">{question.option_e}</span>
                      </div>
                    </div>

                    {question.explanation && (
                      <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">
                          <strong>💡 Penjelasan:</strong> {question.explanation}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(question)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                            <AlertDialogDescription>
                              Yakin ingin menghapus soal #{question.order_number}? 
                              Aksi ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(question.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Question Dialog - Similar structure to Create Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Edit Soal</DialogTitle>
            <DialogDescription>
              Perbarui soal yang dipilih
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question_text">Pertanyaan</Label>
              <Textarea
                id="edit-question_text"
                value={formData.question_text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateQuestionInput) => ({ ...prev, question_text: e.target.value }))
                }
                required
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-option_a">Pilihan A</Label>
                <Input
                  id="edit-option_a"
                  value={formData.option_a}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ ...prev, option_a: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-option_b">Pilihan B</Label>
                <Input
                  id="edit-option_b"
                  value={formData.option_b}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ ...prev, option_b: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-option_c">Pilihan C</Label>
                <Input
                  id="edit-option_c"
                  value={formData.option_c}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ ...prev, option_c: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-option_d">Pilihan D</Label>
                <Input
                  id="edit-option_d"
                  value={formData.option_d}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ ...prev, option_d: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-option_e">Pilihan E</Label>
                <Input
                  id="edit-option_e"
                  value={formData.option_e}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ ...prev, option_e: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-correct_answer">Jawaban Benar</Label>
                <Select
                  value={formData.correct_answer}
                  onValueChange={(value) =>
                    setFormData((prev: CreateQuestionInput) => ({ 
                      ...prev, 
                      correct_answer: value as 'A' | 'B' | 'C' | 'D' | 'E'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order_number">Nomor Urut</Label>
                <Input
                  id="edit-order_number"
                  type="number"
                  min="1"
                  value={formData.order_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuestionInput) => ({ 
                      ...prev, 
                      order_number: parseInt(e.target.value) || 1 
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-explanation">Penjelasan (Opsional)</Label>
              <Textarea
                id="edit-explanation"
                value={formData.explanation || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateQuestionInput) => ({ 
                    ...prev, 
                    explanation: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Memperbarui...' : 'Perbarui'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}