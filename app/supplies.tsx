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
import { suppliesService } from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Supply } from '@/types';

type Filter = 'all' | 'low-stock';

export default function SuppliesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>('all');
  const [restockSupply, setRestockSupply] = useState<Supply | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const { data: suppliesData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['supplies', filter],
    queryFn: () =>
      filter === 'low-stock'
        ? suppliesService.getLowStock().then((items) => ({ data: items, total: items.length }))
        : suppliesService.getAll({ limit: 100 }),
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      suppliesService.restock(id, quantity),
    onSuccess: () => {
      showToast('Stok berhasil ditambahkan', 'success');
      setRestockSupply(null);
      setRestockQty('');
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const supplies: Supply[] =
    filter === 'low-stock'
      ? ((suppliesData as { data?: Supply[] })?.data ?? [])
      : ((suppliesData as { data?: Supply[] })?.data ?? []);

  const lowStockCount =
    filter === 'all'
      ? supplies.filter((s) => s.stock < s.minStock).length
      : supplies.length;

  const handleRestock = (supply: Supply) => {
    setRestockSupply(supply);
    setRestockQty('');
  };

  const handleRestockSubmit = () => {
    const qty = parseInt(restockQty, 10);
    if (!restockSupply || isNaN(qty) || qty <= 0) {
      showToast('Masukkan jumlah yang valid', 'error');
      return;
    }
    restockMutation.mutate({ id: restockSupply.id, quantity: qty });
  };

  const renderItem = ({ item }: { item: Supply }) => {
    const isLow = item.stock < item.minStock;
    return (
      <View style={[styles.card, isLow && styles.cardLow]}>
        <View style={styles.cardRow}>
          <Text style={styles.supplyName}>{item.name}</Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>Stok Rendah</Text>
            </View>
          )}
        </View>
        <Text style={styles.supplyStock}>
          Stok: {item.stock} {item.unit} (min: {item.minStock})
        </Text>
        {item.price != null && (
          <Text style={styles.supplyPrice}>
            Rp {Number(item.price).toLocaleString('id-ID')}/{item.unit}
          </Text>
        )}
        <Button
          title="Restock"
          variant="primary"
          size="sm"
          onPress={() => handleRestock(item)}
          style={styles.restockBtn}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Persediaan</Text>
      </View>

      {lowStockCount > 0 && filter === 'all' && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>
            {lowStockCount} persediaan dengan stok rendah
          </Text>
          <Pressable onPress={() => setFilter('low-stock')}>
            <Text style={styles.alertLink}>Lihat Stok Rendah</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[styles.chip, filter === 'all' && styles.chipActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[styles.chipText, filter === 'all' && styles.chipTextActive]}
            >
              Semua
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, filter === 'low-stock' && styles.chipActive]}
            onPress={() => setFilter('low-stock')}
          >
            <Text
              style={[
                styles.chipText,
                filter === 'low-stock' && styles.chipTextActive,
              ]}
            >
              Stok Rendah ({filter === 'all' ? lowStockCount : supplies.length})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        data={supplies}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color="#4f46e5"
              style={styles.loader}
            />
          ) : (
            <Text style={styles.empty}>
              {filter === 'low-stock'
                ? 'Tidak ada persediaan stok rendah'
                : 'Tidak ada persediaan'}
            </Text>
          )
        }
      />

      {restockSupply && (
        <Modal
          visible
          onClose={() => setRestockSupply(null)}
          title={`Restock: ${restockSupply.name}`}
        >
          <Input
            label="Jumlah"
            value={restockQty}
            onChangeText={setRestockQty}
            placeholder="0"
            keyboardType="numeric"
          />
          <Text style={styles.unitHint}>Satuan: {restockSupply.unit}</Text>
          <View style={styles.modalActions}>
            <Button
              title="Batal"
              variant="outline"
              onPress={() => setRestockSupply(null)}
              style={styles.modalBtn}
            />
            <Button
              title="Tambah Stok"
              onPress={handleRestockSubmit}
              loading={restockMutation.isPending}
              style={styles.modalBtn}
            />
          </View>
        </Modal>
      )}
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
  alert: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  alertText: { fontSize: 14, color: '#92400e' },
  alertLink: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 4,
  },
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
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLow: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplyName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  lowBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  supplyStock: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  supplyPrice: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  restockBtn: { marginTop: 12 },
  unitHint: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
