import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessMenuItem } from '@/lib/permissions';

const SECTIONS = [
  {
    key: 'products',
    title: 'Produk',
    icon: 'pricetag' as const,
    permission: 'products.read',
  },
  {
    key: 'product-categories',
    title: 'Kategori Produk',
    icon: 'apps' as const,
    permission: 'product-categories.read',
  },
  {
    key: 'product-addons',
    title: 'Addon Produk',
    icon: 'add-circle' as const,
    permission: 'product-addons.read',
  },
  {
    key: 'stores',
    title: 'Toko',
    icon: 'storefront' as const,
    permission: 'stores.read',
  },
  {
    key: 'expense-categories',
    title: 'Kategori Pengeluaran',
    icon: 'card' as const,
    permission: 'expense-categories.read',
  },
] as const;

export default function MasterDataIndexScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Data Master</Text>
        <Text style={styles.subtitle}>Kelola data referensi</Text>
      </View>

      <View style={styles.list}>
        {SECTIONS.map((s) => {
          const allowed = hasPermission(s.permission);
          if (!allowed) return null;
          return (
            <Pressable
              key={s.key}
              style={styles.item}
              onPress={() =>
                router.push(`/master-data/${s.key}` as never)
              }
            >
              <Ionicons name={s.icon} size={24} color="#4f46e5" />
              <Text style={styles.itemText}>{s.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          );
        })}
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
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
});
