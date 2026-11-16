/**
 * @file PublicPages.tsx
 * @description Halaman publik /about dan /privacy (tanpa React app/IndexedDB) untuk informasi produk
 * dan syarat verifikasi Google OAuth.
 */

import React, { useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Cloud,
  ExternalLink,
  Github,
  Lightbulb,
  Lock,
  Receipt,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { KasKilatMark, KasKilatWordmark } from '../../../components/brand/KasKilatLogo';

const GITHUB_URL = 'https://github.com/rhakiem2003/KASKILAT';
const UPDATED_AT = '14 November 2026';

function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

const Shell: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
    <header className="border-b border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5 min-w-0">
          <KasKilatMark className="w-9 h-9 shrink-0" />
          <KasKilatWordmark className="whitespace-nowrap" />
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Buka aplikasi
        </a>
      </div>
    </header>

    <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </main>

    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-5 py-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <a href="/" className="hover:text-emerald-700">Aplikasi</a>
        <a href="/about" className="hover:text-emerald-700">Tentang</a>
        <a href="/privacy" className="hover:text-emerald-700">Kebijakan Privasi</a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-emerald-700"
        >
          <Github className="w-3.5 h-3.5" />
          GitHub
        </a>
        <span className="ml-auto">© {new Date().getFullYear()} KasKilat</span>
      </div>
    </footer>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
    <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 space-y-2">
      {children}
    </div>
  </section>
);

export const PrivacyPage: React.FC = () => {
  useDocumentTitle('Kebijakan Privasi - KasKilat');

  return (
    <Shell
      title="Kebijakan Privasi"
      subtitle={`Terakhir diperbarui: ${UPDATED_AT}`}
    >
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Catatan keuangan dan foto struk disimpan di perangkat Anda. Jika Anda membuat file backup,
          Anda sendiri yang memilih lokasi penyimpanannya, misalnya Google Drive. KasKilat tidak
          meminta izin atau login ke akun Google Anda.
        </p>
      </div>

      <Section title="Akses ke Google Drive">
        <p>
          KasKilat tidak menggunakan Google Sign-In, tidak meminta OAuth scope, dan tidak terhubung
          ke Google Drive. Saat Anda memilih backup, aplikasi membuat satu file di perangkat.
          Anda dapat menyimpannya atau membagikannya ke Google Drive melalui menu Bagikan perangkat
          atau mengunggahnya sendiri. Tindakan tersebut dikelola oleh sistem operasi/browser dan
          Google Drive, bukan oleh akses akun dari KasKilat.
        </p>
      </Section>

      <Section title="Data yang disimpan di perangkat">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>IndexedDB</strong> — transaksi, kategori, serta foto struk agar aplikasi tetap
            dapat dipakai offline.
          </li>
          <li>
            <strong>localStorage</strong> — Gemini API key opsional dan preferensi tampilan.
            KasKilat tidak menyimpan sesi atau token Google.
          </li>
        </ul>
      </Section>

      <Section title="Gemini API key">
        <p>
          Jika Anda mengisi API key Gemini untuk membaca foto struk, key tersebut disimpan hanya di
          perangkat Anda dan dikirim langsung ke Google. Key tidak pernah dikirim ke pengembang
          KasKilat dan tidak disimpan di Google Drive.
        </p>
      </Section>

      <Section title="Yang tidak dilakukan KasKilat">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Tidak ada server yang menyimpan data keuangan atau foto Anda.</li>
          <li>Tidak ada analytics, iklan, atau pelacakan pihak ketiga.</li>
          <li>Tidak ada penjualan atau pembagian data ke pihak ketiga.</li>
        </ul>
      </Section>

      <Section title="Penyimpanan dan penghapusan data">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Hapus transaksi langsung dari aplikasi (foto terkait ikut dihapus).</li>
          <li>Menghapus data situs/browser dapat menghapus seluruh catatan dan foto lokal.</li>
          <li>Hapus file backup sendiri dari lokasi penyimpanan yang Anda pilih, termasuk Drive.</li>
          <li>KasKilat tidak memiliki sesi Google yang perlu dicabut.</li>
        </ul>
      </Section>

      <Section title="Keamanan">
        <p>
          Data transaksi diproses dan disimpan di perangkat. File cadangan dibuat hanya setelah Anda
          menekan tombol backup, lalu diserahkan ke menu berbagi atau unduhan perangkat.
        </p>
      </Section>

      <Section title="Anak-anak">
        <p>
          KasKilat ditujukan untuk pelaku usaha dan pengguna umum, bukan untuk anak di bawah 13
          tahun.
        </p>
      </Section>

      <Section title="Perubahan kebijakan">
        <p>
          Kebijakan ini dapat diperbarui bila fitur berubah. Tanggal pembaruan terakhir selalu
          ditampilkan di bagian atas halaman ini.
        </p>
      </Section>

      <Section title="Kontak">
        <p>
          Pertanyaan tentang privasi atau permintaan penghapusan data dapat dikirim melalui{' '}
          <a
            className="text-emerald-700 dark:text-emerald-400 underline"
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub Issues KasKilat
          </a>
          .
        </p>
      </Section>

      <Section title="Google API Services User Data Policy">
        <p className="text-xs leading-relaxed p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          KasKilat's use and transfer to any other app of information received from Google APIs will
          adhere to the{' '}
          <a
            className="text-emerald-700 dark:text-emerald-400 underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>
    </Shell>
  );
};

