# KasKilat — Catatan Kas UMKM & Personal

KasKilat membantu mencatat uang masuk dan uang keluar dari foto struk, screenshot bukti transfer, atau input manual. **Tidak perlu membuat akun atau login Google untuk memakai aplikasi.**

## Mulai dalam beberapa detik

1. Buka KasKilat atau pasang ke layar utama HP.
2. Pilih template **Usaha** atau **Pribadi**.
3. Tekan **+ Catat**, foto/unggah bukti transaksi, periksa hasilnya, lalu simpan.

Transaksi dan foto baru disimpan di perangkat menggunakan IndexedDB. Aplikasi tetap dapat dipakai tanpa akun. Form verifikasi dapat mengingat kebiasaan lokal seperti kategori yang biasa dipakai untuk toko tertentu dan metode pembayaran terakhir.

## Backup sesuai pilihanmu

KasKilat tidak tersambung otomatis ke Google Drive dan tidak meminta izin akun Google.

1. Buka **Pengaturan → Simpan / bagikan file backup**.
2. Pada perangkat yang mendukung menu Bagikan, pilih Google Drive. Jika tidak, simpan file backup terlebih dahulu lalu unggah sendiri ke Drive.
3. Untuk pindah perangkat atau memulihkan data, unduh file backup dari Drive lalu pilih **Pulihkan dari file backup**.

File `.kaskilat` mencakup database dan foto struk yang masih tersedia di penyimpanan perangkat. Pemulihan menggabungkan transaksi berdasarkan ID, sehingga catatan yang sudah ada tidak otomatis dihapus. File JSON database versi lama juga dapat diimpor.

**Penting:** simpan file backup di tempat aman. Menghapus data situs/browser atau kehilangan perangkat dapat menghapus data lokal. Buat backup secara berkala, terutama sebelum mengganti perangkat atau membersihkan data browser.

## Catatan migrasi dari versi Google Drive

Versi sebelumnya dapat menyimpan cache database dan cache foto di perangkat dengan kunci akun Google. KasKilat baru akan mencoba menyalin cache akun yang masih ada ke database lokal tanpa menghapus sumber aslinya.

Jika database lama hanya ada di Drive dan belum memiliki cache lokal, unduh `kaskilat-database.json` dari folder KasKilat di Google Drive, lalu impor melalui **Pengaturan → Pulihkan dari file backup**. Foto lama yang hanya tersedia di Drive tidak dapat otomatis diambil oleh versi tanpa login; foto yang sudah memiliki cache di perangkat akan ikut ke backup.

File lama `KasKilat` di Google Drive tidak dihapus oleh pembaruan ini. Pengguna tetap dapat menyimpan file backup baru ke Drive sendiri.

## Fitur

- Input manual, kamera struk, dan screenshot transfer.
- OCR offline dengan Tesseract; Gemini adalah opsi lanjutan dan memerlukan API key milik pengguna.
- Form verifikasi sebelum transaksi disimpan.
- Kebiasaan kategori per merchant dan metode pembayaran terakhir dipakai sebagai saran, dan tetap bisa diedit.
- Dashboard saldo, arus kas, kategori, dan laporan.
- Web Share Target Android untuk mengirim gambar langsung dari menu Bagikan.
- PWA yang dapat dipasang dan digunakan offline setelah aset OCR tersedia.

## Privasi & penyimpanan

- Tidak ada login Google, OAuth, atau background sync.
- Transaksi dan foto disimpan lokal di perangkat.
- File backup dibuat hanya saat pengguna memintanya dan diserahkan ke lokasi yang dipilih pengguna.
- KasKilat tidak memiliki akses ke Google Drive pengguna.
- Gemini API key (opsional) disimpan di perangkat dan dikirim langsung ke Google ketika fitur Gemini digunakan.
- Tidak ada analytics, iklan, atau pelacakan.

## Developer

### Prasyarat

- Node.js 20+

### Setup lokal

```bash
npm install
npm run dev
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
  features/auth/         # onboarding dan pengaturan (tanpa proses login)
  features/database/     # IndexedDB, migrasi data lama, dan snapshot lokal
  features/storage/      # penyimpanan foto dan ekspor/impor backup
  features/ocr/          # routing Tesseract/Gemini dan form verifikasi
  features/transactions/ # transaksi, kategori, modal input, detail
  lib/                   # template kategori, toast, kamera, utils
```

Tidak ada Supabase, backend database, atau koneksi Google Drive otomatis. Backup Drive dilakukan lewat file yang dipilih dan dikelola langsung oleh pengguna.
