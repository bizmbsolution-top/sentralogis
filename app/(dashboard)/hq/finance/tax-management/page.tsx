'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Button, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  Input, 
  Textarea, 
  Select,
  Switch,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  Description,
  DescriptionItem,
  Toaster
} from '@/components/ui';
import { 
  TrendingUp, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Loader2,
  Plus,
  Save,
  X
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/format';

const TaxManagementPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    rate: 0,
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTaxes();
    }
  }, [profile]);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('md_taxes')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaxes(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat data pajak');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddTax = () => {
    setEditingTaxId(null);
    setFormData({
      code: '',
      name: '',
      rate: 0,
      description: '',
      is_active: true
    });
  };

  const handleEditTax = (tax: any) => {
    setEditingTaxId(tax.id);
    setFormData({
      code: tax.code,
      name: tax.name,
      rate: tax.rate,
      description: tax.description || '',
      is_active: tax.is_active
    });
  };

  const handleSaveTax = async () => {
    try {
      if (!formData.code || !formData.name || formData.rate < 0) {
        toast.error('Mohon lengkapi semua field dengan nilai yang valid');
        return;
      }

      const taxData = {
        ...formData,
        tenant_id: profile?.tenant_id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingTaxId) {
        // Update existing tax
        const { data, error } = await supabase
          .from('md_taxes')
          .update(taxData)
          .eq('id', editingTaxId);

        if (error) throw error;
        toast.success('Pajak berhasil diupdate');
      } else {
        // Insert new tax
        const { data, error } = await supabase
          .from('md_taxes')
          .insert([taxData])
          .select()
          .single();

        if (error) throw error;
        toast.success('Pajak berhasil ditambahkan');
      }

      setEditingTaxId(null);
      setFormData({
        code: '',
        name: '',
        rate: 0,
        description: '',
        is_active: true
      });
      await fetchTaxes();
    } catch (err: any) {
      toast.error('Gagal menyimpan pajak');
    }
  };

  const handleDeleteTax = async (id: string) => {
    try {
      const { error } = await supabase
        .from('md_taxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pajak berhasil dihapus');
      await fetchTaxes();
    } catch (err: any) {
      toast.error('Gagal menghapus pajak');
    }
  };

  const handleToggleStatus = async (tax: any) => {
    try {
      const { data, error } = await supabase
        .from('md_taxes')
        .update({ is_active: !tax.is_active })
        .eq('id', tax.id);

      if (error) throw error;
      toast.success(`Pajak ${tax.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      await fetchTaxes();
    } catch (err: any) {
      toast.error('Gagal mengubah status pajak');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:6 lg:p-8">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Master Pajak</h1>
        <p className="text-slate-600 mt-1">Kelola tarif pajak yang dapat dikonfigurasi sesuai dengan peraturan perpajakan Indonesia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:row-span-2">
          <div className="p-6">
            {editingTaxId ? (
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Edit Pajak</h2>
            ) : (
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Tambah Pajak Baru</h2>
            )}
            
            <form onSubmit={(e) => e.preventDefault()}>
              <Form>
                <FormField>
                  <FormLabel>Kode Pajak</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mis: PPN, PPH 23"
                      value={formData.code}
                      onChange={handleInputChange}
                      name="code"
                      required
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Nama Pajak</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mis: Pajak Pertambahan Nilai"
                      value={formData.name}
                      onChange={handleInputChange}
                      name="name"
                      required
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Tarief (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Mis: 11 untuk 11%"
                      value={formData.rate}
                      onChange={handleInputChange}
                      name="rate"
                      min="0"
                      step="0.1"
                      required
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mis: PPN 11% sesuai tarif perpajakan Indonesia"
                      value={formData.description}
                      onChange={handleInputChange}
                      name="description"
                      rows={3}
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Status Aktif</FormLabel>
                  <FormControl>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, is_active: checked }));
                      }}
                    >
                      Aktif
                    </Switch>
                  </FormControl>
                </FormField>

                <Button 
                  type="submit"
                  onClick={handleSaveTax}
                  className="w-full mt-4"
                >
                  {editingTaxId ? 'Update Pajak' : 'Tambah Pajak'}
                </Button>
                
                {editingTaxId && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingTaxId(null);
                      setFormData({
                        code: '',
                        name: '',
                        rate: 0,
                        description: '',
                        is_active: true
                      });
                    }}
                    className="w-full mt-2"
                  >
                    Batal
                  </Button>
                )}
              </Form>
            </form>
          </div>
        </Card>

        {/* Taxes Table Card */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Daftar Master Pajak</h2>
              <Button 
                variant="outline"
                onClick={handleAddTax}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah Pajak
              </Button>
            </div>
            
            {taxes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Belum ada data pajak. Tambah pajak pertama menggunakan form di sebelah kiri.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell className="w-20">Kode</TableCell>
                    <TableCell>Nama</TableCell>
                    <TableCell className="w-16 text-center">Rate</TableCell>
                    <TableCell className="w-24">Deskripsi</TableCell>
                    <TableCell className="w-16 text-center">Status</TableCell>
                    <TableCell className="w-20 text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow key={tax.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono">{tax.code}</TableCell>
                                  <TableCell>{tax.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                        {tax.rate}%
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={tax.description || '-'}>
                      {tax.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span 
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          tax.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {tax.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="flex justify-center space-x-2">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTax(tax)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="destructive"
                        ghost
                        size="sm"
                        onClick={() => handleDeleteTax(tax.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TaxManagementPage;