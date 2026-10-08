import type { Material } from "three";

/** Bir nesnenin çözülme miktarı (0 tam, 1 tamamen çözülmüş). Nesnenin bütün
 *  malzemeleri aynı değeri paylaşır; her karede bir kez yazılır. */
export type Dissolve = { value: number };

/* Çözülme: dünya konumundaki yumuşak bir gürültü eşiği geçen parçaları
   atar, eşiğin hemen üstünü ışıltılı bir kenar olarak boyar. Bütün
   malzemeler aynı gölgelendirici parçasını paylaşır (program önbelleği
   onBeforeCompile'ın kaynak metnine göre ayrılır). */
const noise = /* glsl */ `
  float dsHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float dsNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dsHash(i), dsHash(i + vec3(1, 0, 0)), f.x), mix(dsHash(i + vec3(0, 1, 0)), dsHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(dsHash(i + vec3(0, 0, 1)), dsHash(i + vec3(1, 0, 1)), f.x), mix(dsHash(i + vec3(0, 1, 1)), dsHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

/** Malzemeye çözülmeyi ekler; aynı malzeme ikinci kez yamalanmaz. */
export function dissolvable<T extends Material>(material: T, dissolve: Dissolve): T {
  if (material.userData.dissolve) return material;
  material.userData.dissolve = dissolve;
  // Önbellek anahtarı önceki yamayı da içerir: ekran açılması gibi kendi
  // yaması olan malzemeler düz malzemelerle aynı programı paylaşmasın.
  const key = material.customProgramCacheKey();
  material.customProgramCacheKey = () => `${key}|dissolve`;
  const previous = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.uDissolve = dissolve;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDissolvePos;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvDissolvePos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uDissolve;\nvarying vec3 vDissolvePos;\n${noise}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        float dsN = dsNoise(vDissolvePos * 5.0) * 0.65 + dsNoise(vDissolvePos * 13.0) * 0.35;
        float dsCut = uDissolve * 1.08;
        if (dsN < dsCut) discard;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float dsEdge = step(0.001, uDissolve) * (1.0 - smoothstep(dsCut, dsCut + 0.07, dsN));
        gl_FragColor.rgb += vec3(0.55, 0.72, 1.0) * dsEdge * 2.2;`,
      );
  };
  return material;
}
