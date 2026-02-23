import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.subtitle}>
        Masuk sebagai {user?.name ?? user?.username ?? 'User'}
      </Text>

      <View style={styles.menuList}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/productions' as never)}
        >
          <Ionicons name="restaurant" size={24} color="#4f46e5" />
          <Text style={styles.menuText}>Produksi Harian</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/transactions' as never)}
        >
          <Ionicons name="card" size={24} color="#4f46e5" />
          <Text style={styles.menuText}>Transaksi</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/supplies' as never)}
        >
          <Ionicons name="cube" size={24} color="#4f46e5" />
          <Text style={styles.menuText}>Persediaan</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/expenses' as never)}
        >
          <Ionicons name="wallet" size={24} color="#4f46e5" />
          <Text style={styles.menuText}>Pengeluaran</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/employees' as never)}
        >
          <Ionicons name="people" size={24} color="#4f46e5" />
          <Text style={styles.menuText}>Karyawan & Absensi</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </Pressable>
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
