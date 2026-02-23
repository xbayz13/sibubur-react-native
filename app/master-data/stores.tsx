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
import { storesService } from '@/lib/services';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Store } from '@/types';

export default function MasterDataStoresScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [name, setName] = useState('');

  const {
    data: storesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: async (dto: { name: string }) => {
      if (editing) return storesService.update(editing.id, dto);
      return storesService.create(dto);
    },
    onSuccess: () => {
      showToast(editing ? 'Toko berhasil diperbarui' : 'Toko berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menyimpan', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storesService.delete(id),
    onSuccess: () => {
      showToast('Toko berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menghapus', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setShowForm(true);
  };

  const openEdit = (s: Store) => {
    setEditing(s);
    setName(s.name);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast('Nama harus diisi', 'error');
      return;
    }
    saveMutation.mutate({ name: name.trim() });
  };

  const handleDelete = (s: Store) => {
    Alert.alert('Hapus Toko', `Yakin hapus "${s.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(s.id) },
    ]);
  };

  const stores: Store[] = storesData?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Toko</Text>
      </View>

      <Button title="+ Tambah Toko" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={stores}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
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
            <Text style={styles.empty}>Tidak ada toko</Text>
          )
        }
      />

      {showForm && (
        <Modal visible onClose={closeForm} title={editing ? 'Edit Toko' : 'Tambah Toko'}>
          <Input label="Nama" value={name} onChangeText={setName} />
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
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
