import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  productsService,
  storesService,
  paymentMethodsService,
  ordersService,
  transactionsService,
  CreateTransactionDto,
} from '@/lib/services';
import type { Product, Store, PaymentMethod, CreateOrderDto, Order } from '@/types';
import {
  isAutoPrintKitchenEnabled,
  isAutoPrintCustomerEnabled,
  shouldShowKitchenPrintButton,
  shouldShowCustomerPrintButton,
} from '@/lib/print-settings';
import ReceiptPrint from '@/components/ReceiptPrint';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  addons: Array<{
    addonId: number;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export default function CashierScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;

  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPayment, setShowPayment] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptType, setReceiptType] = useState<'kitchen' | 'customer'>('kitchen');
  const [receiptTransaction, setReceiptTransaction] = useState<{
    amount: number;
    change?: number;
    paymentMethod?: { name: string };
  } | null>(null);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 100],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsService.getAll({ limit: 100 }),
  });

  const products = productsData?.data ?? [];
  const stores = storesData?.data ?? [];
  const paymentMethods = paymentMethodsData?.data ?? [];

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category?.id === Number(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter((c) => c != null);
    return Array.from(new Map(cats.map((c) => [c!.id, c])).values());
  }, [products]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          addons: [],
        },
      ];
    });
    showToast(`${product.name} ditambahkan`, 'success');
  }, [showToast]);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          return { ...i, quantity: Math.max(1, newQty) };
        })
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const addAddon = useCallback(
    (productId: number, addon: NonNullable<Product['addons']>[0]) => {
      setCart((prev) =>
        prev.map((i) => {
          if (i.productId !== productId) return i;
          const existing = i.addons.find((a) => a.addonId === addon.id);
          if (existing) {
            return {
              ...i,
              addons: i.addons.map((a) =>
                a.addonId === addon.id ? { ...a, quantity: a.quantity + 1 } : a
              ),
            };
          }
          return {
            ...i,
            addons: [
              ...i.addons,
              { addonId: addon.id, name: addon.name, price: addon.price, quantity: 1 },
            ],
          };
        })
      );
    },
    []
  );

  const removeAddon = useCallback((productId: number, addonId: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        return {
          ...i,
          addons: i.addons
            .map((a) =>
              a.addonId === addonId ? { ...a, quantity: a.quantity - 1 } : a
            )
            .filter((a) => a.quantity > 0),
        };
      })
    );
  }, []);

  const { subtotal, total } = useMemo(() => {
    let sub = 0;
    cart.forEach((item) => {
      sub += item.product.price * item.quantity;
      item.addons.forEach((a) => {
        sub += a.price * a.quantity * item.quantity;
      });
    });
    return { subtotal: sub, total: sub };
  }, [cart]);

  const createOrderMutation = useMutation({
    mutationFn: (order: CreateOrderDto) => ordersService.create(order),
    onSuccess: (order) => {
      setCurrentOrder(order);
      setPaymentAmount(String(order.totalAmount));
      setShowPayment(true);
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Pesanan berhasil dibuat', 'success');
      if (isAutoPrintKitchenEnabled()) {
        setReceiptOrder(order);
        setReceiptType('kitchen');
        setReceiptTransaction(null);
        setShowReceipt(true);
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast(err?.response?.data?.message ?? 'Gagal membuat pesanan', 'error');
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (tx: CreateTransactionDto) => transactionsService.create(tx),
    onSuccess: (transaction) => {
      setShowPayment(false);
      const order = transaction.order;
      setCurrentOrder(null);
      setSelectedPaymentMethodId(null);
      setPaymentAmount('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Pembayaran berhasil', 'success');
      if (isAutoPrintCustomerEnabled() && order) {
        const orderTotal = Number(order.totalAmount);
        const change = Math.max(0, transaction.amount - orderTotal);
        setReceiptOrder(order);
        setReceiptType('customer');
        setReceiptTransaction({
          amount: transaction.amount,
          change,
          paymentMethod: transaction.paymentMethod,
        });
        setShowReceipt(true);
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast(err?.response?.data?.message ?? 'Gagal memproses pembayaran', 'error');
    },
  });

  const handleCreateOrder = useCallback(() => {
    if (cart.length === 0) {
      showToast('Keranjang kosong', 'error');
      return;
    }
    if (!selectedStoreId) {
      showToast('Pilih toko terlebih dahulu', 'error');
      return;
    }
    const orderData: CreateOrderDto = {
      storeId: selectedStoreId,
      customerName: customerName.trim() || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        addons:
          item.addons.length > 0
            ? item.addons.map((a) => ({
                addonId: a.addonId,
                price: a.price,
                quantity: a.quantity,
              }))
            : undefined,
      })),
    };
    createOrderMutation.mutate(orderData);
  }, [
    cart,
    selectedStoreId,
    customerName,
    createOrderMutation,
    showToast,
  ]);

  const handlePayment = useCallback(() => {
    if (!currentOrder || !selectedStoreId || !selectedPaymentMethodId) return;
    const orderTotal = Number(currentOrder.totalAmount);
    const amount = parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) || 0;
    if (amount < orderTotal) {
      showToast('Jumlah pembayaran kurang', 'error');
      return;
    }
    createTransactionMutation.mutate({
      orderId: currentOrder.id,
      paymentMethodId: selectedPaymentMethodId,
      amount,
      storeId: selectedStoreId,
    });
  }, [
    currentOrder,
    selectedStoreId,
    selectedPaymentMethodId,
    paymentAmount,
    createTransactionMutation,
    showToast,
  ]);

  if (productsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header: Store selector */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[
              styles.storeChip,
              selectedCategory === 'all' && styles.storeChipActive,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[
                styles.storeChipText,
                selectedCategory === 'all' && styles.storeChipTextActive,
              ]}
            >
              Semua
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.storeChip,
                selectedCategory === String(cat.id) && styles.storeChipActive,
              ]}
              onPress={() => setSelectedCategory(String(cat.id))}
            >
              <Text
                style={[
                  styles.storeChipText,
                  selectedCategory === String(cat.id) && styles.storeChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          style={styles.search}
          placeholder="Cari produk..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={[styles.main, isNarrow && styles.mainColumn]}>
        {/* Products */}
        <View style={[styles.productsSection, isNarrow && styles.productsSectionFull]}>
          <FlatList
            data={filteredProducts}
            keyExtractor={(p) => String(p.id)}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
            renderItem={({ item }) => (
              <Pressable
                style={styles.productCard}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>
                  Rp {Number(item.price).toLocaleString('id-ID')}
                </Text>
              </Pressable>
            )}
          />
        </View>

        {/* Cart */}
        <View style={[styles.cartSection, isNarrow && styles.cartSectionFull]}>
          <Text style={styles.cartTitle}>Keranjang</Text>
          {stores.length > 0 && (
            <View style={styles.storeRow}>
              <Text style={styles.label}>Toko:</Text>
              <ScrollView horizontal>
                {stores.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.storeBtn,
                      selectedStoreId === s.id && styles.storeBtnActive,
                    ]}
                    onPress={() => setSelectedStoreId(s.id)}
                  >
                    <Text
                      style={[
                        styles.storeBtnText,
                        selectedStoreId === s.id && styles.storeBtnTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <Input
            placeholder="Nama pelanggan (opsional)"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <ScrollView style={styles.cartList}>
            {cart.map((item) => (
              <View key={item.productId} style={styles.cartItem}>
                <View style={styles.cartItemMain}>
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <View style={styles.cartItemQty}>
                    <Pressable
                      onPress={() => updateQuantity(item.productId, -1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.cartItemQtyText}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => updateQuantity(item.productId, 1)}
                      style={styles.qtyBtn}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => removeFromCart(item.productId)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </Pressable>
                </View>
                {item.product.addons && item.product.addons.length > 0 && (
                  <View style={styles.addonsRow}>
                    {item.product.addons.map((addon) => {
                      const cartAddon = item.addons.find((a) => a.addonId === addon.id);
                      const qty = cartAddon?.quantity ?? 0;
                      return (
                        <View key={addon.id} style={styles.addonChip}>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          <View style={styles.addonQty}>
                            <Pressable
                              onPress={() => removeAddon(item.productId, addon.id)}
                              style={styles.addonQtyBtn}
                            >
                              <Text>−</Text>
                            </Pressable>
                            <Text style={styles.addonQtyText}>{qty}</Text>
                            <Pressable
                              onPress={() => addAddon(item.productId, addon)}
                              style={styles.addonQtyBtn}
                            >
                              <Text>+</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              Rp {total.toLocaleString('id-ID')}
            </Text>
          </View>
          <Button
            title="Buat Pesanan"
            onPress={handleCreateOrder}
            disabled={cart.length === 0 || !selectedStoreId || createOrderMutation.isPending}
            loading={createOrderMutation.isPending}
          />
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPayment}
        onClose={() => {
          setShowPayment(false);
          setCurrentOrder(null);
          setSelectedPaymentMethodId(null);
          setPaymentAmount('');
        }}
        title="Pembayaran"
      >
        <Text style={styles.modalTotal}>
          Total: Rp {(currentOrder ? Number(currentOrder.totalAmount) : 0).toLocaleString('id-ID')}
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
          onPress={handlePayment}
          disabled={
            !currentOrder ||
            !selectedPaymentMethodId ||
            !paymentAmount ||
            parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) < Number(currentOrder?.totalAmount ?? 0) ||
            createTransactionMutation.isPending
          }
          loading={createTransactionMutation.isPending}
        />
      </Modal>

      {showReceipt && receiptOrder && shouldShowKitchenPrintButton() && receiptType === 'kitchen' && (
        <ReceiptPrint
          order={receiptOrder}
          type="kitchen"
          onClose={() => {
            setShowReceipt(false);
            setReceiptOrder(null);
          }}
          autoPrint={isAutoPrintKitchenEnabled()}
        />
      )}
      {showReceipt && receiptOrder && shouldShowCustomerPrintButton() && receiptType === 'customer' && (
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6b7280' },
  header: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
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
  search: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  main: { flex: 1, flexDirection: 'row' },
  mainColumn: { flexDirection: 'column' },
  productsSection: { flex: 1, padding: 12 },
  productsSectionFull: { maxHeight: 280 },
  productGrid: { paddingBottom: 16 },
  productCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 120,
  },
  productName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  productPrice: { fontSize: 12, color: '#10b981', marginTop: 4 },
  cartSection: {
    width: 280,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    padding: 12,
  },
  cartSectionFull: {
    width: '100%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flex: 1,
  },
  cartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  storeRow: { marginBottom: 8 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  storeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  storeBtnActive: { backgroundColor: '#4f46e5' },
  storeBtnText: { fontSize: 12 },
  storeBtnTextActive: { color: '#fff', fontWeight: '600' },
  cartList: { maxHeight: 200, marginBottom: 8 },
  cartItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartItemMain: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cartItemName: { flex: 1, fontSize: 14 },
  cartItemQty: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600' },
  cartItemQtyText: { marginHorizontal: 8, fontSize: 14, minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 18, color: '#ef4444' },
  addonsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  addonName: { fontSize: 11, marginRight: 4 },
  addonQty: { flexDirection: 'row', alignItems: 'center' },
  addonQtyBtn: { padding: 2 },
  addonQtyText: { fontSize: 12, marginHorizontal: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
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
});
