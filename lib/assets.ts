/** Görsellerin içerik sürümü (next.config.ts derlemede hesaplar). */
export const ASSET_VERSION = process.env.NEXT_PUBLIC_ASSET_VERSION ?? "";

/** Ekran görüntüsü ya da poster adresi, içerik sürümüyle: uzun süre
 *  önbellekte kalır, dosya değişince yeni adresten yeniden iner. */
export function versioned(url: string) {
  return ASSET_VERSION ? `${url}?v=${ASSET_VERSION}` : url;
}
