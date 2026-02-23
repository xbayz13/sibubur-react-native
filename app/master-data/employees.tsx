import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { employeesService, storesService } from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Employee, Store } from '@/types';

export default function MasterDataEmployeesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [storeId, setStoreId] = useState<number | undefined>();
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [dailySalary, setDailySalary] = useState('');

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const {
    data: employeesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.getAll({ limit: 100 }),
  });

  const stores: Store[] = storesData?.data ?? [];
  const employees: Employee[] = employeesData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (dto: { name: string; storeId?: number; status: 'active' | 'inactive'; dailySalary?: number }) => {
      if (editing) return employeesService.update(editing.id, dto);
      return employeesService.create(dto);
    },
    onSuccess: () => {
      showToast(editing ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeesService.delete(id),
    onSuccess: () => {
      showToast('Karyawan berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setStoreId(stores[0]?.id);
    setStatus('active');
    setDailySalary('');
    setShowForm(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setName(e.name);
    setStoreId(e.storeId ?? e.store?.id);
    setStatus(e.status ?? 'active');
    setDailySalary(e.dailySalary != null ? String(e.dailySalary) : '');
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
    saveMutation.mutate({
      name: name.trim(),
      storeId,
      status,
      dailySalary: dailySalary ? parseFloat(dailySalary) : undefined,
    });
  };

  const handleDelete = (e: Employee) => {
    Alert.alert('Hapus Karyawan', `Yakin hapus "${e.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(e.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Karyawan</Text>
      </View>

      <Button title="+ Tambah Karyawan" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={employees}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardStore}>{item.store?.name ?? '-'}</Text>
            <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{item.status === 'active' ? 'Aktif' : 'Tidak Aktif'}</Text>
            </View>
            {item.dailySalary != null && (
              <Text style={styles.cardSalary}>Gaji: Rp {Number(item.dailySalary).toLocaleString('id-ID')}/hari</Text>
            )}
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
            <Text style={styles.empty}>Tidak ada karyawan</Text>
          )
        }
      />

      {showForm && (
        <Modal visible onClose={closeForm} title={editing ? 'Edit Karyawan' : 'Tambah Karyawan'}>
          <Input label="Nama" value={name} onChangeText={setName} placeholder="Nama karyawan" />
          <Text style={styles.formLabel}>Status</Text>
          <View style={styles.statusRow}>
            <Pressable
              style={[styles.statusChip, status === 'active' && styles.statusChipActive]}
              onPress={() => setStatus('active')}
            >
              <Text style={[styles.statusChipText, status === 'active' && styles.statusChipTextActive]}>Aktif</Text>
            </Pressable>
            <Pressable
              style={[styles.statusChip, status === 'inactive' && styles.statusChipActive]}
              onPress={() => setStatus('inactive')}
            >
              <Text style={[styles.statusChipText, status === 'inactive' && styles.statusChipTextActive]}>Tidak Aktif</Text>
            </Pressable>
          </View>
          <Input
            label="Gaji Harian (opsional)"
            value={dailySalary}
            onChangeText={setDailySalary}
            placeholder="0"
            keyboardType="numeric"
          />
          <Text style={styles.formLabel}>Toko</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stores.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.chip, storeId === s.id && styles.chipActive]}
                onPress={() => setStoreId(s.id)}
              >
                <Text style={[styles.chipText, storeId === s.id && styles.chipTextActive]}>{s.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
  cardStore: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  badgeActive: { backgroundColor: '#d1fae5' },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  cardSalary: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  statusChipActive: { backgroundColor: '#4f46e5' },
  statusChipText: { fontSize: 14, color: '#374151' },
  statusChipTextActive: { color: '#fff', fontWeight: '600' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
