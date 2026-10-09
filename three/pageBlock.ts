import { BufferGeometry, Float32BufferAttribute } from "three";
import { gutterProfile } from "./bookShape.ts";

const COLUMNS = 32;

/** Köşe ve üçgen biriktirici. Sol blokta x ters olduğu için üçgenlerin
 *  sırası da ters çevrilir (ön yüz dışarı baksın). */
function builder(sign: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  /** Üst eğrideki köşeler: [köşe sırası, sırttan uzaklık (0–1)]. */
  const curve: [number, number][] = [];
  return {
    positions,
    uvs,
    indices,
    curve,
    vertex(x: number, y: number, z: number, u: number, v: number, onCurve: number | null) {
      const index = positions.length / 3;
      positions.push(x, y, z);
      uvs.push(u, v);
      if (onCurve !== null) curve.push([index, onCurve]);
      return index;
    },
    face(a: number, b: number, c: number) {
      if (sign > 0) indices.push(a, b, c);
      else indices.push(a, c, b);
    },
  };
}
type Builder = ReturnType<typeof builder>;

/** Üst yüz: sayfa çizimi. Sol sayfada cilt yeri sağda olduğu için u ters. */
function topFace(g: Builder, sign: number, width: number, height: number, top: (u: number) => number) {
  const rows: number[][] = [[], []];
  for (let c = 0; c <= COLUMNS; c++) {
    const u = c / COLUMNS;
    for (const [r, y] of [-height / 2, height / 2].entries())
      rows[r].push(g.vertex(sign * u * width, y, top(u), sign > 0 ? u : 1 - u, r, u));
  }
  for (let c = 0; c < COLUMNS; c++) {
    g.face(rows[0][c], rows[0][c + 1], rows[1][c + 1]);
    g.face(rows[0][c], rows[1][c + 1], rows[1][c]);
  }
}

/** Baş ya da kuyruk kenarı (y sabit): üstü eğriyi izler. `outward` +1 ise +y'ye bakar. */
function endFace(g: Builder, sign: number, width: number, y: number, depth: number, top: (u: number) => number, outward: number) {
  const low: number[] = [];
  const high: number[] = [];
  for (let c = 0; c <= COLUMNS; c++) {
    const u = c / COLUMNS;
    low.push(g.vertex(sign * u * width, y, 0, u, 0, null));
    high.push(g.vertex(sign * u * width, y, top(u), u, top(u) / depth, u));
  }
  for (let c = 0; c < COLUMNS; c++) {
    if (outward < 0) {
      g.face(low[c], low[c + 1], high[c + 1]);
      g.face(low[c], high[c + 1], high[c]);
    } else {
      g.face(low[c], high[c + 1], low[c + 1]);
      g.face(low[c], high[c], high[c + 1]);
    }
  }
}

/** Ön kenar (sırtın karşısı): düz. */
function foreEdge(g: Builder, x: number, height: number, depth: number) {
  const a = g.vertex(x, -height / 2, 0, 0, 0, null);
  const b = g.vertex(x, height / 2, 0, 1, 0, null);
  const c = g.vertex(x, height / 2, depth, 1, 1, null);
  const d = g.vertex(x, -height / 2, depth, 0, 1, null);
  g.face(a, b, c);
  g.face(a, c, d);
}

/** Sayfa bloğu: üstü eğri (sırtta gömük, ortada kubbeli; bkz. gutterProfile),
 *  yanları üst üste binmiş kâğıt. Sağ blok sırttan (x = 0) +x'e, sol blok
 *  -x'e uzanır; alt yüz z = 0'da. Malzeme grupları: 0 üst yüz (sayfa
 *  çizimi), 1 kenarlar (kâğıt destesi). Eğrinin derinliği bendBlock ile
 *  değişir: kitap kapalıyken sayfalar düz, açılınca kıvrılır. */
export function pageBlock(width: number, height: number, depth: number, side: "right" | "left") {
  const sign = side === "right" ? 1 : -1;
  const top = (u: number) => depth + gutterProfile(u);
  const g = builder(sign);
  topFace(g, sign, width, height, top);
  const topCount = g.indices.length;
  endFace(g, sign, width, -height / 2, depth, top, -1);
  endFace(g, sign, width, height / 2, depth, top, 1);
  foreEdge(g, sign * width, height, depth);
  const { positions, uvs, indices, curve } = g;

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, topCount, 0);
  geometry.addGroup(topCount, indices.length - topCount, 1);
  geometry.userData = { curve, depth, amount: 1 };
  geometry.computeVertexNormals();
  return geometry;
}

/** Eğrinin derinliği: 0 düz (kapalı kitap), 1 tam kıvrım (açık kitap). */
export function bendBlock(geometry: BufferGeometry, amount: number) {
  const { curve, depth } = geometry.userData as { curve: [number, number][]; depth: number; amount: number };
  if (Math.abs(geometry.userData.amount - amount) < 0.002) return;
  geometry.userData.amount = amount;
  const position = geometry.attributes.position;
  for (const [index, u] of curve) position.setZ(index, depth + amount * gutterProfile(u));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}
