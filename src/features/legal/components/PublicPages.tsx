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
  Lock,
  Receipt,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

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
          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
            K
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            KasKilat
          </span>
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
          KasKilat tidak memiliki server atau database milik pengembang. Catatan keuangan dan foto
          struk Anda disimpan di perangkat Anda dan, jika Anda login, di Google Drive milik Anda
          sendiri.
        </p>
      </div>

      <Section title="Data yang diakses dari Google">
        <p>Saat Anda memilih “Login with Google”, KasKilat meminta izin untuk:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Email dan profil dasar</strong> — hanya untuk menampilkan status
            “Connected as {'{email}'}”.
          </li>
          <li>
            <strong>Scope <code className="font-mono text-[11px]">drive.file</code></strong> — hanya
            file dan folder yang dibuat sendiri oleh KasKilat. Aplikasi membuat folder{' '}
            <code className="font-mono text-[11px]">KasKilat</code> berisi{' '}
            <code className="font-mono text-[11px]">kaskilat-database.json</code> dan subfolder{' '}
            <code className="font-mono text-[11px]">photos</code>. Izin ini tidak memberi akses ke
            file atau folder lain di Drive Anda.
          </li>
        </ul>
        <p>
          KasKilat tidak mengakses Gmail, Google Kalender, Kontak, Google Photos, maupun lokasi Anda.
        </p>
      </Section>

      <Section title="Data yang disimpan di perangkat">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>IndexedDB</strong> — transaksi, kategori, dan cache foto struk agar aplikasi
            tetap dapat dipakai offline.
          </li>
          <li>
            <strong>localStorage</strong> — sesi login Google, Gemini API key (jika Anda mengisi),
            dan preferensi tampilan.
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
          <li>
            Hapus folder <code className="font-mono text-[11px]">KasKilat</code> di Google Drive
            untuk menghapus seluruh database dan foto.
          </li>
          <li>
            Cabut akses aplikasi kapan saja di{' '}
            <a
              className="text-emerald-700 dark:text-emerald-400 underline"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </li>
          <li>
            Logout menghapus sesi di perangkat dan tidak menghapus data di Drive. Menghapus data
            situs di browser akan menghapus IndexedDB dan sesi lokal.
          </li>
        </ul>
      </Section>

      <Section title="Keamanan">
        <p>
          Seluruh komunikasi memakai HTTPS. Token OAuth disimpan di browser Anda dan dipakai
          langsung untuk memanggil Google API; token tidak dikirim ke server mana pun milik
          pengembang.
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
    title: 'Backup ke Drive sendiri',
    body: 'Login Google membuat satu file database dan foto struk tersimpan di folder KasKilat milik Anda — bisa dibuka dari HP lain.',
  },
  {
    icon: Smartphone,
    title: 'Tanpa install, tetap offline',
    body: 'Bisa dipasang ke layar utama seperti aplikasi. Tanpa login pun semua fitur pencatatan tetap berjalan di perangkat.',
  },
] as const;

export const AboutPage: React.FC = () => {
  useDocumentTitle('Tentang KasKilat - Cashflow Tracker UMKM + Personal');

  return (
    <Shell
      title="KasKilat - Cashflow Tracker UMKM + Personal"
      subtitle="Pembukuan kas yang cukup difoto, tanpa server, tanpa biaya bulanan."
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Banyak usaha kecil masih mencatat kas di buku tulis atau chat WhatsApp, lalu kesulitan
        merekap saat butuh laporan. KasKilat dibuat agar pemilik warung, pedagang, dan pekerja
        dengan usaha sampingan bisa mencatat uang masuk dan keluar dalam hitungan detik — cukup
        memotret struk atau mengunggah screenshot bukti transfer.
      </p>

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

      <Section title="Bagaimana KasKilat menggunakan data Google">
        <p>
          KasKilat memakai Google Sign-In untuk mengenali akun Anda dan scope{' '}
          <code className="font-mono text-[11px]">drive.file</code> untuk membuat serta memperbarui
          folder <code className="font-mono text-[11px]">KasKilat</code> di Drive Anda sendiri.
          Aplikasi tidak dapat melihat file lain di Drive Anda dan tidak mengirim data keuangan Anda
          ke server mana pun.
        </p>
        <p>
          Rincian lengkap ada di{' '}
          <a href="/privacy" className="text-emerald-700 dark:text-emerald-400 underline">
            Kebijakan Privasi
          </a>
          .
        </p>
      </Section>

      <Section title="Untuk siapa">
        <p>
          UMKM dan pedagang yang ingin pembukuan rapi, serta individu yang ingin memantau keuangan
          harian. Tersedia template kategori <strong>UMKM / Usaha</strong> dan{' '}
          <strong>Pribadi / Personal</strong>; keduanya bisa diubah sesuai kebutuhan.
        </p>
      </Section>

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
