import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal as RNModal,
} from 'react-native';
import { useToast } from '@/contexts/ToastContext';
import { buildReceiptText, shareReceipt } from '@/lib/printer-service';
import type { Order } from '@/types';

interface TransactionForReceipt {
  amount: number;
  change?: number;
  paymentMethod?: { name: string };
}

interface ReceiptPrintProps {
  order: Order;
  type: 'kitchen' | 'customer';
  onClose: () => void;
  transaction?: TransactionForReceipt;
  autoPrint?: boolean;
}

export default function ReceiptPrint({
  order,
  type,
  onClose,
  transaction,
  autoPrint = false,
}: ReceiptPrintProps) {
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (autoPrint && type === 'kitchen') {
      const timer = setTimeout(() => {
        shareReceipt(order, type, transaction).then(() => {
          showToast('Struk dibagikan', 'success');
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, type, order.id]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const success = await shareReceipt(order, type, transaction);
      if (success) {
        showToast('Struk dibagikan', 'success');
      }
    } catch {
      showToast('Gagal membagikan struk', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const receiptText = buildReceiptText(order, type, transaction);
  const isKitchen = type === 'kitchen';

  return (
    <RNModal visible transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isKitchen ? 'Struk Dapur' : 'Struk Pelanggan'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.receiptContainer}
          contentContainerStyle={styles.receiptContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.receipt}>
            {receiptText.split('\n').map((line, i) => (
              <Text key={i} style={styles.receiptLine}>
                {line}
              </Text>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>Tutup</Text>
          </Pressable>
          <Pressable
            style={[styles.btnPrimary, isSharing && styles.btnDisabled]}
            onPress={handleShare}
            disabled={isSharing}
          >
            <Text style={styles.btnPrimaryText}>
              {isSharing ? 'Membagikan...' : 'Bagikan / Cetak'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Gunakan "Bagikan" untuk mengirim ke WhatsApp, Email, atau aplikasi printer
        </Text>
      </View>
    </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 340,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  close: {
    fontSize: 20,
    color: '#6b7280',
  },
  receiptContainer: {
    maxHeight: 360,
  },
  receiptContent: {
    padding: 16,
  },
  receipt: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  receiptLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#111827',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
