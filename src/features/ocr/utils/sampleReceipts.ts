/**
 * @file sampleReceipts.ts
 * @description Menyediakan 3 contoh bukti transaksi riil UMKM Indonesia untuk pengujian cepat 1-klik.
 */

export interface SampleReceipt {
  id: string;
  title: string;
  description: string;
  expectedType: 'in' | 'out';
  expectedAmount: number;
  expectedMerchant: string;
  generateImage: () => string; // Returns Data URL
}

/**
 * Membuat data URL gambar kanvas bergaya struk termal belanja minimarket
 */
function createMinimarketReceiptDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 920;
  const ctx = canvas.getContext('2d')!;

  // Background kertas nota putih gading
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Efek garis tepi struk
  ctx.strokeStyle = '#e2ded9';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Header toko
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INDOMARET POINT', 300, 70);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('PT INDOMARCO PRISMATAMA', 300, 105);
  ctx.fillText('JL. PEMUDA NO. 45 JAKARTA TIMUR', 300, 130);
  ctx.fillText('TELP: 021-47890123 / KASIR: DEWI', 300, 155);

  ctx.fillText('========================================', 300, 185);
  ctx.textAlign = 'left';
  ctx.fillText('TGL: 10/11/2026  14:22:15  STRUK#98213', 40, 215);
  ctx.fillText('========================================', 300, 245);

  // Item belanja
  const items = [
    { name: 'MINYAK GOR SANIA 2L', qty: '2x', price: '68.000' },
    { name: 'GULA PASIR GULAKU 1KG', qty: '3x', price: '49.500' },
    { name: 'TELUR AYAM NEGERI 1KG', qty: '1x', price: '30.000' },
  ];

  let y = 285;
  ctx.font = '18px monospace';
  for (const item of items) {
    ctx.fillStyle = '#1e293b';
    ctx.fillText(item.name, 40, y);
    ctx.fillText(item.qty, 40, y + 25);
    ctx.textAlign = 'right';
    ctx.fillText(item.price, 560, y + 25);
    ctx.textAlign = 'left';
    y += 65;
  }

  // Divider
  ctx.font = '16px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('----------------------------------------', 300, y + 10);

  // Total
  y += 50;
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('TOTAL BELANJA:', 40, y);
  ctx.textAlign = 'right';
  ctx.fillText('Rp 147.500', 560, y);

  // Pembayaran
  ctx.font = '18px monospace';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';
  ctx.fillText('TUNAI / CASH:', 40, y + 45);
  ctx.textAlign = 'right';
  ctx.fillText('150.000', 560, y + 45);

  ctx.textAlign = 'left';
  ctx.fillText('KEMBALIAN:', 40, y + 80);
  ctx.textAlign = 'right';
  ctx.fillText('2.500', 560, y + 80);

  // Footer
  ctx.textAlign = 'center';
  ctx.font = '15px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('========================================', 300, y + 130);
  ctx.fillText('TERIMA KASIH ATAS KUNJUNGAN ANDA', 300, y + 160);
  ctx.fillText('BARANG YANG DIBELI TIDAK DAPAT DITUKAR', 300, y + 185);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Membuat data URL bukti transfer mobile banking BCA (kas masuk katering)
 */
function createBcaTransferDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header BCA Blue
  ctx.fillStyle = '#005baa';
  ctx.fillRect(0, 0, canvas.width, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('m-BCA TRANSFER BERHASIL', 300, 65);

  // Status berhasil
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(300, 170, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('✓', 300, 182);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('TRANSAKSI BERHASIL', 300, 240);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('TANGGAL: 11/11/2026 09:15 WIB', 300, 270);

  // Box data transfer
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(40, 300, 520, 360);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(40, 300, 520, 360);

  const rows = [
    { label: 'PENGIRIM:', value: 'ANDI SUSANTO' },
    { label: 'NO. REKENING:', value: '8830192811' },
    { label: 'PENERIMA:', value: 'WARUNG MAKAN BERKAH' },
    { label: 'NOMINAL TRANSFER:', value: 'Rp 1.250.000' },
    { label: 'BERITA:', value: 'PESANAN KATERING 50 BOX' },
    { label: 'JENIS:', value: 'DANA MASUK (KREDIT)' },
  ];

  let y = 350;
  for (const r of rows) {
    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(r.label, 65, y);

    ctx.textAlign = 'right';
    ctx.font = r.label.includes('NOMINAL') ? 'bold 22px sans-serif' : 'bold 15px sans-serif';
    ctx.fillStyle = r.label.includes('NOMINAL') ? '#059669' : '#0f172a';
    ctx.fillText(r.value, 535, y);

    y += 50;
  }

  ctx.textAlign = 'center';
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('BUKTI TRANSAKSI ELEKTRONIK RESMI PT BANK CENTRAL ASIA TBK', 300, 720);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Membuat data URL nota kontan warung grosir tradisional
 */
function createNotaKontanDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fefce8'; // kertas nota kuning muda
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

  // Header Nota
  ctx.fillStyle = '#854d0e';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOKO SUMBER REJEKI SEMBAKO', 300, 75);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#713f12';
  ctx.fillText('PASAR INDUK KRAMAT JATI BLOK B NO. 12', 300, 110);
  ctx.fillText('NOTA KONTAN / PEMBELIAN STOK', 300, 140);

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('TANGGAL: 09/11/2026', 45, 190);
  ctx.fillText('KEPADA: IBU LINA (KASIR)', 380, 190);

  ctx.strokeStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(45, 210);
  ctx.lineTo(555, 210);
  ctx.stroke();

  const lines = [
    { desc: 'Beras Pandan Wangi 25kg', qty: '1 sak', sub: '350.000' },
    { desc: 'Bawang Merah Brebes Super', qty: '5 kg', sub: '225.000' },
    { desc: 'Cabai Rawit Merah Segar', qty: '4 kg', sub: '250.000' },
  ];

  let y = 260;
  for (const l of lines) {
    ctx.fillStyle = '#1c1917';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${l.desc} (${l.qty})`, 45, y);

    ctx.textAlign = 'right';
    ctx.fillText(l.sub, 555, y);
    y += 55;
  }

  // Garis Total
  ctx.beginPath();
  ctx.moveTo(45, y + 10);
  ctx.lineTo(555, y + 10);
  ctx.stroke();

  y += 60;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#991b1b';
  ctx.textAlign = 'left';
  ctx.fillText('GRAND TOTAL RP:', 45, y);

  ctx.textAlign = 'right';
  ctx.fillText('825.000', 555, y);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#44403c';
  ctx.textAlign = 'left';
  ctx.fillText('STATUS: LUNAS (TUNAI)', 45, y + 45);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#78716c';
  ctx.fillText('TANDA TERIMA / CAP TOKO LUNAS', 300, y + 120);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-minimarket',
    title: 'Struk Indomaret',
    description: 'Belanja stok bahan Rp 147.500 (Kas Keluar)',
    expectedType: 'out',
    expectedAmount: 147500,
    expectedMerchant: 'INDOMARET POINT',
    generateImage: createMinimarketReceiptDataUrl,
  },
  {
    id: 'sample-transfer-bca',
    title: 'Transfer BCA Masuk',
    description: 'Pelanggan pesan katering Rp 1.250.000 (Kas Masuk)',
    expectedType: 'in',
    expectedAmount: 1250000,
    expectedMerchant: 'ANDI SUSANTO',
    generateImage: createBcaTransferDataUrl,
  },
  {
    id: 'sample-nota-grosir',
    title: 'Nota Toko Sembako',
    description: 'Beli beras & cabai Rp 825.000 (Kas Keluar)',
    expectedType: 'out',
    expectedAmount: 825000,
    expectedMerchant: 'TOKO SUMBER REJEKI SEMBAKO',
    generateImage: createNotaKontanDataUrl,
  },
];
