/**
 * @file dateFormatter.ts
 * @description Format tanggal untuk pembukuan UMKM ke format Indonesia.
 */

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const SHORT_MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Format tanggal YYYY-MM-DD ke format tampilan bahasa Indonesia (cth: "11 Nov 2026")
 */
export function formatIndonesianDate(dateString?: string, short = true): string {
  if (!dateString) return '-';
  try {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) {
      return dateString;
    }

    const monthName = short ? SHORT_MONTH_NAMES_ID[monthIndex] : MONTH_NAMES_ID[monthIndex];
    return `${day} ${monthName || ''} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 */
export function getCurrentISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
