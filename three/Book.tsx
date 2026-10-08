"use client";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector2,
  type Group,
  type Material,
  type Mesh,
  type Texture,
} from "three";
import { BLOCK, GAP, LEAVES, PAGE_H, PAGE_W, bendAngles, gutterProfile } from "./bookShape.ts";
import { inkProgress, pageTurn, riffle, smoothstep } from "./choreography.ts";
import { ChapterDevices } from "./Device.tsx";
import { frame } from "./Director.tsx";
import { blankPage, coverMask, drawPage, inkLayers, paperEdges, type PageArt } from "./pageArt.ts";
import { bendBlock, pageBlock } from "./pageBlock.ts";
import { story } from "./story.ts";
import { canvasTexture } from "./textures.ts";

export { PAGE_H, PAGE_W } from "./bookShape.ts";

const LEAF_D = 0.0035;
const SEGMENTS = 24;
const SEG_W = PAGE_W / SEGMENTS;
const COVER_D = 0.03;
const OVER = 0.035;
const COVER_W = PAGE_W + OVER;
const COVER_H = PAGE_H + OVER * 2;
/** Sağ yığının (blok + yapraklar) en yüksek yeri. */
export const Z_TOP = BLOCK + (LEAVES + 1) * GAP;
const Z_COVER_CLOSED = Z_TOP + COVER_D / 2 + 0.002;
const Z_COVER_OPEN = -COVER_D / 2;
/** Kapak menteşesi iki konumun ortasında: π dönünce kapak tam yerine oturur. */
const COVER_PIVOT = (Z_COVER_CLOSED + Z_COVER_OPEN) / 2;
const COVER_HALF = (Z_COVER_CLOSED - Z_COVER_OPEN) / 2;
/** Yuvarlak sırt: arka kapağın altından ön kapağın üstüne yarım silindir. */
const SPINE_BOTTOM = -COVER_D;
const SPINE_TOP = Z_COVER_CLOSED + COVER_D / 2;
const SPINE_R = (SPINE_TOP - SPINE_BOTTOM) / 2;
const SPINE_BULGE = 0.45;
const MARKER = "#ffd84a";
/** Sayfa etkin olunca çizimlerin tamamlanma süresi (ms). */
const INK_MS = 1600;

/** CC0 dokular (public/3d/LICENSES.md): kapak kumaşı ve kâğıt lifi. */
const SURFACE_MAPS = [
  "/3d/textures/cover-normal.webp",
  "/3d/textures/cover-rough.webp",
  "/3d/textures/paper-normal.webp",
  "/3d/textures/paper-rough.webp",
];

/** Yaprakların ön ve arka yüzleri. Her açılım bir bölümü karşılar:
 *  açılım k = (yaprak k-1 arkası, yaprak k önü). */
const leafArt: [front: PageArt, back: PageArt][] = [
  ["title", "month"],
  ["agenda", "sketch"],
  ["pdf", "checklist"],
  ["assignment", "package"],
  ["payments", "chat"],
  ["summary", "lines"],
];

/** Açık sayfaların dinlenme biçimi (tam kıvrım): sırtta gömük, ortada kubbeli. */
const REST = bendAngles(gutterProfile, SEGMENTS, PAGE_W);

/** Genişlik boyunca bölünmüş ince kutu; her köşe iki komşu kemiğe bağlı. */
function leafGeometry() {
  const geometry = new BoxGeometry(PAGE_W, PAGE_H, LEAF_D, SEGMENTS, 2, 1);
  geometry.translate(PAGE_W / 2, 0, 0);
  const position = geometry.attributes.position;
  const indices: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    let segment = Math.floor(x / SEG_W);
    let weight = (x - segment * SEG_W) / SEG_W;
    if (segment >= SEGMENTS) {
      segment = SEGMENTS - 1;
      weight = 1;
    } else if (segment < 0) {
      segment = 0;
      weight = 0;
    }
    indices.push(segment, segment + 1, 0, 0);
    weights.push(1 - weight, weight, 0, 0);
  }
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  return geometry;
}

