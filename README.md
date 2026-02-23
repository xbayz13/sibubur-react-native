# SiBubur POS Mobile

Aplikasi mobile React Native (Expo) untuk sistem Point of Sale SiBubur.

## Persyaratan

- Node.js 18+
- npm atau yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Backend API SiBubur harus berjalan (lihat `backend/`)

## Setup

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env

# Edit .env - set EXPO_PUBLIC_API_URL sesuai environment:
# - iOS Simulator / Web: http://localhost:3000
# - Android Emulator: http://10.0.2.2:3000
# - Perangkat fisik: http://<IP_PC>:3000 (contoh: http://192.168.1.100:3000)

# Jalankan development server
npx expo start
```

## Scripts

| Script      | Deskripsi                    |
|------------|------------------------------|
| `npm start` | Jalankan Expo dev server      |
| `npm run android` | Jalankan di Android   |
| `npm run ios`     | Jalankan di iOS       |
| `npm run lint`    | Jalankan ESLint       |

## Build Production (EAS Build)

### Persiapkan

1. Login EAS: `npx eas login`
2. Konfigurasi project: `npx eas build:configure`

### Profil Build

| Profil      | Deskripsi                         | Output                |
|-------------|-----------------------------------|-----------------------|
| development | Development build dengan dev tools | Internal               |
| preview     | Build untuk testing internal      | APK (Android) / IPA   |
| production  | Build untuk App Store / Play Store | AAB / IPA             |

### Perintah Build

```bash
# Development build
npx eas build --profile development --platform android

# Preview (testing)
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios

# Production (store)
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

### Environment Production

Untuk production, set `EXPO_PUBLIC_API_URL` di EAS Secrets atau di `eas.json` env:

```bash
npx eas secret:create --name EXPO_PUBLIC_API_URL --value "https://api.sibubur.com"
```

## Struktur Proyek

```
mobile/
├── app/                 # Expo Router (screens)
│   ├── (auth)/          # Login
│   ├── (tabs)/          # Dashboard, Kasir, Pesanan, Laporan, Menu
│   ├── master-data/     # Data Master (Produk, Kategori, dll)
│   └── *.tsx            # Stack screens (productions, transactions, dll)
├── components/          # Reusable components
├── contexts/            # AuthContext, ToastContext
├── lib/                 # API client, services, utils
├── types/               # TypeScript types
└── constants/           # Colors, env
```

## Fitur

- **Auth**: Login / Logout, token JWT
- **Dashboard**: Statistik, chart 7 hari
- **Kasir**: Input produk, keranjang, pembayaran
- **Pesanan**: Daftar pesanan terbuka, detail, bayar/batalkan
- **Produksi**: Form produksi harian, rekomendasi
- **Transaksi**: Daftar transaksi
- **Laporan**: Harian, bulanan, tahunan
- **Persediaan**: Daftar supplies, restock, filter stok rendah
- **Pengeluaran**: Daftar & input pengeluaran
- **Karyawan & Absensi**: Rekam absensi
- **Data Master**: Produk, Kategori, Addon, Toko, Kategori Pengeluaran
- **Admin**: Pengguna, Role, Pengaturan

## Permission

Aplikasi menggunakan role-based access. Menu dan layar difilter berdasarkan permission user. SuperAdmin/Owner memiliki akses penuh.

## Referensi

- [PRD](docs/PRD.md) - Product Requirements Document
- [Mobile Prepare](docs/MobileAppsPrepare.md) - Persiapan & arsitektur
