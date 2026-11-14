/**
 * @file logo-geometry.ts
 * @description Geometri logo KasKilat dalam viewBox 64x64.
 * Dipakai bersama oleh komponen SVG dan scripts/generate-icons.mjs, jadi jangan pakai
 * sintaks TypeScript yang tidak bisa di-strip Node (enum/namespace).
 */

export const VIEW_BOX = 64;

/** Sudut tile 14/64 ≈ 22%, sama dengan ikon PWA sebelumnya. */
export const TILE_RADIUS = 14;

export const TILE_FROM = '#34d399';
export const TILE_TO = '#047857';

/**
 * Petir putih: "kilat" pada nama. Proporsi lebar (bukan petir ramping) supaya
 * bentuknya tetap terbaca di favicon 16px, bukan jadi garis zig-zag.
 */
export const BOLT_POINTS: ReadonlyArray<readonly [number, number]> = [
  [33.8, 13.8],
  [15.6, 35.6],
  [32, 35.6],
  [30.2, 49.2],
  [48.4, 28.4],
  [32, 28.4],
];

/** Stroke putih dengan linejoin bulat = sudut petir membulat. */
export const BOLT_STROKE = 2;