type Ink = { progress: { value: number }; spread: number };

function makeLeaf(geometry: BoxGeometry, front: Material, back: Material, edge: Material, inks: Ink[]) {
  const bones: Bone[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const bone = new Bone();
    bone.position.x = i === 0 ? 0 : SEG_W;
    if (i > 0) bones[i - 1].add(bone);
    bones.push(bone);
  }
  // BoxGeometry yüz sırası: +x, -x, +y, -y, +z (ön), -z (arka).
  const mesh = new SkinnedMesh(geometry, [edge, edge, edge, edge, front, back]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(bones[0]);
  mesh.bind(new Skeleton(bones));
  return { mesh, bones, inks };
}

type Leaf = ReturnType<typeof makeLeaf>;
type Stack = { flip: number; fan: number; cover: number; curl: number; left: number; rootZ: number; still: boolean };

/** Bir yaprağın kemikleri ve yüksekliği: dönüş, yelpaze, kapakla havalanma,
 *  dinlenme biçimi (sağda yığının eğrisi, solda aynası) ve kâğıt kıvrımı. */
function poseLeaf({ mesh, bones }: Leaf, i: number, s: Stack) {
  const turn = pageTurn(s.flip, i);
  // Kapak açılırken üstteki sayfalar havalanır; dönen sayfanın altındaki
  // sayfa da hava akımıyla biraz kalkar.
  const follow = i > 0 && turn === 0 ? Math.sin(Math.PI * pageTurn(s.flip, i - 1)) * 0.1 : 0;
  const lift = s.still ? 0 : riffle(s.cover, i) + follow;
  const fanAngle = -Math.PI * (0.1 + (0.8 * i) / (LEAVES - 1));
  const angle = -Math.PI * turn + (fanAngle + Math.PI * turn) * s.fan - lift;
  const across = Math.min(1, Math.max(0, -angle / Math.PI));
  const rest = (s.curl * (1 - across) - s.curl * s.left * across) * (1 - s.fan);
  bones[0].rotation.y = angle + REST[0] * rest;
  // Dönen sayfa kâğıt gibi bükülür: ucu kökten geride kalır.
  const lag = Math.sin(Math.PI * turn) * 1.05 + s.fan * 0.12 + lift * 0.7;
  for (let b = 1; b < bones.length; b++)
    bones[b].rotation.y = REST[b] * rest + (lag / SEGMENTS) * (0.2 + 1.8 * Math.pow(b / SEGMENTS, 1.5));
  const zRight = s.rootZ + (LEAVES - i) * GAP;
  const zLeft = s.left * s.rootZ + (i + 1) * GAP;
  mesh.position.z = zRight + (zLeft - zRight) * across;
}

/** Kâğıt yüzü: çizimsiz sayfanın üstüne çizimler sırayla belirir. `ink`
 *  çizimler (önceden çarpılmış alfa), `time` her parçanın belirme sırası
 *  (kırmızı kanal); `progress` 0 boş sayfa, 1 bütün çizimler. Bütün sayfalar
 *  aynı gölgelendiriciyi paylaşır, dokular ve ilerleme malzemeye özeldir. */
function inkPaper(blank: Texture, ink: Texture, time: Texture, normal: Texture, rough: Texture) {
  const progress = { value: 1 };
  const material = new MeshStandardMaterial({
    map: blank,
    normalMap: normal,
    normalScale: new Vector2(0.45, 0.45),
    roughnessMap: rough,
    roughness: 0.92,
  });
  // Ön derleme (Experience → precompile) bu dokuları da ekran kartına yükler.
  material.userData.textures = [ink, time];
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = { value: ink };
    shader.uniforms.uInkTime = { value: time };
    shader.uniforms.uProgress = progress;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uInk;\nuniform sampler2D uInkTime;\nuniform float uProgress;",
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec4 inkColor = texture2D(uInk, vMapUv);
        float inkAt = texture2D(uInkTime, vMapUv).r;
        float inkShown = smoothstep(inkAt, inkAt + 0.04, uProgress * 1.04);
        diffuseColor.rgb = diffuseColor.rgb * (1.0 - inkColor.a * inkShown) + inkColor.rgb * inkShown;`,
      );
  };
  return { material, progress };
}

/** Çizimler: bir açılım etkin olunca (sayfa yerine oturunca) sırayla
 *  belirir; geri dönülünce silinir, yeniden gelince yeniden çizilir. */
function markSpreads(since: (number | null)[], pose: { cover: number; flip: number }, now: number, instant: boolean) {
  const reached = pose.cover > 0.95 ? Math.floor(pose.flip + 0.02) : -1;
  for (let s = 0; s < since.length; s++) {
    if (s > reached) since[s] = null;
    else if (since[s] === null) {
      since[s] = instant ? now - INK_MS : now;
      story.busyUntil = Math.max(story.busyUntil, now + INK_MS);
    }
  }
}

export function Book() {
  const gl = useThree((state) => state.gl);
  const root = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const leftBlock = useRef<Mesh>(null);
  const spine = useRef<Group>(null);
  const pointer = useRef(new Vector2());
  const strip = useRef<Mesh>(null);
  const ribbonMesh = useRef<Mesh>(null);
  const foil = useRef<Mesh>(null);
  /** Her açılımın (0–5) etkin olduğu an; null: henüz etkin değil. */
  const since = useRef<(number | null)[]>(new Array(LEAVES).fill(null));
  const [coverNormal, coverRough, paperNormal, paperRough] = useTexture(SURFACE_MAPS);

  const assets = useMemo(() => {
    for (const map of [coverNormal, coverRough, paperNormal, paperRough]) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    }
    coverNormal.repeat.set(1.6, 2.1);
    coverRough.repeat.set(1.6, 2.1);
    paperNormal.repeat.set(1.3, 1.7);
    paperRough.repeat.set(1.3, 1.7);
    const width = story.layout === "narrow" ? 448 : 640;
    const texture = (art: PageArt, gutter: "left" | "right") =>
      canvasTexture(drawPage(art, gutter, width), gl);
    const paper = (art: PageArt, gutter: "left" | "right") =>
      new MeshStandardMaterial({
        map: texture(art, gutter),
        normalMap: paperNormal,
        normalScale: new Vector2(0.45, 0.45),
        roughnessMap: paperRough,
        roughness: 0.92,
      });
    const blanks = {
      left: canvasTexture(blankPage("left", width), gl),
      right: canvasTexture(blankPage("right", width), gl),
    };
    /** Yaprak yüzü; çizim ilerlemesi ait olduğu açılımla birlikte `inks`e eklenir. */
    const face = (art: PageArt, gutter: "left" | "right", spread: number, inks: Ink[]) => {
      const layers = inkLayers(art, gutter, width);
      const ink = canvasTexture(layers.ink, gl);
      ink.premultiplyAlpha = true;
      const time = new CanvasTexture(layers.time);
      const { material, progress } = inkPaper(blanks[gutter], ink, time, paperNormal, paperRough);
      inks.push({ progress, spread });
      return material;
    };
    const edge = new MeshStandardMaterial({ color: "#e9e3d5", roughness: 0.95 });
    const stripes = canvasTexture(paperEdges(), gl);
    stripes.wrapS = RepeatWrapping;
    stripes.wrapT = RepeatWrapping;
    const stack = new MeshStandardMaterial({ map: stripes, roughness: 0.95 });
    const geometry = leafGeometry();
    const leaves = leafArt.map(([front, back], i) => {
      const inks: Ink[] = [];
      const frontFace = face(front, "left", i, inks);
      const backFace = face(back, "right", Math.min(i + 1, LEAVES - 1), inks);
      return makeLeaf(geometry, frontFace, backFace, edge, inks);
    });
    const board = new MeshPhysicalMaterial({
      color: "#121946",
      normalMap: coverNormal,
      normalScale: new Vector2(0.7, 0.7),
      roughnessMap: coverRough,
      roughness: 0.75,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
    });
    const coverFace = new MeshPhysicalMaterial({
      map: texture("cover", "left"),
      normalMap: coverNormal,
      normalScale: new Vector2(0.7, 0.7),
      roughnessMap: coverRough,
      roughness: 0.72,
      clearcoat: 0.3,
      clearcoatRoughness: 0.45,
      sheen: 0.5,
      sheenColor: "#8ea0ff",
      sheenRoughness: 0.55,
    });
    // Kapaktaki logo: ışığı yansıtan altın varak; kitap dönerken parlar.
    const gold = new MeshStandardMaterial({
      color: "#f0c24a",
      metalness: 1,
      roughness: 0.26,
      envMapIntensity: 1.8,
      emissive: MARKER,
      emissiveIntensity: 0.18,
      alphaMap: new CanvasTexture(coverMask(width)),
      transparent: true,
      depthWrite: false,
    });
    const glow = new MeshStandardMaterial({
      color: MARKER,
      emissive: MARKER,
      emissiveIntensity: 2.4,
      roughness: 0.4,
    });
    const ribbon = new MeshStandardMaterial({
      color: MARKER,
      emissive: MARKER,
      emissiveIntensity: 0.35,
      roughness: 0.55,
      side: DoubleSide,
    });
    return {
      leaves,
      geometry,
      blocks: {
        right: pageBlock(PAGE_W - 0.012, PAGE_H - 0.02, BLOCK, "right"),
        left: pageBlock(PAGE_W - 0.012, PAGE_H - 0.02, BLOCK, "left"),
      },
      spineGeometry: new CylinderGeometry(SPINE_R, SPINE_R, COVER_H, 28, 1, false, Math.PI, Math.PI),
      edge,
      stack,
      board,
      coverFace,
      gold,
      glow,
      ribbon,
      endpaper: paper("endpaper", "right"),
      lines: paper("lines", "left"),
    };
  }, [gl, coverNormal, coverRough, paperNormal, paperRough]);

  useEffect(
    () => () => {
      const materials = new Set<Material>([
        assets.edge,
        assets.stack,
        assets.board,
        assets.coverFace,
        assets.gold,
        assets.glow,
        assets.ribbon,
        assets.endpaper,
        assets.lines,
        ...assets.leaves.flatMap(({ mesh }) => mesh.material as Material[]),
      ]);
      for (const material of materials) {
        const maps = material as MeshStandardMaterial;
        maps.map?.dispose();
        maps.alphaMap?.dispose();
        for (const extra of (material.userData.textures ?? []) as Texture[]) extra.dispose();
        material.dispose();
      }
      assets.geometry.dispose();
      assets.blocks.right.dispose();
      assets.blocks.left.dispose();
      assets.spineGeometry.dispose();
    },
    [assets],
  );

  useFrame((_, delta) => {
    const pose = frame.pose;
    const group = root.current;
    if (!group || !cover.current || !leftBlock.current || !spine.current) return;

    const still = story.reduced;
    easing.damp2(pointer.current, [still ? 0 : story.pointerX, still ? 0 : story.pointerY], 0.6, delta);
    const t = frame.time;
    const drift = still ? 0 : 1;
    group.position.set(pose.x, pose.y + Math.sin(t * 0.7) * 0.035 * drift, pose.z);
    group.rotation.set(
      pose.rx - pointer.current.y * 0.07,
      pose.ry + pointer.current.x * 0.12,
      pose.rz + Math.sin(t * 0.45) * 0.012 * drift,
    );
    group.scale.setScalar(pose.scale);

    const open = smoothstep(0, 1, pose.cover);
    cover.current.rotation.y = -Math.PI * open;
    // Kapak açıldıkça sayfalar sırtta kıvrılır; kapalıyken düz durur.
    const curl = smoothstep(0.5, 1, pose.cover);
    bendBlock(assets.blocks.right, curl);
    bendBlock(assets.blocks.left, curl);
    const leftAmount = smoothstep(0.6, 1, pose.cover);
    leftBlock.current.visible = leftAmount > 0.01;
    leftBlock.current.scale.z = Math.max(0.001, leftAmount);
    spine.current.visible = pose.cover < 0.5;
    if (strip.current) (strip.current.material as MeshStandardMaterial).emissiveIntensity = 2.4 * frame.spine;
    if (ribbonMesh.current) {
      (ribbonMesh.current.material as MeshStandardMaterial).emissiveIntensity = 0.35 * Math.min(1, frame.spine);
      ribbonMesh.current.position.z = Z_TOP + curl * gutterProfile(0.11 / PAGE_W) + 0.004;
    }
    if (foil.current) (foil.current.material as MeshStandardMaterial).emissiveIntensity = 0.18 * Math.min(1, frame.spine);

    const stack: Stack = {
      flip: pose.flip,
      fan: pose.fan,
      cover: pose.cover,
      curl,
      left: leftAmount,
      rootZ: BLOCK + curl * gutterProfile(0),
      still,
    };
    const now = performance.now();
    markSpreads(since.current, pose, now, still || story.poster);
    assets.leaves.forEach((leaf, i) => {
      poseLeaf(leaf, i, stack);
      for (const ink of leaf.inks) ink.progress.value = inkProgress(now, since.current[ink.spread], INK_MS);
    });
  });

  return (
    <group ref={root}>
      {/* Arka kapak */}
      <mesh position={[COVER_W / 2 - 0.004, 0, -COVER_D / 2]} material={assets.board} castShadow receiveShadow>
        <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
      </mesh>
      {/* Sağ sayfa bloğu: üstü eğri, kenarları kâğıt destesi */}
      <mesh
        geometry={assets.blocks.right}
        position={[0.006, 0, 0]}
        material={[assets.lines, assets.stack]}
        castShadow
        receiveShadow
      />
      {/* Sol sayfa bloğu: kapak açıldıkça belirir, üstü forza (endpaper) */}
      <mesh
        ref={leftBlock}
        geometry={assets.blocks.left}
        position={[-0.006, 0, 0]}
        material={[assets.endpaper, assets.stack]}
        receiveShadow
      />
      {assets.leaves.map(({ mesh }, i) => (
        <primitive key={i} object={mesh} />
      ))}
      {/* Ön kapak: menteşe sırtta, iki konumun ortasında */}
      <group ref={cover} position={[0, 0, COVER_PIVOT]}>
        <mesh
          position={[COVER_W / 2 - 0.004, 0, COVER_HALF]}
          material={[assets.board, assets.board, assets.board, assets.board, assets.coverFace, assets.board]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
        </mesh>
        <mesh ref={foil} position={[COVER_W / 2 - 0.004, 0, COVER_HALF + COVER_D / 2 + 0.0008]} material={assets.gold}>
          <planeGeometry args={[COVER_W, COVER_H]} />
        </mesh>
      </group>
      {/* Yuvarlak sırt ve üzerindeki sarı şerit (kapalıyken görünür) */}
      <group ref={spine}>
        <mesh
          geometry={assets.spineGeometry}
          position={[-0.004, 0, (SPINE_TOP + SPINE_BOTTOM) / 2]}
          scale={[SPINE_BULGE, 1, 1]}
          material={assets.board}
          castShadow
        />
        <mesh
          ref={strip}
          position={[-0.004 - SPINE_R * SPINE_BULGE - 0.0015, 0, (SPINE_TOP + SPINE_BOTTOM) / 2]}
          material={assets.glow}
        >
          <boxGeometry args={[0.004, COVER_H * 0.9, 0.012]} />
        </mesh>
      </group>
      {/* Ayraç kurdelesi */}
      <mesh ref={ribbonMesh} position={[0.11, -PAGE_H / 2 + 0.02, Z_TOP + 0.004]} material={assets.ribbon}>
        <planeGeometry args={[0.045, 0.62]} />
      </mesh>
      <ChapterDevices />
    </group>
  );
}
