import type { Material } from "three";

/** Bir nesnenin görünürlüğü (0 yok, 1 tam) ve buna katılan malzemeler.
 *  Geçişte nesne ışık efekti olmadan solar: malzemelerin saydamlığı bu
 *  değerle çarpılır (kits.tsx → useComposition), nesne biraz küçülüp kayar. */
export type Fade = {
  value: number;
  materials?: { material: Material; opacity: number; transparent: boolean }[];
};

/** Malzemeyi nesnenin solmasına katar; asıl saydamlığı saklanır. */
export function fading<T extends Material>(material: T, fade: Fade): T {
  if (material.userData.fade) return material;
  material.userData.fade = fade;
  fade.materials ??= [];
  fade.materials.push({ material, opacity: material.opacity, transparent: material.transparent });
  return material;
}

/** Solmayı uygular (yalnız değer değişince). Tam görünürken malzemeler kendi
 *  saydamlık ayarına döner; böylece sıralama ve derinlik bozulmaz. Saydamlık
 *  açılıp kapanınca three.js'in gölgelendiriciyi yeniden seçmesi gerekir
 *  (opak gölgelendirici alfayı 1'e sabitler); ikisi de ısınmada derlenmiştir. */
export function applyFade(fade: Fade, value: number) {
  if (fade.value === value) return;
  fade.value = value;
  for (const entry of fade.materials ?? []) {
    entry.material.opacity = entry.opacity * value;
    const transparent = entry.transparent || value < 0.999;
    if (entry.material.transparent === transparent) continue;
    entry.material.transparent = transparent;
    entry.material.needsUpdate = true;
  }
}

/** Malzeme kendiliğinden opak olup solmaya katılıyor mu? */
function togglesTransparency(material: Material) {
  const fade = material.userData.fade as Fade | undefined;
  const entry = fade?.materials?.find((e) => e.material === material);
  return entry !== undefined && !entry.transparent;
}

/** Isınma (Experience → precompile) için: solmaya katılan, kendisi opak
 *  malzemelerin iki gölgelendirici sürümü vardır (opak ve saydam). İkisi de
 *  önceden derlensin diye `compile` her sürüm için bir kez çağrılır; sonra
 *  malzemeler eski hâline döner ve bir sonraki karede gölgelendirici yeniden
 *  seçilir (derlenmiş olandan, yeni derleme olmadan). */
export function eachFadeVariant(materials: Iterable<Material>, compile: () => void) {
  const toggled = [...new Set(materials)].filter(togglesTransparency);
  const current = toggled.map((m) => m.transparent);
  for (const transparent of [true, false]) {
    for (const material of toggled) material.transparent = transparent;
    compile();
  }
  toggled.forEach((material, i) => {
    material.transparent = current[i];
    material.needsUpdate = true;
  });
}
