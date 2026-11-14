/**
 * @file camera.ts
 * @description Ambil foto lewat kamera native (Capacitor) bila tersedia, dengan fallback ke input file web.
 * saveToGallery: false supaya foto struk tidak pernah masuk Galeri / Google Photos.
 */

interface NativeCameraPlugin {
  getPhoto(options: {
    resultType: 'dataUrl';
    source: 'CAMERA';
    quality: number;
    saveToGallery: boolean;
    correctOrientation: boolean;
    width?: number;
    height?: number;
  }): Promise<{ dataUrl?: string }>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { Camera?: NativeCameraPlugin };
}

export type CameraCaptureResult =
  | { status: 'captured'; dataUrl: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

function getNativeCamera(): NativeCameraPlugin | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!bridge?.isNativePlatform?.()) return null;
  return bridge.Plugins?.Camera ?? null;
}

/**
 * Di web selalu 'unavailable' sehingga pemanggil memakai input capture=environment.
 */
export async function capturePhotoWithCamera(): Promise<CameraCaptureResult> {
  const camera = getNativeCamera();
  if (!camera) return { status: 'unavailable' };

  try {
    const photo = await camera.getPhoto({
      resultType: 'dataUrl',
      source: 'CAMERA',
      quality: 80,
      saveToGallery: false,
      correctOrientation: true,
      width: 1600,
      height: 1600,
    });

    if (!photo?.dataUrl) return { status: 'cancelled' };
    return { status: 'captured', dataUrl: photo.dataUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) return { status: 'cancelled' };
    return { status: 'unavailable' };
  }
}
