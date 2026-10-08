"use client";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  BoxGeometry,
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
} from "three";
import { pageTurn, smoothstep } from "./choreography.ts";
import { ChapterDevices } from "./Device.tsx";
import { frame } from "./Director.tsx";
import { drawPage, type PageArt } from "./pageArt.ts";
import { story } from "./story.ts";
import { canvasTexture } from "./textures.ts";

/* Kitabın ölçüleri (dünya birimi). Cilt (sırt) x = 0'da; dönmemiş sayfalar
   sağda (+x), dönmüş sayfalar solda. Sayfa yüzü +z'ye, kameraya bakar. */
export const PAGE_W = 1.28;
export const PAGE_H = 1.71;
const LEAF_D = 0.0035;
const SEGMENTS = 24;
const SEG_W = PAGE_W / SEGMENTS;
const LEAVES = 6;
const GAP = 0.0065;
const BLOCK = 0.07;
const COVER_D = 0.03;
const OVER = 0.035;
const COVER_W = PAGE_W + OVER;
const COVER_H = PAGE_H + OVER * 2;
/** Sağ yığının (blok + yapraklar) üst yüzü. */
export const Z_TOP = BLOCK + (LEAVES + 1) * GAP;
const Z_COVER_CLOSED = Z_TOP + COVER_D / 2 + 0.002;
const Z_COVER_OPEN = -COVER_D / 2;
/** Kapak menteşesi iki konumun ortasında: π dönünce kapak tam yerine oturur. */
const COVER_PIVOT = (Z_COVER_CLOSED + Z_COVER_OPEN) / 2;
const COVER_HALF = (Z_COVER_CLOSED - Z_COVER_OPEN) / 2;
const MARKER = "#ffd84a";

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

function makeLeaf(geometry: BoxGeometry, front: Material, back: Material, edge: Material) {
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
  return { mesh, bones };
}

export function Book() {
  const gl = useThree((state) => state.gl);
  const root = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const leftBlock = useRef<Mesh>(null);
  const spine = useRef<Group>(null);
  const pointer = useRef(new Vector2());
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
    const edge = new MeshStandardMaterial({ color: "#e9e3d5", roughness: 0.95 });
    const geometry = leafGeometry();
    const leaves = leafArt.map(([front, back]) =>
      makeLeaf(geometry, paper(front, "left"), paper(back, "right"), edge),
    );
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
      edge,
      board,
      coverFace,
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
        assets.board,
        assets.coverFace,
        assets.glow,
        assets.ribbon,
        assets.endpaper,
        assets.lines,
        ...assets.leaves.flatMap(({ mesh }) => mesh.material as Material[]),
      ]);
      for (const material of materials) {
        (material as MeshStandardMaterial).map?.dispose();
        material.dispose();
      }
      assets.geometry.dispose();
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
    const leftAmount = smoothstep(0.6, 1, pose.cover);
    leftBlock.current.visible = leftAmount > 0.01;
    leftBlock.current.scale.z = Math.max(0.001, leftAmount);
    leftBlock.current.position.z = (BLOCK * leftAmount) / 2;
    spine.current.visible = pose.cover < 0.5;

    assets.leaves.forEach(({ mesh, bones }, i) => {
      const turn = pageTurn(pose.flip, i);
      const fanAngle = -Math.PI * (0.1 + (0.8 * i) / (LEAVES - 1));
      const angle = -Math.PI * turn + (fanAngle + Math.PI * turn) * pose.fan;
      bones[0].rotation.y = angle;
      // Dönen sayfa kâğıt gibi bükülür: uç kısmı kökten geride kalır.
      const lag = Math.sin(Math.PI * turn) * 0.7 + pose.fan * 0.12;
      for (let b = 1; b < bones.length; b++)
        bones[b].rotation.y = (lag / SEGMENTS) * (0.4 + (1.2 * b) / SEGMENTS);
      const across = Math.min(1, Math.max(0, -angle / Math.PI));
      const zRight = BLOCK + (LEAVES - i) * GAP;
      const zLeft = BLOCK * leftAmount + (i + 1) * GAP;
      mesh.position.z = zRight + (zLeft - zRight) * across;
    });
  });

  return (
    <group ref={root}>
      {/* Arka kapak */}
      <mesh position={[COVER_W / 2 - 0.004, 0, -COVER_D / 2]} material={assets.board} castShadow receiveShadow>
        <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
      </mesh>
      {/* Sağ sayfa bloğu */}
      <mesh
        position={[PAGE_W / 2, 0, BLOCK / 2]}
        material={[assets.edge, assets.edge, assets.edge, assets.edge, assets.lines, assets.edge]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[PAGE_W - 0.012, PAGE_H - 0.02, BLOCK]} />
      </mesh>
      {/* Sol sayfa bloğu: kapak açıldıkça belirir, üstü forza (endpaper) */}
      <mesh
        ref={leftBlock}
        position={[-PAGE_W / 2, 0, BLOCK / 2]}
        material={[assets.edge, assets.edge, assets.edge, assets.edge, assets.endpaper, assets.edge]}
        receiveShadow
      >
        <boxGeometry args={[PAGE_W - 0.012, PAGE_H - 0.02, BLOCK]} />
      </mesh>
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
      </group>
      {/* Sırt ve üzerindeki sarı şerit (kapalıyken görünür) */}
      <group ref={spine}>
        <mesh
          position={[-COVER_D / 2, 0, (Z_COVER_CLOSED + COVER_D / 2 - COVER_D) / 2]}
          material={assets.board}
          castShadow
        >
          <boxGeometry args={[COVER_D, COVER_H, Z_COVER_CLOSED + COVER_D / 2 + COVER_D]} />
        </mesh>
        <mesh position={[-COVER_D - 0.001, 0, Z_TOP / 2]} material={assets.glow}>
          <boxGeometry args={[0.004, COVER_H * 0.9, 0.012]} />
        </mesh>
      </group>
      {/* Ayraç kurdelesi */}
      <mesh position={[0.11, -PAGE_H / 2 + 0.02, Z_TOP + 0.004]} material={assets.ribbon}>
        <planeGeometry args={[0.045, 0.62]} />
      </mesh>
      <ChapterDevices />
    </group>
  );
}
