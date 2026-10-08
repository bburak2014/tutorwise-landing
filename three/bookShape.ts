/* Açık kitabın biçimi için saf hesaplar (three.js'e bağlı değil; test edilir). */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Açık kitapta sayfa bloğunun üst yüzü: sırtta içe gömülür, ortaya doğru
 *  hafifçe kubbelenir, ön kenarda blok yüksekliğine iner (gerçek bir kitap
 *  gibi; düz bir kutu değil). u: sırttan uzaklık / sayfa genişliği (0–1).
 *  Dönen değer blok yüksekliğine göre fark (dünya birimi). */
export function gutterProfile(u: number) {
  const x = clamp01(u);
  const dip = -0.05 * Math.pow(1 - x, 8);
  const dome = 0.01 * Math.pow(Math.sin(Math.PI * x), 0.8);
  return dip + dome;
}

/** Kemik zincirinin bir eğriyi izlemesi için kemik açıları. three.js'te
 *  kemik y ekseninde döner; eksi açı ucu +z'ye (yukarı) kaldırır. İlk değer
 *  kökün mutlak açısı, sonrakiler bir öncekine göre; son kemik uçtur (0).
 *  Her adım eğrinin üzerinde bir kemik boyu ilerleyen noktayı hedefler. */
export function bendAngles(profile: (u: number) => number, segments: number, width: number): number[] {
  const step = width / segments;
  const angles: number[] = [];
  let x = 0;
  let z = profile(0);
  let previous = 0;
  for (let i = 0; i < segments; i++) {
    let dx = step;
    let heading = 0;
    for (let k = 0; k < 3; k++) {
      heading = Math.atan2(profile((x + dx) / width) - z, dx);
      dx = step * Math.cos(heading);
    }
    angles.push(-(heading - previous));
    previous = heading;
    x += step * Math.cos(heading);
    z += step * Math.sin(heading);
  }
  angles.push(0);
  return angles;
}

/** Kitabın ölçüleri (dünya birimi). Cilt (sırt) x = 0'da; dönmemiş sayfalar
 *  sağda (+x), dönmüş sayfalar solda. Sayfa yüzü +z'ye, kameraya bakar. */
export const PAGE_W = 1.28;
export const PAGE_H = 1.71;
/** Sayfa bloğunun kalınlığı, yapraklar arası boşluk ve yaprak sayısı. */
export const BLOCK = 0.07;
export const GAP = 0.0065;
export const LEAVES = 6;

/** Sağdaki yığının (blok + dönmemiş yapraklar) sırttan u uzaklığındaki üst
 *  yüzü. `curl`: sayfaların kıvrım derinliği (kapalı 0, açık 1). */
export function rightTop(u: number, curl: number, unturned: number) {
  return BLOCK + curl * gutterProfile(u) + (unturned + 1) * GAP;
}
