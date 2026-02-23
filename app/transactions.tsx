import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  transactionsService,
  storesService,
} from '@/lib/services';
import { getLocalDateString } from '@/lib/date-utils';
import Input from '@/components/ui/Input';
import type { Transaction } from '@/types';

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [dateFilter, setDateFilter] = useState(getLocalDateString);

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const {
    data: transactionsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['transactions', selectedStoreId, dateFilter],
    queryFn: () =>
      transactionsService.getAll({
        storeId: selectedStoreId,
        date: dateFilter,
        limit: 100,
      }),
    enabled: !!selectedStoreId,
  });

  const stores = storesData?.data ?? [];
  const transactions = transactionsData?.data ?? [];

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <Text style={styles.txnNumber}>{item.transactionNumber}</Text>
      <Text style={styles.txnOrder}>Order: {item.order?.orderNumber}</Text>
      <Text style={styles.txnAmount}>
        Rp {Number(item.amount).toLocaleString('id-ID')}
      </Text>
      <Text style={styles.txnMethod}>{item.paymentMethod?.name}</Text>
      <Text style={styles.txnDate}>
        {new Date(item.createdAt).toLocaleString('id-ID')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Transaksi</Text>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Total Pendapatan</Text>
          <Text style={styles.sumValue}>
            Rp {totalRevenue.toLocaleString('id-ID')}
          </Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Jumlah Transaksi</Text>
          <Text style={styles.sumValue}>{transactions.length}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stores.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.chip,
                selectedStoreId === s.id && styles.chipActive,
              ]}
              onPress={() => setSelectedStoreId(s.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedStoreId === s.id && styles.chipTextActive,
                ]}
              >
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Input
          label="Tanggal"
          value={dateFilter}
          onChangeText={setDateFilter}
        />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(t) => String(t.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : (
            <Text style={styles.empty}>Tidak ada transaksi</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  sumCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  sumLabel: { fontSize: 12, color: '#059669', marginBottom: 4 },
  sumValue: { fontSize: 18, fontWeight: 'bold', color: '#047857' },
  filters: { paddingHorizontal: 16, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  dateLabel: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  txnNumber: { fontSize: 16, fontWeight: '600', color: '#111827' },
  txnOrder: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  txnAmount: { fontSize: 16, fontWeight: '600', color: '#10b981', marginTop: 4 },
  txnMethod: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  txnDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
