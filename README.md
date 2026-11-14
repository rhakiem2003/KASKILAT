# KasKilat - Cashflow Tracker UMKM + Personal

Catat uang masuk dan uang keluar dari **foto struk** atau **screenshot bukti transfer**. Tanpa server, tanpa database bersama: semua data dan foto tersimpan di **Google Drive kamu sendiri**.

## Mulai dalam 3 langkah

1. **Buka aplikasinya** (atau install ke layar utama lewat tombol *Install App*).
2. **Pilih template**: 🏪 UMKM / Usaha atau 👤 Pribadi / Personal — kategori langsung siap pakai dan bisa diubah kapan saja.
3. **Catat transaksi**: tekan **+ Catat**, pilih 📷 Camera (struk kertas) atau 🖼️ Upload Screenshot (bukti transfer / e-wallet), lalu simpan.

Belum mau login? Pilih **Continue as Guest**. Semua fitur tetap jalan dan data disimpan di HP ini. Kapan pun bisa login untuk backup ke Drive — transaksi tamu akan ditawarkan untuk dipindahkan.

## Cocok untuk dua kebutuhan

Istilahnya sengaja memakai bahasa buku kas sehari-hari: **uang masuk** dan **uang keluar**. Di KasKilat, **UMKM** juga bisa dibaca sebagai **U**ang **M**asuk, **K**eluar **M**aning — *maning* artinya lagi: uang masuk, keluar, masuk lagi.

| Mode | Uang masuk | Uang keluar | Fokus |
| --- | --- | --- | --- |
| 🏪 **UMKM / Usaha** | penjualan produk, jasa, penerimaan piutang | beli stok, operasional & listrik, gaji karyawan, sewa, ongkir | laba dan arus kas usaha |
| 👤 **Pribadi / Personal** | gaji, bonus / THR, usaha sampingan | makan, transport, belanja harian, tagihan, tabungan | sisa uang bulan ini |

Keduanya memakai aplikasi yang sama; template hanya menentukan kategori awal dan bisa diubah kapan saja.

## Cara kerja penyimpanan

| Data | Lokasi |
| --- | --- |
| Transaksi & kategori | Google Drive kamu: `KasKilat/kaskilat-database.json` (satu file JSON) |
| Foto struk | Google Drive kamu: `KasKilat/photos/{transactionId}.jpg` |
| Cache offline | IndexedDB di perangkat, referensi `drive://<fileId>` |
| Belum login / foto gagal unggah | IndexedDB perangkat, referensi `local://<id>` |

- Setiap perubahan langsung masuk IndexedDB, lalu disinkronkan ke Drive ~3 detik kemudian.
- Jika sync gagal, data tetap aman di HP dan muncul toast *"Gagal sync ke Drive, data aman di HP ini"*.
- Konflik diselesaikan dengan **last-write-wins** (yang terakhir menulis menang), tanpa dialog merge.
- Foto struk **tidak pernah** masuk Galeri atau Google Photos. Di web tidak ada unduhan otomatis; di Capacitor dipakai `Camera.getPhoto({ saveToGallery: false })`.
- Aplikasi tidak punya backend dan tidak punya akses ke isi Drive kamu — developer tidak bisa melihat data keuanganmu.

## OCR

Dua mesin, dipilih berdasarkan jenis gambar:

- **Screenshot / bukti transfer** → Tesseract.js (offline, gratis). Jika hasilnya kurang yakin dan ada Gemini key, otomatis dinaikkan ke Gemini.
- **Foto kamera struk kertas** → Gemini Vision (butuh API key milikmu). Jika gagal, otomatis turun ke Tesseract.

Hasil OCR mengisi form verifikasi yang tetap bisa diedit, dan kategori ditebak dengan aturan teks biasa (GoPay/OVO/DANA/ShopeePay/QRIS, BCA/BRI/Mandiri, Shopee/Tokopedia, Grab/Gojek) — tanpa AI.

Gemini API key disimpan **hanya** di `localStorage` perangkat (`kaskilat_gemini_api_key`) dan dikirim langsung ke Google. Key tidak pernah masuk database Drive, tidak dikirim ke server kami, dan tidak dipakai bersama pengguna lain.

Tanpa key, aplikasi tetap bisa dipakai penuh dengan Tesseract (mode offline).

## Catat lewat menu "Bagikan" (Android)

Setelah KasKilat **terpasang** di HP (tombol Install App), aplikasi ikut muncul di daftar tujuan berbagi:

1. Buka screenshot bukti transfer / foto struk di Galeri, DANA, GoPay, atau WhatsApp.
2. Ketuk **Bagikan** → pilih **KasKilat**.
3. Aplikasi terbuka langsung di form verifikasi dengan nominal, tanggal, dan toko sudah terisi. Tinggal periksa lalu simpan.

Kalau beberapa gambar dikirim sekaligus, semuanya diproses satu per satu — menutup satu struk langsung memuat struk berikutnya. Gambar kiriman hanya dititipkan sementara di perangkat, lalu dihapus setelah dibaca; foto yang disimpan tetap mengikuti aturan yang sama (masuk Drive, bukan Galeri).

