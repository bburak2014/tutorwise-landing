/* Sinematik kamera için saf hesap (three.js'e bağlı değil; test edilir). */

export type Vec3 = [number, number, number];

/** Kameranın kitaba göre hareketi: yaklaşma (dolly < 1), kitabın dikey
 *  ekseni çevresinde dönme (orbit) ve hafif yukarıdan bakma (tilt), radyan. */
export type CameraMove = { dolly: number; orbit: number; tilt: number };

/** Kamera kurulumunu (konum + bakış noktası) kitabın merkezi çevresinde
 *  döndürür ve ölçekler. Bütün kurulum birlikte döndüğü için kitap ekranda
 *  aynı yerde kalır (metinle çakışmaz); yalnız açı ve yakınlık değişir. */
export function cameraFor(base: { position: Vec3; target: Vec3 }, book: Vec3, move: CameraMove) {
  const co = Math.cos(move.orbit);
  const so = Math.sin(move.orbit);
  const ct = Math.cos(move.tilt);
  const st = Math.sin(move.tilt);
  const place = (point: Vec3): Vec3 => {
    const x = point[0] - book[0];
    const y = point[1] - book[1];
    const z = point[2] - book[2];
    // Önce dikey eksen (orbit), sonra yatay eksen (tilt) çevresinde.
    const x1 = x * co + z * so;
    const z1 = -x * so + z * co;
    const y2 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    return [book[0] + x1 * move.dolly, book[1] + y2 * move.dolly, book[2] + z2 * move.dolly];
  };
  return { position: place(base.position), target: place(base.target) };
}
