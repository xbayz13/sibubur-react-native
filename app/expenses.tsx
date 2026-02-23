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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  expensesService,
  expenseCategoriesService,
  storesService,
} from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import { getLocalDateString } from '@/lib/date-utils';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Expense, ExpenseCategory, Store } from '@/types';

export default function ExpensesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [dateFilter, setDateFilter] = useState(getLocalDateString);
  const [showForm, setShowForm] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState(0);
  const [formStoreId, setFormStoreId] = useState(0);
  const [formAmount, setFormAmount] = useState('');

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesService.getAll({ limit: 100 }),
  });

  const {
    data: expensesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['expenses', selectedStoreId, dateFilter],
    queryFn: () =>
      expensesService.getAll({
        storeId: selectedStoreId,
        date: dateFilter,
        limit: 100,
      }),
  });

  const stores: Store[] = storesData?.data ?? [];
  const categories: ExpenseCategory[] = categoriesData?.data ?? [];
  const expenses: Expense[] = expensesData?.data ?? [];

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const createMutation = useMutation({
    mutationFn: (dto: { expenseCategoryId: number; storeId: number; totalAmount: number }) =>
      expensesService.create(dto),
    onSuccess: () => {
      showToast('Pengeluaran berhasil ditambahkan', 'success');
      setShowForm(false);
      setFormCategoryId(0);
      setFormStoreId(selectedStoreId ?? 0);
      setFormAmount('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.totalAmount),
    0
  );

  const handleCreate = () => {
    if (categories.length === 0 || stores.length === 0) {
      showToast('Data kategori atau toko belum tersedia', 'error');
      return;
    }
    setFormCategoryId(categories[0].id);
    setFormStoreId(selectedStoreId ?? stores[0].id);
    setFormAmount('');
    setShowForm(true);
  };

  const handleSubmit = () => {
    const amount = parseFloat(formAmount);
    if (!formCategoryId || !formStoreId || isNaN(amount) || amount <= 0) {
      showToast('Lengkapi semua field dengan benar', 'error');
      return;
    }
    createMutation.mutate({
      expenseCategoryId: formCategoryId,
      storeId: formStoreId,
      totalAmount: amount,
    });
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <Text style={styles.expenseCat}>{item.category?.name ?? '-'}</Text>
      <Text style={styles.expenseStore}>{item.store?.name ?? '-'}</Text>
      <Text style={styles.expenseAmount}>
        Rp {Number(item.totalAmount).toLocaleString('id-ID')}
      </Text>
      <Text style={styles.expenseDate}>
        {new Date(item.createdAt).toLocaleDateString('id-ID')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Pengeluaran</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Total Pengeluaran</Text>
          <Text style={styles.sumValue}>
            Rp {totalExpenses.toLocaleString('id-ID')}
          </Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Jumlah</Text>
          <Text style={styles.sumValue}>{expenses.length}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[styles.chip, selectedStoreId === undefined && styles.chipActive]}
            onPress={() => setSelectedStoreId(undefined)}
          >
            <Text
              style={[
                styles.chipText,
                selectedStoreId === undefined && styles.chipTextActive,
              ]}
            >
              Semua Toko
            </Text>
          </Pressable>
          {stores.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.chip, selectedStoreId === s.id && styles.chipActive]}
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

      <View style={styles.headerActions}>
        <Button title="+ Tambah Pengeluaran" size="sm" onPress={handleCreate} />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => String(e.id)}
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
            <Text style={styles.empty}>Tidak ada pengeluaran</Text>
          )
        }
      />

      {showForm && (
        <Modal
          visible
          onClose={() => setShowForm(false)}
          title="Tambah Pengeluaran"
        >
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.formChip,
                    formCategoryId === c.id && styles.formChipActive,
                  ]}
                  onPress={() => setFormCategoryId(c.id)}
                >
                  <Text
                    style={[
                      styles.formChipText,
                      formCategoryId === c.id && styles.formChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Toko</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stores.map((s) => (
                <Pressable
                  key={s.id}
                  style={[
                    styles.formChip,
                    formStoreId === s.id && styles.formChipActive,
                  ]}
                  onPress={() => setFormStoreId(s.id)}
                >
                  <Text
                    style={[
                      styles.formChipText,
                      formStoreId === s.id && styles.formChipTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Input
            label="Jumlah (Rp)"
            value={formAmount}
            onChangeText={setFormAmount}
            placeholder="0"
            keyboardType="numeric"
          />
          <View style={styles.modalActions}>
            <Button
              title="Batal"
              variant="outline"
              onPress={() => setShowForm(false)}
              style={styles.modalBtn}
            />
            <Button
              title="Simpan"
              onPress={handleSubmit}
              loading={createMutation.isPending}
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
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  sumCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  sumLabel: { fontSize: 12, color: '#92400e', marginBottom: 4 },
  sumValue: { fontSize: 18, fontWeight: 'bold', color: '#92400e' },
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
  headerActions: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  expenseCat: { fontSize: 16, fontWeight: '600', color: '#111827' },
  expenseStore: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 4,
  },
  expenseDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  formRow: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  formChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  formChipActive: { backgroundColor: '#4f46e5' },
  formChipText: { fontSize: 14, color: '#374151' },
  formChipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
