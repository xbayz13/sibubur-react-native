import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Pengaturan</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user?.username ?? '-'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.value}>{user?.name ?? user?.username ?? '-'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role?.name ?? '-'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Toko</Text>
          <Text style={styles.value}>{user?.store?.name ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplikasi</Text>
        <View style={styles.card}>
          <Text style={styles.appInfo}>SiBubur POS Mobile</Text>
          <Text style={styles.appVersion}>v1.0.0</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500', color: '#111827' },
  appInfo: { fontSize: 16, fontWeight: '600', color: '#111827' },
  appVersion: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
