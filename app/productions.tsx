import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  productionsService,
  storesService,
  suppliesService,
  reportsService,
  type CreateProductionDto,
} from '@/lib/services';
import { getLocalDateString } from '@/lib/date-utils';
import type { Production, Store, Supply } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ProductionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(selectedDate);
  const [formStoreId, setFormStoreId] = useState<number | undefined>();
  const [formPorridgeAmount, setFormPorridgeAmount] = useState('');
  const [formSupplies, setFormSupplies] = useState<
    Array<{ supplyId: number; quantity: string }>
  >([]);
  const [showSupplyPicker, setShowSupplyPicker] = useState(false);
  const [pickingForIdx, setPickingForIdx] = useState<number | null>(null);

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const { data: suppliesData } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => suppliesService.getAll({ limit: 100 }),
  });

  const {
    data: productionsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['productions', selectedStoreId, selectedDate],
    queryFn: () =>
      productionsService.getAll({
        storeId: selectedStoreId,
        date: selectedDate,
        limit: 50,
      }),
    enabled: !!selectedStoreId,
  });

  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['recommendations', formDate, formStoreId],
    queryFn: () =>
      reportsService.getProductionRecommendations(
        formDate,
        formStoreId!,
        30
      ),
    enabled: showForm && !!formStoreId,
  });

  const stores = storesData?.data ?? [];
  const supplies = suppliesData?.data ?? [];
  const productions = productionsData?.data ?? [];

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const createMutation = useMutation({
    mutationFn: (data: CreateProductionDto) => productionsService.create(data),
    onSuccess: () => {
      setShowForm(false);
      setFormSupplies([]);
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      showToast('Produksi berhasil dicatat', 'success');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast(err?.response?.data?.message ?? 'Gagal mencatat produksi', 'error');
    },
  });

  const openForm = useCallback(() => {
    setFormDate(selectedDate);
    setFormStoreId(selectedStoreId ?? stores[0]?.id);
    setFormPorridgeAmount('');
    setFormSupplies([]);
    setShowForm(true);
  }, [selectedDate, selectedStoreId, stores]);

  const handleSubmit = useCallback(() => {
    if (!formStoreId) {
      showToast('Pilih toko', 'error');
      return;
    }
    const parsed = parseFloat(formPorridgeAmount);
    const porridge =
      formPorridgeAmount === '' || formPorridgeAmount === undefined || Number.isNaN(parsed)
        ? undefined
        : parsed;
    const supplyItems = formSupplies
      .filter((s) => s.supplyId && parseInt(String(s.quantity), 10) > 0)
      .map((s) => ({ supplyId: s.supplyId, quantity: parseInt(String(s.quantity), 10) }));

    createMutation.mutate({
      date: formDate,
      storeId: formStoreId,
      porridgeAmount: porridge,
      supplies: supplyItems.length > 0 ? supplyItems : undefined,
    });
  }, [
    formStoreId,
    formDate,
    formPorridgeAmount,
    formSupplies,
    createMutation,
    showToast,
  ]);

  const addSupplyRow = () => {
    if (supplies.length === 0) return;
    setFormSupplies((prev) => [...prev, { supplyId: supplies[0].id, quantity: '1' }]);
  };

  const removeSupplyRow = (idx: number) =>
    setFormSupplies((prev) => prev.filter((_, i) => i !== idx));

  const updateSupplyRow = (idx: number, field: 'supplyId' | 'quantity', value: number | string) =>
    setFormSupplies((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );

  const getSupplyName = (supplyId: number) =>
    supplies.find((s) => s.id === supplyId)?.name ?? '-';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Produksi Harian</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.filters}>
          <ScrollView horizontal>
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
            value={selectedDate}
            onChangeText={setSelectedDate}
          />
          <Button title="+ Tambah Produksi" onPress={openForm} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
        ) : productions.length === 0 ? (
          <Text style={styles.empty}>Belum ada data produksi</Text>
        ) : (
          productions.map((p) => (
            <Card key={p.id} style={styles.prodCard}>
              <Text style={styles.prodDate}>
                {new Date(p.date).toLocaleDateString('id-ID')}
              </Text>
              <Text style={styles.prodStore}>{p.store?.name}</Text>
              {p.porridgeAmount != null && (
                <Text style={styles.prodAmount}>
                  Porsi bubur: {p.porridgeAmount}
                </Text>
              )}
              {p.productionSupplies && p.productionSupplies.length > 0 && (
                <View style={styles.supplyList}>
                  {p.productionSupplies.map((ps) => (
                    <Text key={ps.id} style={styles.supplyItem}>
                      {ps.supply?.name}: {ps.quantity} {ps.supply?.unit}
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Tambah Produksi"
      >
        <Input
          label="Tanggal"
          value={formDate}
          onChangeText={setFormDate}
        />
        <Text style={styles.label}>Toko</Text>
        <ScrollView horizontal style={styles.storeRow}>
          {stores.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.storeBtn,
                formStoreId === s.id && styles.storeBtnActive,
              ]}
              onPress={() => setFormStoreId(s.id)}
            >
              <Text
                style={[
                  styles.storeBtnText,
                  formStoreId === s.id && styles.storeBtnTextActive,
                ]}
              >
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {recLoading ? (
          <Text style={styles.recText}>Memuat rekomendasi...</Text>
        ) : recommendations && (
          <Card style={styles.recCard}>
            <Text style={styles.recTitle}>Rekomendasi</Text>
            <Text style={styles.recAmount}>
              Porsi disarankan: {recommendations.recommendedAmount ?? '-'}
            </Text>
            {recommendations.recommendations?.map((r: string, i: number) => (
              <Text key={i} style={styles.recItem}>• {r}</Text>
            ))}
          </Card>
        )}
        <Input
          label="Jumlah Porsi Bubur"
          value={formPorridgeAmount}
          onChangeText={setFormPorridgeAmount}
          keyboardType="numeric"
          placeholder={recommendations?.recommendedAmount?.toString()}
        />
        <Text style={styles.label}>Bahan (opsional)</Text>
        {formSupplies.map((s, idx) => (
          <View key={idx} style={styles.supplyRow}>
            <Pressable
              style={styles.supplyPickerBtn}
              onPress={() => {
                setPickingForIdx(idx);
                setShowSupplyPicker(true);
              }}
            >
              <Text style={styles.supplyPickerText}>{getSupplyName(s.supplyId)}</Text>
            </Pressable>
            <Input
              value={s.quantity}
              onChangeText={(v) => updateSupplyRow(idx, 'quantity', v)}
              keyboardType="numeric"
              containerStyle={styles.qtyInput}
            />
            <Pressable onPress={() => removeSupplyRow(idx)}>
              <Text style={styles.removeBtn}>×</Text>
            </Pressable>
          </View>
        ))}
        {showSupplyPicker && pickingForIdx !== null && (
          <Modal
            visible={showSupplyPicker}
            onClose={() => { setShowSupplyPicker(false); setPickingForIdx(null); }}
            title="Pilih Bahan"
          >
            {supplies.map((sup) => (
              <Pressable
                key={sup.id}
                style={styles.supplyOption}
                onPress={() => {
                  updateSupplyRow(pickingForIdx, 'supplyId', sup.id);
                  setShowSupplyPicker(false);
                  setPickingForIdx(null);
                }}
              >
                <Text>{sup.name}</Text>
                <Text style={styles.supplyUnit}>{sup.unit}</Text>
              </Pressable>
            ))}
          </Modal>
        )}
        <Button
          title="Tambah Bahan"
          variant="outline"
          size="sm"
          onPress={addSupplyRow}
        />
        <View style={styles.formActions}>
          <Button
            title="Simpan"
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            loading={createMutation.isPending}
          />
          <Button
            title="Batal"
            variant="outline"
            onPress={() => setShowForm(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  content: { flex: 1, padding: 16 },
  filters: { marginBottom: 16 },
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
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  prodCard: { marginBottom: 12 },
  prodDate: { fontSize: 16, fontWeight: '600' },
  prodStore: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  prodAmount: { fontSize: 14, marginTop: 4 },
  supplyList: { marginTop: 8 },
  supplyItem: { fontSize: 13, color: '#6b7280' },
  label: { fontSize: 14, marginBottom: 8 },
  storeRow: { marginBottom: 12 },
  storeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  storeBtnActive: { backgroundColor: '#4f46e5' },
  storeBtnText: { fontSize: 14 },
  storeBtnTextActive: { color: '#fff', fontWeight: '600' },
  recText: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  recCard: { marginBottom: 16, backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  recTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  recAmount: { fontSize: 14, marginBottom: 8 },
  recItem: { fontSize: 13, color: '#374151', marginBottom: 2 },
  supplyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  supplyPickerBtn: { flex: 1, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, marginRight: 8 },
  supplyPickerText: { fontSize: 14 },
  supplyOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  supplyUnit: { fontSize: 12, color: '#6b7280' },
  removeBtn: { fontSize: 24, color: '#ef4444', padding: 8 },
  qtyInput: { width: 70, marginBottom: 0 },
  formActions: { marginTop: 16, gap: 8 },
});
