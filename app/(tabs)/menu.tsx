import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessMenuItem } from '@/lib/permissions';
import Button from '@/components/ui/Button';

const MENU_ITEMS: Array<{
  key: string;
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'productions', route: '/productions', label: 'Produksi Harian', icon: 'restaurant' },
  { key: 'transactions', route: '/transactions', label: 'Transaksi', icon: 'card' },
  { key: 'supplies', route: '/supplies', label: 'Persediaan', icon: 'cube' },
  { key: 'expenses', route: '/expenses', label: 'Pengeluaran', icon: 'wallet' },
  { key: 'employees', route: '/employees', label: 'Karyawan & Absensi', icon: 'people' },
  { key: 'master-data', route: '/master-data', label: 'Data Master', icon: 'layers' },
  { key: 'users', route: '/users', label: 'Pengguna', icon: 'person' },
  { key: 'roles', route: '/roles', label: 'Role & Izin', icon: 'shield-checkmark' },
  { key: 'permissions', route: '/permissions', label: 'Permission', icon: 'key' },
  { key: 'settings', route: '/settings', label: 'Pengaturan', icon: 'settings' },
];

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.subtitle}>
        Masuk sebagai {user?.name ?? user?.username ?? 'User'}
      </Text>

      <View style={styles.menuList}>
        {MENU_ITEMS.map((item) => {
          if (!canAccessMenuItem(item.label, hasPermission)) return null;
          return (
            <Pressable
              key={item.key}
              style={styles.menuItem}
              onPress={() => router.push(item.route as never)}
            >
              <Ionicons name={item.icon} size={24} color="#4f46e5" />
              <Text style={styles.menuText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button title="Keluar" variant="danger" onPress={logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  menuList: {
    marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  actions: {
    marginTop: 24,
  },
});