Syarat: aplikasi terpasang lewat Chrome "Install app" (bukan sekadar bookmark). **iPhone/iPad belum mendukung** — Safari tidak menyediakan menu berbagi ke aplikasi web, jadi di iOS tetap lewat tombol Foto Struk Kas di dalam aplikasi.

---

## Developer

### Prasyarat

- Node.js 20+
- Akun Google Cloud (sekali setup)

### Setup lokal

```bash
npm install
npm run dev
```

### 1. Google OAuth Client ID (sekali saja)

Client ID milik developer, **bukan** input dari pengguna. Pengguna hanya melihat tombol *Login with Google*.

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat/pilih project.
2. **APIs & Services → Library** → aktifkan **Google Drive API**.
3. **OAuth consent screen**: tipe External, isi nama aplikasi. Selama masih *Testing*, tambahkan email kamu (dan email tester lain) di **Test users**.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. **Authorized JavaScript origins**:
   - `http://localhost:3000` (dev Vite)
   - domain produksi, mis. `https://kaskilat.vercel.app`
6. **Authorized redirect URIs** (opsional, untuk login yang bertahan berhari-hari):
   - `https://kaskilat.vercel.app/` — harus sama persis, termasuk garis miring di akhir
   - `http://localhost:3000/` dan `http://localhost:4173/` (dev/preview)
   
   Setelah alamat itu tersimpan, origin produksi didaftarkan di `GOOGLE_SILENT_RESTORE_ORIGINS` (`src/lib/constants.ts`) lalu deploy. Origin lain (mis. localhost) tetap memakai popup Google biasa.
7. Salin Client ID (`xxxxx.apps.googleusercontent.com`). ID publik ini sudah ditanam sebagai default di `src/lib/constants.ts`.

#### Pasang di Vercel (opsional)

Default Client ID sudah ikut ter-build, jadi deploy tanpa env pun login tetap aktif. Isi env hanya bila ingin menimpa nilai default.

Project → **Settings → Environment Variables**:

```
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
VITE_GEMINI_MODEL=gemini-3-flash-preview
```

Redeploy setelah menambah variabel (Vite menanam nilai `VITE_*` saat build).

**Tidak ada Supabase.** Tidak ada tabel, RLS, SQL, atau koneksi database ke server mana pun. Satu-satunya database adalah file JSON di Drive pengguna.

### File `.env.example`

```env
VITE_GOOGLE_CLIENT_ID=
VITE_GEMINI_MODEL=gemini-3-flash-preview
```

### Script

```bash
npm run dev      # server pengembangan
npm run build    # build produksi + service worker PWA
npm run preview  # pratinjau hasil build
npm run lint     # tsc --noEmit
npm run icons    # regenerate ikon PWA di public/icons
```

### Struktur singkat

```
src/
  features/auth/        # Google Identity Services, onboarding, settings, guest upgrade
  features/database/    # store pusat (useSyncExternalStore), IndexedDB, snapshot
  features/storage/     # Drive API v3 (DB + foto) dan cache lokal
  features/ocr/         # routing Tesseract/Gemini, uploader, form verifikasi
  features/transactions # daftar, modal input, detail
  lib/                  # template kategori, toast, kamera, kompresi gambar, utils
```

### Scope OAuth

`https://www.googleapis.com/auth/drive.file` + `userinfo.email` + `userinfo.profile`.

`drive.file` hanya memberi akses ke file/folder yang dibuat aplikasi ini sendiri, sehingga foto struk pengguna tidak dapat dibaca oleh aplikasi lain dan tidak bisa dijadikan publik.

### PWA & offline

- Service worker (Workbox `generateSW`) meng-cache app shell dan aset statis.
- **`kaskilat-database.json` dikecualikan** dari cache (`NetworkOnly`), begitu juga endpoint `googleapis.com` dan `accounts.google.com`, supaya data tidak pernah basi atau bocor lewat cache.
- Manifest: nama KasKilat, `display: standalone`, theme `#059669`, ikon 192/512 + maskable.
- **Web Share Target**: manifest mendaftarkan `share_target` POST multipart ke `/share-target` (berkas `receipt`, `image/*`). [`public/share-target-sw.js`](public/share-target-sw.js) di-`importScripts` oleh service worker, menampung kiriman di cache `kaskilat-share-v1`, lalu mengalihkan ke `/?shared=1`. [`src/lib/share-target.ts`](src/lib/share-target.ts) mengambil berkasnya, menghapus cache, dan menyerahkannya ke `ScanReceiptModal`. Penanda kiriman disimpan di sessionStorage agar bertahan bila aplikasi sempat berpindah halaman sebelum siap.

### Catatan migrasi

Skema Supabase lama disimpan sebagai arsip di [`docs/old-supabase-migration.sql`](docs/old-supabase-migration.sql) — **Deprecated, sekarang memakai Google Drive sebagai database**. Jangan dijalankan.

## Privasi

- Data keuangan dan foto struk tersimpan di akun Google Drive milik pengguna sendiri.
- Developer tidak memiliki akses ke isi Drive pengguna dan tidak menjalankan server penyimpanan.
- Gemini key milik pengguna hanya ada di perangkatnya.
- Tidak ada analytics, tidak ada pelacakan, tidak ada iklan.
