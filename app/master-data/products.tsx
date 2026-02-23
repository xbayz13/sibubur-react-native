import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import {
  productsService,
  productCategoriesService,
} from '@/lib/services';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Product, ProductCategory } from '@/types';

export default function MasterDataProductsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productCategoriesService.getAll(),
  });

  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const categories: ProductCategory[] = categoriesData ?? [];
  const products: Product[] = productsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; description?: string; price: number; productCategoryId?: number }) =>
      productsService.create(dto),
    onSuccess: () => {
      showToast('Produk berhasil ditambahkan', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menambah produk', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { name?: string; description?: string; price?: number; productCategoryId?: number } }) =>
      productsService.update(id, dto),
    onSuccess: () => {
      showToast('Produk berhasil diperbarui', 'success');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal memperbarui produk', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsService.delete(id),
    onSuccess: () => {
      showToast('Produk berhasil dihapus', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menghapus produk', 'error');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategoryId(categories[0]?.id);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? '');
    setPrice(String(p.price));
    setCategoryId(p.category?.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('');
  };

  const handleSubmit = () => {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p < 0) {
      showToast('Nama dan harga harus valid', 'error');
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        dto: { name: name.trim(), description: description.trim() || undefined, price: p, productCategoryId: categoryId },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        price: p,
        productCategoryId: categoryId,
      });
    }
  };

  const handleDelete = (p: Product) => {
    Alert.alert(
      'Hapus Produk',
      `Yakin hapus "${p.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(p.id) },
      ]
    );
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Produk</Text>
      </View>

      <Button title="+ Tambah Produk" size="sm" onPress={openCreate} style={styles.addBtn} />

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCat}>{item.category?.name ?? '-'}</Text>
            <Text style={styles.cardPrice}>
              Rp {Number(item.price).toLocaleString('id-ID')}
            </Text>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)}>
                <Text style={styles.actionEdit}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item)}>
                <Text style={styles.actionDelete}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : (
            <Text style={styles.empty}>Tidak ada produk</Text>
          )
        }
      />

      {showForm && (
        <Modal
          visible
          onClose={closeForm}
          title={editing ? 'Edit Produk' : 'Tambah Produk'}
        >
          <Input label="Nama" value={name} onChangeText={setName} />
          <Input
            label="Deskripsi"
            value={description}
            onChangeText={setDescription}
          />
          <Input
            label="Harga"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Text style={styles.formLabel}>Kategori</Text>
          <View style={styles.chipRow}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button title="Batal" variant="outline" onPress={closeForm} style={styles.modalBtn} />
            <Button
              title="Simpan"
              onPress={handleSubmit}
              loading={pending}
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
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  addBtn: { margin: 16 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardCat: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  cardPrice: { fontSize: 16, fontWeight: '600', color: '#10b981', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionEdit: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  actionDelete: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
