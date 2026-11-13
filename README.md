# KasKilat UMKM

Aplikasi pembukuan kas masuk / kas keluar untuk UMKM dengan pembacaan foto struk otomatis.

## Fitur

- **OCR dua mesin**: screenshot/tangkapan layar diproses **Tesseract.js** (offline, gratis); foto kamera diproses **Gemini 3.6 Flash** (free tier) untuk akurasi nominal & tanggal yang jauh lebih baik. Model bisa diganti lewat `VITE_GEMINI_MODEL`; jika model itu tidak tersedia, aplikasi otomatis mencoba model fallback lain.
- **Catatan otomatis**: rincian nama barang, jumlah, dan harga hasil OCR langsung mengisi kolom **Catatan Tambahan** di form verifikasi (tetap bisa diedit).
- **Fallback otomatis**: jika Gemini tidak tersedia/gagal, OCR kembali ke Tesseract. Jika hasil Tesseract pada screenshot kurang akurat, otomatis dicoba ke Gemini (bila key tersedia).
- **Foto struk di Google Drive**: foto dikompres (maks 1600px), diunggah ke folder `KasKilat UMKM` di Drive Anda, lalu ditampilkan lewat cache lokal. Foto tidak dibuat publik.
- **Fallback lokal**: sebelum Drive dihubungkan, foto disimpan di IndexedDB sehingga tetap ada setelah reload (bug `blob:` URL sudah dihilangkan).
- Dashboard saldo, grafik arus kas 30 hari, laporan, kategori, input manual, dan ekspor.

## Menjalankan

Prasyarat: Node.js 20+.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Konfigurasi

Semua kredensial bisa diisi langsung dari aplikasi melalui tombol **Pengaturan** di header — tanpa rebuild. Nilai environment variable hanya menjadi default.

### 1. Gemini API key (gratis)

1. Buka https://aistudio.google.com/apikey lalu buat API key.
2. Di aplikasi: **Pengaturan → Gemini API Key** → tempel key → **Simpan**.

Tanpa key, semua gambar tetap bisa diproses Tesseract offline (akurasi lebih rendah untuk foto kamera).

### 2. Google Drive untuk foto struk

1. Buka https://console.cloud.google.com/ dan buat/pilih project.
2. Aktifkan **Google Drive API** (APIs & Services → Library).
3. Buat **OAuth consent screen** (tipe External, cukup untuk penggunaan pribadi; tambahkan akun Anda sebagai test user bila masih mode Testing).
4. Buat **Credentials → OAuth client ID → Web application**.
5. Di **Authorized JavaScript origins**, tambahkan origin aplikasi, misalnya:
   - `http://localhost:3000`
   - domain produksi Anda (mis. `https://kas-kilat.example.com`)
6. Salin **Client ID** (`xxxxx.apps.googleusercontent.com`).
7. Di aplikasi: **Pengaturan → Google OAuth Client ID** → tempel → **Simpan**, lalu klik **Hubungkan Google Drive** dan setujui izin.

Aplikasi memakai scope `drive.file`, artinya hanya bisa melihat/mengubah file dan folder yang dibuatnya sendiri. Foto **tidak** dibuat dapat diakses publik; aplikasi mengambilnya kembali dengan token OAuth dan menyimpannya sebagai cache di perangkat.

Jika foto tidak terlihat di Drive: buka **Pengaturan → Tes unggah ke Drive**. Tombol ini membuat folder `KasKilat UMKM` (bila belum ada), mengunggah satu file uji, menampilkan error persisnya bila gagal, dan menyediakan tautan folder. Foto yang tersimpan **sebelum** Drive dihubungkan tetap berada di IndexedDB; gunakan **Unggah N foto lokal ke Drive** untuk memindahkannya.

### 3. Environment variable (opsional)

Salin `.env.example` menjadi `.env.local` lalu isi:

```env
VITE_GEMINI_API_KEY=
VITE_GOOGLE_CLIENT_ID=
```

## Penyimpanan data

| Data | Lokasi |
| --- | --- |
| Transaksi & kategori | localStorage (atau Supabase bila dikonfigurasi) |
| Foto struk (Drive terhubung) | Google Drive folder `KasKilat UMKM`, referensi `drive://<fileId>` |
| Foto struk (Drive belum terhubung/gagal) | IndexedDB browser, referensi `local://<id>` |

Catatan: referensi `local://` bersifat per-perangkat. Jika memakai Supabase lintas perangkat, hubungkan Google Drive agar referensi foto portabel. Supabase dan Google Drive saling independen — foto struk tetap bisa masuk Drive tanpa Supabase, dan sebaliknya.

## Build

```bash
npm run build
npm run preview
```

## Keamanan

- **Client ID OAuth** aman berada di browser.
- **Gemini API key** yang ditempel di aplikasi tersimpan di localStorage dan dikirim langsung ke Google. Ini cocok untuk penggunaan pribadi/UMKM di perangkat sendiri. Untuk aplikasi publik multi-pengguna, pindahkan pemanggilan Gemini ke backend/proxy agar key tidak terekspos.
