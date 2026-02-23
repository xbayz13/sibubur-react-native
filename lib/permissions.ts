/**
 * Mobile permission mapping and utilities
 */

export const MENU_ITEMS_PERMISSIONS: Record<string, string[]> = {
  Dashboard: ['dashboard.read'],
  Kasir: ['cashier.read'],
  Pesanan: ['orders.read'],
  'Produksi Harian': ['productions.read'],
  Transaksi: ['transactions.read'],
  Persediaan: ['supplies.read'],
  Pengeluaran: ['expenses.read'],
  'Karyawan & Absensi': ['employees.read'],
  Laporan: ['reports.read'],
  'Data Master': [
    'products.read',
    'stores.read',
    'product-categories.read',
    'product-addons.read',
    'employees.read',
    'expense-categories.read',
  ],
  Pengguna: ['users.read'],
  'Role & Izin': ['roles.read'],
  Pengaturan: [],
};

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (userPermissions.includes('superadmin:*')) return true;
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

export function canAccessMenuItem(
  menuName: string,
  hasPermission: (p: string) => boolean
): boolean {
  const perms = MENU_ITEMS_PERMISSIONS[menuName];
  if (!perms || perms.length === 0) return true;
  return perms.some((p) => hasPermission(p));
}
