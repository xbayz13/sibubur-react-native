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
import {
  permissionsService,
  type CreatePermissionDto,
  type UpdatePermissionDto,
} from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Permission } from '@/types';

function normalizePermissions(
  res: Permission[] | { data: Permission[] }
): Permission[] {
  return Array.isArray(res) ? res : res.data ?? [];
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [slug, setSlug] = useState('');

  const {
    data: permsRes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsService.getAll({ limit: 200 }),
  });

  const saveMutation = useMutation({
    mutationFn: async (dto: CreatePermissionDto | UpdatePermissionDto) => {
      if (editing) return permissionsService.update(editing.id, dto);
      return permissionsService.create(dto as CreatePermissionDto);
    },
    onSuccess: () => {
      showToast(editing ? 'Permission berhasil diperbarui' : 'Permission berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => permissionsService.delete(id),
    onSuccess: () => {
      showToast('Permission berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const permissions = normalizePermissions(permsRes ?? []);

  const openCreate = () => {
    setEditing(null);
    setModule('');
    setAction('');
    setSlug('');
    setShowForm(true);
  };

  const openEdit = (p: Permission) => {
    setEditing(p);
    setModule(p.module);
    setAction(p.action);
    setSlug(p.slug);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!module.trim() || !action.trim() || !slug.trim()) {
      showToast('Module, action, dan slug harus diisi', 'error');
      return;
    }
    saveMutation.mutate({
      module: module.trim(),
      action: action.trim(),
      slug: slug.trim(),
    });
  };

  const handleDelete = (p: Permission) => {
    Alert.alert('Hapus Permission', `Yakin hapus "${p.slug}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const byModule = permissions.reduce(
    (acc, p) => {
      const m = p.module || 'other';
      if (!acc[m]) acc[m] = [];
      acc[m].push(p);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Permission</Text>
        <Text style={styles.subtitle}>Kelola daftar permission</Text>
      </View>

      <Button title="+ Tambah Permission" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={Object.entries(byModule)}
        keyExtractor={([mod]) => mod}
        renderItem={({ item: [mod, perms] }) => (
          <View style={styles.moduleCard}>
            <Text style={styles.moduleTitle}>{mod}</Text>
            {perms.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardMain}>
                  <Text style={styles.cardSlug}>{p.slug}</Text>
                  <Text style={styles.cardAction}>{p.action}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openEdit(p)}>
                    <Text style={styles.actionEdit}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(p)}>
                    <Text style={styles.actionDelete}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : (
            <Text style={styles.empty}>Tidak ada permission</Text>
          )
        }
      />

      {showForm && (
        <Modal visible onClose={closeForm} title={editing ? 'Edit Permission' : 'Tambah Permission'}>
          <Input label="Module" value={module} onChangeText={setModule} placeholder="Contoh: products" />
          <Input label="Action" value={action} onChangeText={setAction} placeholder="Contoh: create" />
          <Input label="Slug" value={slug} onChangeText={setSlug} placeholder="Contoh: products.create" />
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
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  addBtn: { margin: 16 },
  list: { padding: 16 },
  moduleCard: { marginBottom: 16 },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMain: { flex: 1 },
  cardSlug: { fontSize: 14, fontWeight: '500', color: '#111827' },
  cardAction: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
