import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  rolesService,
  permissionsService,
  rolePermissionsService,
} from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import Button from '@/components/ui/Button';
import type { Role, Permission } from '@/types';

function normalizePermissions(
  res: Permission[] | { data: Permission[] }
): Permission[] {
  return Array.isArray(res) ? res : res.data ?? [];
}

export default function RolePermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const roleId = id ? parseInt(id, 10) : 0;

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => rolesService.getById(roleId),
    enabled: !!roleId,
  });

  const {
    data: allPermsRes,
    isLoading: allPermsLoading,
    refetch: refetchAllPerms,
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsService.getAll({ limit: 200 }),
  });

  const {
    data: rolePerms,
    isLoading: rolePermsLoading,
    refetch: refetchRolePerms,
  } = useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: () => rolePermissionsService.getRolePermissions(roleId),
    enabled: !!roleId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      permissionId,
      isAssigned,
    }: {
      permissionId: number;
      isAssigned: boolean;
    }) => {
      if (isAssigned) {
        await rolePermissionsService.removePermission(roleId, permissionId);
      } else {
        await rolePermissionsService.addPermission(roleId, permissionId);
      }
    },
    onSuccess: (_, variables) => {
      showToast(
        variables.isAssigned ? 'Permission dihapus' : 'Permission ditambahkan',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const assignAllMutation = useMutation({
    mutationFn: () => {
      const all = normalizePermissions(allPermsRes!);
      return rolePermissionsService.assignPermissions(
        roleId,
        all.map((p) => p.id)
      );
    },
    onSuccess: () => {
      showToast('Semua permission ditetapkan', 'success');
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const removeAllMutation = useMutation({
    mutationFn: () => rolePermissionsService.assignPermissions(roleId, []),
    onSuccess: () => {
      showToast('Semua permission dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const handleRemoveAll = () => {
    Alert.alert(
      'Hapus Semua Permission',
      'Yakin hapus semua permission dari role ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => removeAllMutation.mutate(),
        },
      ]
    );
  };

  const refetch = () => {
    refetchAllPerms();
    refetchRolePerms();
  };

  const allPermissions = normalizePermissions(allPermsRes ?? []);
  const rolePermissions: Permission[] = rolePerms ?? [];
  const isLoading = roleLoading || allPermsLoading || rolePermsLoading;

  const permissionsByModule = allPermissions.reduce(
    (acc, perm) => {
      const mod = perm.module || 'other';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  if (!roleId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Role tidak ditemukan</Text>
        <Button title="Kembali" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Permission: {role?.name ?? '...'}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Pilih Semua"
          size="sm"
          variant="outline"
          onPress={() => assignAllMutation.mutate()}
          disabled={
            isLoading ||
            assignAllMutation.isPending ||
            allPermissions.length === 0
          }
          loading={assignAllMutation.isPending}
        />
        <Button
          title="Hapus Semua"
          size="sm"
          variant="danger"
          onPress={handleRemoveAll}
          disabled={isLoading || removeAllMutation.isPending}
          loading={removeAllMutation.isPending}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        >
          {Object.entries(permissionsByModule).map(([module, perms]) => (
            <View key={module} style={styles.moduleCard}>
              <Text style={styles.moduleTitle}>{module}</Text>
              {perms.map((p) => {
                const isAssigned = rolePermissions.some((rp) => rp.id === p.id);
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.permRow,
                      isAssigned && styles.permRowAssigned,
                    ]}
                    onPress={() =>
                      toggleMutation.mutate({
                        permissionId: p.id,
                        isAssigned,
                      })
                    }
                    disabled={toggleMutation.isPending}
                  >
                    <Text style={styles.permAction}>{p.action}</Text>
                    <Text style={styles.permSlug}>{p.slug}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        isAssigned && styles.checkboxChecked,
                      ]}
                    >
                      {isAssigned && <Text style={styles.check}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#ef4444', marginBottom: 16 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  loader: { marginTop: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  permRowAssigned: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  permAction: { fontSize: 14, fontWeight: '500', color: '#111827', flex: 1 },
  permSlug: { fontSize: 12, color: '#6b7280', marginRight: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  check: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