const FEATURES = [
  {
    icon: Receipt,
    title: 'Catat dari foto',
    body: 'Foto struk kertas dibaca dengan Gemini, screenshot bukti transfer dibaca offline dengan Tesseract. Hasilnya bisa diedit sebelum disimpan.',
  },
  {
    icon: BarChart3,
    title: 'Laporan otomatis',
    body: 'Saldo, arus kas 30 hari, rekap per kategori, serta ekspor CSV untuk pembukuan atau pengajuan pinjaman.',
  },
  {
    icon: Cloud,
    title: 'Backup ke lokasi pilihan',
    body: 'Buat satu file backup yang berisi catatan dan foto, lalu simpan ke Google Drive atau lokasi lain yang Anda pilih.',
  },
  {
    icon: Smartphone,
    title: 'Tanpa install, tetap offline',
    body: 'Bisa dipasang ke layar utama seperti aplikasi. Tanpa login pun semua fitur pencatatan tetap berjalan di perangkat.',
  },
] as const;

const MODES = [
  {
    emoji: '🏪',
    title: 'UMKM / Usaha',
    body: 'Untuk warung, toko, pedagang, dan jasa. Fokusnya laba: berapa uang masuk hari ini, berapa uang keluar untuk kulakan dan biaya usaha.',
    inflow: 'penjualan produk, jasa, penerimaan piutang',
    outflow: 'beli stok, operasional & listrik, gaji karyawan, sewa, ongkir',
  },
  {
    emoji: '👤',
    title: 'Pribadi / Personal',
    body: 'Untuk karyawan, freelancer, dan rumah tangga. Fokusnya sisa uang: berapa yang masuk bulan ini dan ke mana perginya.',
    inflow: 'gaji, bonus / THR, usaha sampingan',
    outflow: 'makan, transport, belanja harian, tagihan, tabungan',
  },
] as const;

export const AboutPage: React.FC = () => {
  useDocumentTitle('Tentang KasKilat - Cashflow Tracker UMKM + Personal');

  return (
    <Shell
      title="KasKilat - Cashflow Tracker UMKM + Personal"
      subtitle="Catat uang masuk dan uang keluar cukup dari foto struk. Tanpa server, tanpa biaya bulanan."
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Banyak orang masih mencatat keuangan di buku tulis atau chat WhatsApp, lalu kesulitan
        merekap saat butuh laporan. KasKilat dibuat agar pemilik warung, pedagang, pekerja dengan
        usaha sampingan, sampai rumah tangga bisa mencatat uang masuk dan uang keluar dalam
        hitungan detik — cukup memotret struk atau mengunggah screenshot bukti transfer.
      </p>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
          <strong>U</strong>ang <strong>M</strong>asuk, <strong>K</strong>eluar{' '}
          <strong>M</strong>aning — di KasKilat, <strong>UMKM</strong> juga bisa dibaca begitu.
          Maning artinya lagi: uang masuk, keluar, masuk lagi. Itu ritme kas harian yang cukup
          dicatat di dua kolom, jadi pembukuan tidak terasa seperti kerja akuntan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
          >
            <feature.icon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {feature.body}
            </p>
          </div>
        ))}
      </div>

      <Section title="Backup dan pemulihan">
        <p>
          File backup dibuat di perangkat Anda. Pilih Google Drive dari menu Bagikan bila tersedia,
          atau unduh file lalu unggah sendiri ke Drive. Untuk memulihkan data di perangkat lain,
          unduh file tersebut dan impor melalui Pengaturan KasKilat.
        </p>
        <p>
          KasKilat tidak meminta akses Google Drive. Rincian lengkap ada di{' '}
          <a href="/privacy" className="text-emerald-700 dark:text-emerald-400 underline">
            Kebijakan Privasi
          </a>.
        </p>
      </Section>

      <Section title="Untuk usaha dan keuangan pribadi">
        <p>
          KasKilat memakai istilah sehari-hari seperti di buku kas: <strong>uang masuk</strong> dan{' '}
          <strong>uang keluar</strong>. Tidak perlu paham akuntansi — cukup catat, rekap dan
          laporannya dibuat otomatis. Saat pertama membuka aplikasi, pilih template yang paling
          cocok; kategori di dalamnya tetap bisa diubah kapan saja.
        </p>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map((mode) => (
          <div
            key={mode.title}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {mode.emoji}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{mode.title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{mode.body}</p>
            <dl className="space-y-1 text-[11px] leading-relaxed">
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                  Uang masuk
                </dt>
                <dd className="text-slate-500 dark:text-slate-400">— {mode.inflow}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-semibold text-rose-600 dark:text-rose-400">
                  Uang keluar
                </dt>
                <dd className="text-slate-500 dark:text-slate-400">— {mode.outflow}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5 pt-2">
        <a
          href="/"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          Buka KasKilat
          <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href="/privacy"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <Lock className="w-4 h-4" />
          Kebijakan Privasi
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <ExternalLink className="w-4 h-4" />
          Kode sumber
        </a>
      </div>
    </Shell>
  );
};

export function getPublicPage(pathname: string): React.ReactNode | null {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/about') return <AboutPage />;
  return null;
}
