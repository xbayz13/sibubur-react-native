import { AxiosError } from 'axios';

/**
 * Extract user-friendly error message from API/network errors
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Koneksi timeout. Periksa jaringan dan coba lagi.';
    }
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
    }
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
