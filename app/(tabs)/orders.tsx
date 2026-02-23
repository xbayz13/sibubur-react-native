import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ordersService,
  storesService,
  paymentMethodsService,
  transactionsService,
  type CreateTransactionDto,
} from '@/lib/services';
import { getErrorMessage } from '@/lib/error-utils';
import { shouldShowCustomerPrintButton } from '@/lib/print-settings';
import ReceiptPrint from '@/components/ReceiptPrint';
import type { Order, Store, PaymentMethod } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type OrderFilter = 'open' | 'all';

function EditOrderForm({
  order,
  onSave,
  onCancel,
  loading,
}: {
  order: Order;
  onSave: (customerName: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [customerName, setCustomerName] = useState(order.customerName || '');
  return (
    <>
      <Input
        label="Nama Pelanggan"
        value={customerName}
        onChangeText={setCustomerName}
        placeholder="Nama pelanggan (opsional)"
      />
      <View style={styles.itemList}>
        {order.orderItems?.map((oi) => (
          <Text key={oi.id} style={styles.itemListRow}>
            {oi.quantity}x {oi.product?.name}
            {oi.orderItemAddons?.map((a) => ` + ${a.quantity}x ${a.addon?.name}`).join('')}
          </Text>
        ))}
      </View>
      <Text style={styles.editNote}>
        Catatan: Untuk mengubah item pesanan, batalkan pesanan dan buat pesanan baru.
      </Text>
      <View style={styles.modalActions}>
        <Button title="Batal" variant="outline" onPress={onCancel} style={styles.modalBtn} />
        <Button
          title="Simpan"
          onPress={() => onSave(customerName)}
          loading={loading}
          style={styles.modalBtn}
        />
      </View>
    </>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [filter, setFilter] = useState<OrderFilter>('open');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<{
    amount: number;
    change?: number;
    paymentMethod?: { name: string };
  } | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsService.getAll({ limit: 100 }),
  });

  const stores = storesData?.data ?? [];
  const paymentMethods = paymentMethodsData?.data ?? [];

  const {
    data: ordersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orders', selectedStoreId],
    queryFn: () =>
      ordersService.getAll({
        storeId: selectedStoreId,
        limit: 100,
      }),
    enabled: !!selectedStoreId,
  });

  const orders = ordersData?.data ?? [];
  const filteredOrders = useMemo(() => {
    if (filter === 'open') {
      return orders.filter((o) => o.status === 'open');
    }
    return orders;
  }, [orders, filter]);

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => ordersService.cancel(id),
    onSuccess: () => {
      setShowDetail(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Pesanan dibatalkan', 'success');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast(err?.response?.data?.message ?? 'Gagal membatalkan', 'error');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, customerName }: { orderId: number; customerName?: string }) =>
      ordersService.update(orderId, { customerName: customerName?.trim() || undefined }),
    onSuccess: () => {
      setShowEdit(false);
      setShowDetail(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Pesanan berhasil diperbarui', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err), 'error');
    },
  });

  const payOrderMutation = useMutation({
    mutationFn: async ({ orderId, pmId, amount }: { orderId: number; pmId: number; amount: number }) =>
      transactionsService.create({
        orderId,
        paymentMethodId: pmId,
        amount,
        storeId: selectedStoreId!,
      }),
    onSuccess: (transaction) => {
      setShowPayment(false);
      setShowDetail(false);
      setSelectedPaymentMethodId(null);
      setPaymentAmount('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Pembayaran berhasil', 'success');
      if (shouldShowCustomerPrintButton() && transaction.order) {
        const orderTotal = Number(transaction.order.totalAmount);
        const change = Math.max(0, transaction.amount - orderTotal);
        setReceiptOrder(transaction.order);
        setReceiptTransaction({
          amount: transaction.amount,
          change,
          paymentMethod: transaction.paymentMethod,
        });
        setShowReceipt(true);
      }
      setSelectedOrder(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast(err?.response?.data?.message ?? 'Gagal memproses pembayaran', 'error');
    },
  });

  const handlePay = useCallback(() => {
    if (!selectedOrder || !selectedStoreId || !selectedPaymentMethodId) return;
    const orderTotal = Number(selectedOrder.totalAmount);
    const amount = parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) || 0;
    if (amount < orderTotal) {
      showToast('Jumlah pembayaran kurang', 'error');
      return;
    }
    payOrderMutation.mutate({
      orderId: selectedOrder.id,
      pmId: selectedPaymentMethodId,
      amount,
    });
  }, [
    selectedOrder,
    selectedStoreId,
    selectedPaymentMethodId,
    paymentAmount,
    payOrderMutation,
    showToast,
  ]);

  const openPayModal = useCallback((order: Order) => {
    setSelectedOrder(order);
    setPaymentAmount(String(order.totalAmount));
    setShowDetail(false);
    setShowPayment(true);
  }, []);

  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => (
      <Pressable
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(item);
          setShowDetail(true);
        }}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'open' && styles.statusOpen,
              item.status === 'paid' && styles.statusPaid,
              item.status === 'canceled' && styles.statusCanceled,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === 'paid' && styles.statusTextWhite,
              ]}
            >
              {item.status === 'open' ? 'Open' : item.status === 'paid' ? 'Lunas' : 'Batal'}
            </Text>
          </View>
        </View>
        <Text style={styles.orderCustomer}>
          {item.customerName || '-'}
        </Text>
        <Text style={styles.orderTotal}>
          Rp {Number(item.totalAmount).toLocaleString('id-ID')}
        </Text>
      </Pressable>
    ),
    []
  );

  if (!selectedStoreId && stores.length > 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Store selector & filter */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pesanan</Text>
          <Pressable
            style={styles.createOrderBtn}
            onPress={() => router.push('/(tabs)/cashier')}
          >
            <Text style={styles.createOrderBtnText}>+ Buat Pesanan</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
          {stores.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.storeChip, selectedStoreId === s.id && styles.storeChipActive]}
              onPress={() => setSelectedStoreId(s.id)}
            >
              <Text
                style={[
                  styles.storeChipText,
                  selectedStoreId === s.id && styles.storeChipTextActive,
                ]}
              >
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterBtn, filter === 'open' && styles.filterBtnActive]}
            onPress={() => setFilter('open')}
          >
            <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>
              Open
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Semua
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#4f46e5" />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada pesanan</Text>
            </View>
          )
        }
      />

      {/* Order detail modal */}
      <Modal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedOrder(null); }}
        title={selectedOrder?.orderNumber}
      >
        {selectedOrder && (
          <>
            <Text style={styles.detailRow}>
              Pelanggan: {selectedOrder.customerName || '-'}
            </Text>
            <Text style={styles.detailRow}>
              Total: Rp {Number(selectedOrder.totalAmount).toLocaleString('id-ID')}
            </Text>
            <Text style={styles.detailRow}>
              Status: {selectedOrder.status}
            </Text>
            {selectedOrder.orderItems?.map((oi) => (
              <View key={oi.id} style={styles.detailItem}>
                <Text style={styles.detailItemName}>
                  {oi.product?.name} x{oi.quantity}
                </Text>
                <Text style={styles.detailItemPrice}>
                  Rp {Number(oi.lineTotal).toLocaleString('id-ID')}
                </Text>
              </View>
            ))}
            {selectedOrder.status === 'open' && (
              <View style={styles.detailActions}>
                <Button
                  title="Edit"
                  variant="outline"
                  onPress={() => {
                    setShowDetail(false);
                    setShowEdit(true);
                  }}
                  style={styles.detailBtn}
                />
                <Button
                  title="Bayar"
                  onPress={() => openPayModal(selectedOrder)}
                  style={styles.detailBtn}
                />
                <Button
                  title="Batalkan"
                  variant="danger"
                  onPress={() => cancelOrderMutation.mutate(selectedOrder.id)}
                  disabled={cancelOrderMutation.isPending}
                  loading={cancelOrderMutation.isPending}
                  style={styles.detailBtn}
                />
              </View>
            )}
          </>
        )}
      </Modal>

      {/* Edit order modal */}
      <Modal
        visible={showEdit}
        onClose={() => {
          setShowEdit(false);
          if (!showPayment) setSelectedOrder(null);
        }}
        title={`Edit ${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <EditOrderForm
            order={selectedOrder}
            onSave={(customerName) =>
              updateOrderMutation.mutate({
                orderId: selectedOrder.id,
                customerName,
              })
            }
            onCancel={() => setShowEdit(false)}
            loading={updateOrderMutation.isPending}
          />
        )}
      </Modal>

      {/* Payment modal */}
      <Modal
        visible={showPayment}
        onClose={() => {
          setShowPayment(false);
          setSelectedOrder(null);
          setSelectedPaymentMethodId(null);
          setPaymentAmount('');
        }}
        title="Pembayaran"
      >
        {selectedOrder && (
          <>
            <Text style={styles.modalTotal}>
              Total: Rp {Number(selectedOrder.totalAmount).toLocaleString('id-ID')}
            </Text>
            <Text style={styles.modalLabel}>Metode Pembayaran</Text>
            {paymentMethods.map((pm) => (
              <Pressable
                key={pm.id}
                style={[
                  styles.paymentMethodBtn,
                  selectedPaymentMethodId === pm.id && styles.paymentMethodBtnActive,
                ]}
                onPress={() => setSelectedPaymentMethodId(pm.id)}
              >
                <Text
                  style={[
                    styles.paymentMethodText,
                    selectedPaymentMethodId === pm.id && styles.paymentMethodTextActive,
                  ]}
                >
                  {pm.name}
                </Text>
              </Pressable>
            ))}
            <Input
              label="Jumlah Bayar (Rp)"
              placeholder="0"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />
            <Button
              title="Proses Pembayaran"
              onPress={handlePay}
              disabled={
                !selectedPaymentMethodId ||
                !paymentAmount ||
                parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) < Number(selectedOrder?.totalAmount ?? 0) ||
                payOrderMutation.isPending
              }
              loading={payOrderMutation.isPending}
            />
          </>
        )}
      </Modal>

      {showReceipt && receiptOrder && shouldShowCustomerPrintButton() && (
        <ReceiptPrint
          order={receiptOrder}
          type="customer"
          onClose={() => {
            setShowReceipt(false);
            setReceiptOrder(null);
            setReceiptTransaction(null);
          }}
          transaction={receiptTransaction ?? undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { padding: 24, alignItems: 'center' },
  loadingText: { color: '#6b7280' },
  header: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  createOrderBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createOrderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  storeScroll: { marginBottom: 8 },
  storeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  storeChipActive: { backgroundColor: '#4f46e5' },
  storeChipText: { fontSize: 14, color: '#374151' },
  storeChipTextActive: { color: '#fff', fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  filterBtnActive: { backgroundColor: '#4f46e5' },
  filterText: { fontSize: 14 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12 },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '600', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusOpen: { backgroundColor: '#fef3c7' },
  statusPaid: { backgroundColor: '#10b981' },
  statusCanceled: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '500' },
  statusTextWhite: { color: '#fff' },
  orderCustomer: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  orderTotal: { fontSize: 14, fontWeight: '600', color: '#10b981', marginTop: 4 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
  detailRow: { marginBottom: 8, fontSize: 14 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailItemName: { fontSize: 14 },
  detailItemPrice: { fontSize: 14, color: '#10b981' },
  detailActions: { marginTop: 16, gap: 8 },
  detailBtn: { marginBottom: 8 },
  modalTotal: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalLabel: { fontSize: 14, marginBottom: 8 },
  paymentMethodBtn: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentMethodBtnActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  paymentMethodText: { fontSize: 16 },
  paymentMethodTextActive: { color: '#4f46e5', fontWeight: '600' },
  itemList: { marginBottom: 12 },
  itemListRow: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  editNote: { fontSize: 12, color: '#92400e', backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
