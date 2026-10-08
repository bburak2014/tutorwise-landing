import { Color, Vector3, type Material, type Mesh, type Object3D } from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

/** Bir nesnenin yüzeyinden örneklenmiş noktalar: hangi parçada, o parçanın
 *  kendi koordinatında nerede ve ne renkte. Dünya konumu geçişin başında,
 *  parçaların o anki duruşundan hesaplanır (worldPoints). */
export type Samples = { meshes: Mesh[]; owner: Uint16Array; local: Float32Array; colors: Float32Array };

const colorOf = (material: Material | Material[]) => {
  const m = (Array.isArray(material) ? material[0] : material) as Material & { color?: Color };
  return m.color ?? new Color("#c9d2ff");
};

export function sampleSurface(root: Object3D, count: number): Samples {
  const meshes: Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh && !mesh.userData.noSample && mesh.geometry.attributes.position) meshes.push(mesh);
  });
  const scale = new Vector3();
  const samplers = meshes.map((mesh) => new MeshSurfaceSampler(mesh).build());
  // Parçalar dünya alanlarıyla orantılı nokta alır.
  const areas = samplers.map((sampler, i) => {
    const total = sampler.distribution ? sampler.distribution[sampler.distribution.length - 1] : 0;
    meshes[i].getWorldScale(scale);
    return total * Math.abs(scale.x * scale.y);
  });
  const sum = areas.reduce((a, b) => a + b, 0) || 1;
  const owner = new Uint16Array(count);
  const local = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const point = new Vector3();
  let n = 0;
  meshes.forEach((mesh, i) => {
    const share = i === meshes.length - 1 ? count - n : Math.round((areas[i] / sum) * count);
    const color = colorOf(mesh.material);
    for (let k = 0; k < share && n < count; k++, n++) {
      samplers[i].sample(point);
      owner[n] = i;
      point.toArray(local, n * 3);
      color.toArray(colors, n * 3);
    }
  });
  return { meshes, owner, local, colors };
}

/** Örneklerin şu anki dünya konumları. */
export function worldPoints(samples: Samples, out: Float32Array) {
  if (samples.meshes.length === 0) return;
  const point = new Vector3();
  for (let i = 0; i < samples.owner.length; i++) {
    point.fromArray(samples.local, i * 3).applyMatrix4(samples.meshes[samples.owner[i]].matrixWorld);
    point.toArray(out, i * 3);
  }
}
