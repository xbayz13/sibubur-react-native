import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getPrintSettings,
  savePrintSettings,
  loadPrintSettingsCache,
  type PrintSettings,
} from '@/lib/print-settings';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);

  useEffect(() => {
    getPrintSettings().then(setPrintSettings);
  }, []);

  const handleToggleKitchen = async (enabled: boolean) => {
    await savePrintSettings({ autoPrintKitchen: enabled });
    await loadPrintSettingsCache();
    setPrintSettings(await getPrintSettings());
    showToast(
      enabled ? 'Auto print struk dapur diaktifkan' : 'Auto print struk dapur dinonaktifkan',
      'success'
    );
  };

  const handleToggleCustomer = async (enabled: boolean) => {
    await savePrintSettings({ autoPrintCustomer: enabled });
    await loadPrintSettingsCache();
    setPrintSettings(await getPrintSettings());
    showToast(
      enabled ? 'Auto print struk pelanggan diaktifkan' : 'Auto print struk pelanggan dinonaktifkan',
      'success'
    );
  };

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
        <Text style={styles.sectionTitle}>Printer & Struk</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Auto Print Struk Dapur</Text>
          <Text style={styles.hint}>Setelah buat pesanan di Kasir</Text>
          <Pressable
            style={[styles.toggle, printSettings?.autoPrintKitchen && styles.toggleActive]}
            onPress={() => handleToggleKitchen(!printSettings?.autoPrintKitchen)}
          >
            <View style={[styles.toggleKnob, printSettings?.autoPrintKitchen && styles.toggleKnobActive]} />
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Auto Print Struk Pelanggan</Text>
          <Text style={styles.hint}>Setelah pembayaran berhasil</Text>
          <Pressable
            style={[styles.toggle, printSettings?.autoPrintCustomer && styles.toggleActive]}
            onPress={() => handleToggleCustomer(!printSettings?.autoPrintCustomer)}
          >
            <View style={[styles.toggleKnob, printSettings?.autoPrintCustomer && styles.toggleKnobActive]} />
          </Pressable>
        </View>
        <Text style={styles.printerNote}>
          Struk dapat dibagikan via WhatsApp, Email, atau aplikasi printer. Untuk cetak langsung ke printer Bluetooth, gunakan development build dengan library @brooons/react-native-bluetooth-escpos-printer.
        </Text>
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
  hint: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    justifyContent: 'flex-start',
  },
  toggleActive: { backgroundColor: '#4f46e5', justifyContent: 'flex-end' },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {},
  printerNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
});
