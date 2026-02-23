import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { productAddonsService } from '@/lib/services';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { ProductAddon } from '@/types';

export default function MasterDataProductAddonsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductAddon | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const { data: addons, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['product-addons'],
    queryFn: () => productAddonsService.getAll(),
  });

  const saveMutation = useMutation({
    mutationFn: async (dto: { name: string; price: number; description?: string }) => {
      if (editing) return productAddonsService.update(editing.id, dto);
      return productAddonsService.create(dto);
    },
    onSuccess: () => {
      showToast(editing ? 'Addon berhasil diperbarui' : 'Addon berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menyimpan', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productAddonsService.delete(id),
    onSuccess: () => {
      showToast('Addon berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menghapus', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setDescription('');
    setShowForm(true);
  };

  const openEdit = (a: ProductAddon) => {
    setEditing(a);
    setName(a.name);
    setPrice(String(a.price));
    setDescription(a.description ?? '');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p < 0) {
      showToast('Nama dan harga harus valid', 'error');
      return;
    }
    saveMutation.mutate({
      name: name.trim(),
      price: p,
      description: description.trim() || undefined,
    });
  };

  const handleDelete = (a: ProductAddon) => {
    Alert.alert('Hapus Addon', `Yakin hapus "${a.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(a.id) },
    ]);
  };

  const items: ProductAddon[] = addons ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Addon Produk</Text>
      </View>

      <Button title="+ Tambah Addon" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={items}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardPrice}>
              Rp {Number(item.price).toLocaleString('id-ID')}
            </Text>
            {item.description ? (
              <Text style={styles.cardDesc}>{item.description}</Text>
            ) : null}
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)}>
                <Text style={styles.actionEdit}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item)}>
                <Text style={styles.actionDelete}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : (
            <Text style={styles.empty}>Tidak ada addon</Text>
          )
        }
      />

      {showForm && (
        <Modal visible onClose={closeForm} title={editing ? 'Edit Addon' : 'Tambah Addon'}>
          <Input label="Nama" value={name} onChangeText={setName} />
          <Input label="Harga" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <Input label="Deskripsi" value={description} onChangeText={setDescription} />
          <View style={styles.modalActions}>
            <Button title="Batal" variant="outline" onPress={closeForm} style={styles.modalBtn} />
            <Button title="Simpan" onPress={handleSubmit} loading={saveMutation.isPending} style={styles.modalBtn} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  addBtn: { margin: 16 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardPrice: { fontSize: 16, fontWeight: '600', color: '#10b981' },
  cardDesc: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
