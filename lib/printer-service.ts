/**
 * Mobile Printer Service
 * - Share: Uses React Native Share API to share receipt text (works on all platforms)
 * - Bluetooth: Placeholder for @brooons/react-native-bluetooth-escpos-printer
 *   (requires development build, not Expo Go)
 */
import type { Order } from '@/types';

export interface TransactionForReceipt {
  amount: number;
  change?: number;
  paymentMethod?: { name: string };
}

export interface PrinterConnection {
  connected: boolean;
  method: 'bluetooth' | 'share';
  deviceName?: string;
}

/**
 * Generate plain text receipt for sharing or Bluetooth
 */
export function buildReceiptText(
  order: Order,
  type: 'kitchen' | 'customer',
  transaction?: TransactionForReceipt
): string {
  const isKitchen = type === 'kitchen';
  const lines: string[] = [];

  lines.push('================================');
  lines.push('      BUBUR AYAM LEMBUR KURING');
  lines.push('================================');
  lines.push('');
  lines.push(isKitchen ? '======== STRUK DAPUR ========' : '====== STRUK PELANGGAN ======');
  lines.push('');

  lines.push(`No. Order: ${order.orderNumber}`);
  lines.push(
    `Tanggal: ${new Date(order.createdAt).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  );
  if (order.customerName) {
    lines.push(`Pelanggan: ${order.customerName}`);
  }
  lines.push(`Toko: ${order.store?.name ?? '-'}`);
  if (isKitchen) {
    const status =
      order.status === 'open'
        ? 'Belum Bayar'
        : order.status === 'paid'
          ? 'Lunas'
          : 'Dibatalkan';
    lines.push(`Status: ${status}`);
  }
  lines.push('');

  lines.push(isKitchen ? '--- DAFTAR PESANAN ---' : '--- ITEM PESANAN ---');
  for (const item of order.orderItems ?? []) {
    lines.push(`${item.quantity}x ${item.product?.name ?? '-'}`);
    if (item.orderItemAddons?.length) {
      for (const a of item.orderItemAddons) {
        const prefix = isKitchen ? '  •' : '  +';
        const price = isKitchen ? '' : ` @ Rp ${Number(a.addonPrice).toLocaleString('id-ID')}`;
        lines.push(`${prefix} ${a.quantity}x ${a.addon?.name ?? '-'}${price}`);
      }
    }
    if (!isKitchen) {
      lines.push(`  Subtotal: Rp ${Number(item.lineTotal).toLocaleString('id-ID')}`);
    }
  }
  lines.push('');

  if (!isKitchen) {
    lines.push('--------------------------------');
    lines.push(
      `Subtotal: Rp ${Number(order.subtotalAmount || order.totalAmount).toLocaleString('id-ID')}`
    );
    if (order.taxAmount > 0) {
      lines.push(`Pajak: Rp ${Number(order.taxAmount).toLocaleString('id-ID')}`);
    }
    lines.push(`TOTAL: Rp ${Number(order.totalAmount).toLocaleString('id-ID')}`);
    lines.push('');

    if (transaction) {
      lines.push('--- PEMBAYARAN ---');
      lines.push(
        `Metode: ${transaction.paymentMethod?.name ?? 'Tunai'}`
      );
      lines.push(`Jumlah Bayar: Rp ${Number(transaction.amount).toLocaleString('id-ID')}`);
      if (transaction.change != null && transaction.change > 0) {
        lines.push(`Kembalian: Rp ${Number(transaction.change).toLocaleString('id-ID')}`);
      }
      lines.push('');
    }
  }

  if (isKitchen) {
    lines.push('PERHATIAN: Siapkan pesanan sesuai item di atas');
  } else {
    lines.push('Terima kasih atas kunjungan Anda!');
  }
  lines.push(`Dicetak: ${new Date().toLocaleString('id-ID')}`);
  lines.push('================================');

  return lines.join('\n');
}

/**
 * Share receipt via system share sheet (WhatsApp, Email, printer apps, etc.)
 */
export async function shareReceipt(
  order: Order,
  type: 'kitchen' | 'customer',
  transaction?: TransactionForReceipt
): Promise<boolean> {
  const text = buildReceiptText(order, type, transaction);
  const { Share } = await import('react-native');
  try {
    await Share.share({
      message: text,
      title: type === 'kitchen' ? 'Struk Dapur' : 'Struk Pelanggan',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get printer connection status.
 * On mobile without Bluetooth lib: always returns null (use Share).
 */
export function getConnectionStatus(): PrinterConnection | null {
  // Bluetooth lib would set this when connected
  // For now, we use Share as fallback - no "connected" state
  return null;
}
