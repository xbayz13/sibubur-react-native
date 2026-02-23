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
import { usersService, rolesService } from '@/lib/services';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { User, Role } from '@/types';

export default function UsersScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<number>(0);

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });

  const {
    data: usersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAll({ limit: 100 }),
  });

  const roles: Role[] = rolesData ?? [];
  const users: User[] = usersData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (dto: { username: string; password?: string; name: string; roleId: number }) => {
      if (editing) {
        const update: { username?: string; password?: string; name?: string; roleId?: number } = {
          username: dto.username,
          name: dto.name,
          roleId: dto.roleId,
        };
        if (dto.password) update.password = dto.password;
        return usersService.update(editing.id, update);
      }
      if (!dto.password) throw new Error('Password wajib untuk user baru');
      return usersService.create({
        username: dto.username,
        password: dto.password,
        name: dto.name,
        roleId: dto.roleId,
      });
    },
    onSuccess: () => {
      showToast(editing ? 'User berhasil diperbarui' : 'User berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menyimpan', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      showToast('User berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menghapus', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setUsername('');
    setPassword('');
    setName('');
    setRoleId(roles[0]?.id ?? 0);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setUsername(u.username);
    setPassword('');
    setName(u.name);
    setRoleId(u.roleId ?? u.role?.id ?? 0);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!username.trim() || !name.trim()) {
      showToast('Username dan nama harus diisi', 'error');
      return;
    }
    if (!editing && !password.trim()) {
      showToast('Password wajib untuk user baru', 'error');
      return;
    }
    if (!roleId) {
      showToast('Pilih role', 'error');
      return;
    }
    saveMutation.mutate({
      username: username.trim(),
      password: password.trim() || undefined,
      name: name.trim(),
      roleId,
    });
  };

  const handleDelete = (u: User) => {
    Alert.alert('Hapus User', `Yakin hapus "${u.username}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(u.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Pengguna</Text>
      </View>

      <Button title="+ Tambah User" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.username}</Text>
            <Text style={styles.cardRole}>{item.name} • {item.role?.name ?? '-'}</Text>
            <Text style={styles.cardStore}>{item.store?.name ?? '-'}</Text>
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
            <Text style={styles.empty}>Tidak ada user</Text>
          )
        }
      />

      {showForm && (
        <Modal visible onClose={closeForm} title={editing ? 'Edit User' : 'Tambah User'}>
          <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Input
            label={editing ? 'Password (kosongkan jika tidak diubah)' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input label="Nama" value={name} onChangeText={setName} />
          <Text style={styles.formLabel}>Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {roles.map((r) => (
              <Pressable
                key={r.id}
                style={[styles.chip, roleId === r.id && styles.chipActive]}
                onPress={() => setRoleId(r.id)}
              >
                <Text style={[styles.chipText, roleId === r.id && styles.chipTextActive]}>{r.name}</Text>
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
  cardRole: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  cardStore: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
