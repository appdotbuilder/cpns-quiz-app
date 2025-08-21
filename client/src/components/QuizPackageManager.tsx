import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Clock, HelpCircle } from 'lucide-react';
import type { QuizPackage, CreateQuizPackageInput, UpdateQuizPackageInput } from './types';

interface QuizPackageManagerProps {
  packages: QuizPackage[];
  onPackageUpdated: () => void;
  onManageQuestions: (pkg: QuizPackage) => void;
  currentUserId: number;
}

export function QuizPackageManager({ packages, onPackageUpdated, onManageQuestions, currentUserId }: QuizPackageManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<QuizPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateQuizPackageInput>({
    title: '',
    description: null,
    time_limit_minutes: 120,
    is_active: true,
    created_by: currentUserId
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: null,
      time_limit_minutes: 120,
      is_active: true,
      created_by: currentUserId
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createQuizPackage.mutate(formData);
      toast.success('🎉 Paket quiz berhasil dibuat!');
      setIsCreateOpen(false);
      resetForm();
      onPackageUpdated();
    } catch (error) {
      toast.error('❌ Gagal membuat paket quiz');
      console.error('Error creating quiz package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pkg: QuizPackage) => {
    setEditingPackage(pkg);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      time_limit_minutes: pkg.time_limit_minutes,
      is_active: pkg.is_active,
      created_by: currentUserId
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    setIsLoading(true);
    try {
      const updateData: UpdateQuizPackageInput = {
        id: editingPackage.id,
        title: formData.title,
        description: formData.description,
        time_limit_minutes: formData.time_limit_minutes,
        is_active: formData.is_active
      };
      await trpc.updateQuizPackage.mutate(updateData);
      toast.success('✅ Paket quiz berhasil diperbarui!');
      setIsEditOpen(false);
      resetForm();
      setEditingPackage(null);
      onPackageUpdated();
    } catch (error) {
      toast.error('❌ Gagal memperbarui paket quiz');
      console.error('Error updating quiz package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteQuizPackage.mutate({ id });
      toast.success('🗑️ Paket quiz berhasil dihapus!');
      onPackageUpdated();
    } catch (error) {
      toast.error('❌ Gagal menghapus paket quiz');
      console.error('Error deleting quiz package:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📦 Kelola Paket Quiz</h2>
          <p className="text-gray-600">Buat dan atur paket soal untuk quiz CPNS</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Buat Paket Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>🎯 Buat Paket Quiz Baru</DialogTitle>
              <DialogDescription>
                Isi detail paket quiz yang akan dibuat
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Paket</Label>
                <Input
                  id="title"
                  placeholder="Contoh: CPNS 2024 - Paket 1"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuizPackageInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi paket quiz ini..."
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateQuizPackageInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_limit">Batas Waktu (Menit)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min="30"
                  max="300"
                  value={formData.time_limit_minutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateQuizPackageInput) => ({ 
                      ...prev, 
                      time_limit_minutes: parseInt(e.target.value) || 120 
                    }))
                  }
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev: CreateQuizPackageInput) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Aktifkan paket</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Membuat...' : 'Buat Paket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Package List */}
      {packages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Belum Ada Paket Quiz</h3>
            <p className="text-gray-500 mb-6">
              Mulai dengan membuat paket quiz pertama Anda
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Paket Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg: QuizPackage) => (
            <Card key={pkg.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pkg.title}</CardTitle>
                    {pkg.description && (
                      <CardDescription className="mt-1">{pkg.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                    {pkg.is_active ? '✅ Aktif' : '⏸️ Nonaktif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <HelpCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-blue-800">{pkg.total_questions}</div>
                    <div className="text-xs text-blue-600">Soal</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-green-800">{pkg.time_limit_minutes}</div>
                    <div className="text-xs text-green-600">Menit</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-purple-800">A-E</div>
                    <div className="text-xs text-purple-600">Pilihan</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onManageQuestions(pkg)}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Kelola Soal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(pkg)}
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
                          Yakin ingin menghapus paket "{pkg.title}"? 
                          Semua soal dalam paket ini akan ikut terhapus dan tidak dapat dikembalikan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(pkg.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Edit Paket Quiz</DialogTitle>
            <DialogDescription>
              Perbarui detail paket quiz
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Judul Paket</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateQuizPackageInput) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi (Opsional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateQuizPackageInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time-limit">Batas Waktu (Menit)</Label>
              <Input
                id="edit-time-limit"
                type="number"
                min="30"
                max="300"
                value={formData.time_limit_minutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateQuizPackageInput) => ({ 
                    ...prev, 
                    time_limit_minutes: parseInt(e.target.value) || 120 
                  }))
                }
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev: CreateQuizPackageInput) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="edit-is-active">Aktifkan paket</Label>
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