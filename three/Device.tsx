"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ExtrudeGeometry,
  type Group,
  MeshBasicMaterial,
  type Mesh,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TextureLoader,
  type Texture,
} from "three";
import type { DeviceKind, ScreenId } from "./choreography.ts";
import { fading, type Fade } from "./fade.ts";
import { drawScreen } from "./screenArt.ts";
import { versioned } from "../lib/assets.ts";
import { story } from "./story.ts";
import { canvasTexture } from "./textures.ts";

/* Markasız telefon ve tablet: yuvarlak köşeli alüminyum gövde, ince çerçeve,
   cam yüzey. Ekran ışık almaz (toneMapped kapalı): ekran görüntüsü olduğu
   gibi görünür ve yukarıdan aşağı satır satır açılır. */

const SPEC: Record<DeviceKind, { w: number; h: number; d: number; r: number; bezel: number }> = {
  // Ekran oranı ekran görüntüleriyle aynı: tablet 1180×820, telefon 390×844.
  tablet: { w: 1.2, h: 0.852, d: 0.028, r: 0.07, bezel: 0.03 },
  phone: { w: 0.4, h: 0.83, d: 0.03, r: 0.07, bezel: 0.016 },
};

const SCREEN_KIND: Record<ScreenId, DeviceKind> = {
  calendar: "tablet",
  board: "tablet",
  homework: "phone",
  packages: "tablet",
  summary: "phone",
};
const SCREENS = Object.keys(SCREEN_KIND) as ScreenId[];

/** Köşeleri yuvarlatılmış dikdörtgen (merkez orijinde). */
export function roundedShape(w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** Ekran yüzeyi: UV'ler 0..1'e yayılır ki doku tam otursun. */
function screenGeometry(w: number, h: number, r: number) {
  const geometry = new ShapeGeometry(roundedShape(w, h, r), 12);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++)
    uv.setXY(i, (position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
  return geometry;
}

function bodyGeometry(kind: DeviceKind) {
  const { w, h, d, r } = SPEC[kind];
  const bevel = 0.006;
  const geometry = new ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, r - bevel), {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -d / 2 + bevel);
  return geometry;
}

/** Beş ekranın dokuları: sayfanın dilindeki gerçek uygulama ekranları
 *  (public/screens/<dil>/<ekran>.webp). Dosya gelene kadar, ya da
 *  yüklenemezse, uygulamayı andıran bir çizim görünür. Bütün cihazlar aynı
 *  dokuları paylaşır (ScreensProvider); her doku GPU'ya bir kez çıkar. */
function useScreenTextures() {
  const gl = useThree((state) => state.gl);
  const textures = useMemo(() => {
    const scale = story.layout === "narrow" ? 0.75 : 1.2;
    const out = {} as Record<ScreenId, Texture>;
    for (const id of SCREENS) out[id] = canvasTexture(drawScreen(id, SCREEN_KIND[id], scale), gl);
    return out;
  }, [gl]);
  useEffect(() => {
    // Poster çekimi (?poster): posterler bütün dillerde ortak; ekranlar
    // dilden bağımsız çizimlerle kalır.
    if (story.poster) return;
    let alive = true;
    const locale = document.documentElement.lang;
    const loader = new TextureLoader();
    for (const id of SCREENS) {
      // Dar ekranda cihazlar küçük: küçük görüntüler (scripts/screens-small.mjs).
      const size = story.layout === "narrow" ? ".sm" : "";
      loader.load(versioned(`/screens/${locale}/${id}${size}.webp`), async (texture) => {
        // Görsel arka planda çözülür ve hemen ekran kartına yüklenir; cihaz
        // ilk kez yükseldiğinde bu iş kareyi dondurmaz.
        await (texture.image as HTMLImageElement).decode?.().catch(() => {});
        if (!alive) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        gl.initTexture(texture);
        const placeholder = textures[id];
        textures[id] = texture;
        placeholder.dispose();
      });
    }
    return () => {
      alive = false;
      Object.values(textures).forEach((t) => t.dispose());
    };
  }, [gl, textures]);
  return textures;
}

const ScreensContext = createContext<Record<ScreenId, Texture> | null>(null);

export function ScreensProvider({ children }: Readonly<{ children: ReactNode }>) {
  const screens = useScreenTextures();
  return <ScreensContext.Provider value={screens}>{children}</ScreensContext.Provider>;
}

export function useScreens() {
  const screens = useContext(ScreensContext);
  if (!screens) throw new Error("Cihazlar ScreensProvider içinde çizilmeli");
  return screens;
}

/** Malzemenin dokusu değiştiyse (geçici çizim → ekran görüntüsü) günceller. */
function showScreen(material: MeshBasicMaterial, texture: Texture) {
  if (material.map === texture) return;
  material.map = texture;
  material.needsUpdate = true;
}

/** Ekran malzemesi: ekran görüntüsü yukarıdan aşağı satır satır açılır,
 *  açılan satırın kenarı parlar (uReveal 0 kapalı ekran, 1 tam ekran). */
function screenMaterial(initial: Texture) {
  const reveal = { value: 1 };
  const material = new MeshBasicMaterial({ map: initial, toneMapped: false });
  material.userData.reveal = reveal;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = reveal;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uReveal;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float down = 1.0 - vMapUv.y;
        float lit = step(floor(down * 30.0) / 30.0, uReveal * 1.034 - 0.034);
        float edge = (1.0 - smoothstep(0.0, 0.045, abs(down - uReveal))) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));
        diffuseColor.rgb = mix(vec3(0.02, 0.03, 0.08), diffuseColor.rgb, lit) + vec3(0.45, 0.55, 1.0) * edge * 0.7;`,
      );
  };
  return material;
}

/** Bir cihazın dışarıdan yazılan durumu: ekranın açılma oranı (0–1). */
export type DeviceState = { reveal: number };

/** Gerçek uygulama ekranlı tablet ya da telefon. Malzemeler bir kez kurulur
 *  (doku sonradan değişir; yeni malzeme kurulsaydı gölgelendirici yeniden
 *  derlenir, ilk görünüşte kare donardı) ve nesnenin çözülmesine katılır. */
export function Device({
  kind,
  screen,
  fade,
  state,
}: Readonly<{ kind: DeviceKind; screen: ScreenId; fade: Fade; state: DeviceState }>) {
  const screens = useScreens();
  const display = useRef<Mesh>(null);
  const spec = SPEC[kind];
  const [assets] = useState(() => ({
    body: fading(
      new MeshPhysicalMaterial({ color: "#1d2030", metalness: 0.85, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      fade,
    ),
    screen: fading(screenMaterial(screens[screen]), fade),
    glass: fading(
      new MeshPhysicalMaterial({ transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, envMapIntensity: 1.4 }),
      fade,
    ),
  }));
  const geometries = useMemo(
    () => ({
      body: bodyGeometry(kind),
      screen: screenGeometry(spec.w - spec.bezel * 2, spec.h - spec.bezel * 2, spec.r - spec.bezel * 0.7),
    }),
    [kind, spec],
  );
  useEffect(
    () => () => {
      geometries.body.dispose();
      geometries.screen.dispose();
      for (const material of Object.values(assets)) material.dispose();
    },
    [geometries, assets],
  );
  useFrame(() => {
    const material = display.current?.material as MeshBasicMaterial | undefined;
    if (!material) return;
    showScreen(material, screens[screen]);
    (material.userData.reveal as { value: number }).value = story.reduced ? 1 : state.reveal;
  });
  return (
    <group>
      <mesh geometry={geometries.body} material={assets.body} />
      <mesh ref={display} geometry={geometries.screen} position-z={spec.d / 2 + 0.0008} material={assets.screen} />
      <mesh geometry={geometries.screen} position-z={spec.d / 2 + 0.0016} material={assets.glass} userData={{ noSample: true }} />
    </group>
  );
}

/* Dizüstü bilgisayar (açılış sahnesi): gümüş alüminyum gövde, klavye ve
   dokunmatik yüzey, menteşeden açılan kapak; ekranda uygulamanın gerçek
   ekranı. Ekran oranı ekran görüntüleriyle aynı (1180×820). */
const LAPTOP = { w: 1.5, h: 1.04, lid: 0.022, depth: 1.02, base: 0.034, r: 0.06, bezel: 0.04 };

/** Klavye: koyu tuşlar, gümüş zemin. Yazı yok. */
function keyboardCanvas() {
  const el = document.createElement("canvas");
  el.width = 1024;
  el.height = 360;
  const ctx = el.getContext("2d");
  if (!ctx) return el;
  ctx.fillStyle = "#9da3b2";
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.fillStyle = "#1c1f2b";
  const rows = [14, 14, 13, 12, 11];
  const gap = 8;
  const top = 18;
  const rowH = (el.height - top * 2 - gap * 5) / 6;
  rows.forEach((count, row) => {
    const keyW = (el.width - 40 - gap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.roundRect(20 + i * (keyW + gap), top + row * (rowH + gap), keyW, rowH, 7);
      ctx.fill();
    }
  });
  // Boşluk çubuğu sırası
  const y = top + 5 * (rowH + gap);
  const keys = [70, 70, 90, 380, 90, 70, 70];
  const total = keys.reduce((a, b) => a + b, 0) + gap * (keys.length - 1);
  let x = (el.width - total) / 2;
  for (const w of keys) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, rowH, 7);
    ctx.fill();
    x += w + gap;
  }
  return el;
}

/** Dizüstünün dışarıdan yazılan durumu: kapağın açıklığı ve ekranın açılması (0–1). */
export type LaptopState = { open: number; reveal: number };

/** Kapak kapalıyken gövdenin üstüne yatar; açıkken arkaya ~105° eğilir. */
export function lidAngle(open: number) {
  return Math.PI / 2 - (Math.PI / 2 + 0.27) * open;
}

export function Laptop({ screen, fade, state }: Readonly<{ screen: ScreenId; fade: Fade; state: LaptopState }>) {
  const screens = useScreens();
  const gl = useThree((s) => s.gl);
  const display = useRef<Mesh>(null);
  const hinge = useRef<Group>(null);
  const [assets] = useState(() => {
    const keys = canvasTexture(keyboardCanvas(), gl);
    return {
      body: fading(
        new MeshPhysicalMaterial({ color: "#c7ccd8", metalness: 0.8, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
        fade,
      ),
      bezel: fading(new MeshPhysicalMaterial({ color: "#0d0f17", metalness: 0.2, roughness: 0.4 }), fade),
      keys: fading(new MeshPhysicalMaterial({ map: keys, metalness: 0.5, roughness: 0.45 }), fade),
      pad: fading(new MeshPhysicalMaterial({ color: "#b4bac7", metalness: 0.7, roughness: 0.25, clearcoat: 0.6 }), fade),
      screen: fading(screenMaterial(screens[screen]), fade),
      glass: fading(
        new MeshPhysicalMaterial({ transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, envMapIntensity: 1.4 }),
        fade,
      ),
    };
  });
  const geometries = useMemo(() => {
    const { w, h, lid: lidDepth, depth, base, r, bezel } = LAPTOP;
    // Eğimli kenar kalınlığa eklenir; toplam kalınlık d kalsın diye çıkarılır
    // (yoksa ekran ve klavye levhanın içinde kalır).
    const bevel = 0.004;
    const slab = (sw: number, sh: number, d: number) => {
      const geometry = new ExtrudeGeometry(roundedShape(sw - bevel * 2, sh - bevel * 2, r - bevel), {
        depth: d - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3,
        curveSegments: 16,
      });
      geometry.translate(0, 0, -d / 2 + bevel);
      return geometry;
    };
    return {
      base: slab(w, depth, base),
      lid: slab(w, h, lidDepth),
      inner: new ShapeGeometry(roundedShape(w - 0.012, h - 0.012, r - 0.006), 12),
      screen: screenGeometry(w - bezel * 2, h - bezel * 2, 0.02),
      // Klavye dokusu yüzeye 0..1 UV ile yayılır (ekran yüzeyi gibi).
      keys: screenGeometry(w * 0.88, depth * 0.38, 0.02),
      pad: new ShapeGeometry(roundedShape(w * 0.36, depth * 0.24, 0.03), 8),
    };
  }, []);
  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose();
      for (const material of Object.values(assets)) material.dispose();
    },
    [geometries, assets],
  );
  useFrame(() => {
    const material = display.current?.material as MeshBasicMaterial | undefined;
    if (material) {
      showScreen(material, screens[screen]);
      (material.userData.reveal as { value: number }).value = story.reduced ? 1 : state.reveal;
    }
    if (hinge.current) hinge.current.rotation.x = lidAngle(story.reduced ? 1 : state.open);
  });
  const { h, depth, base, lid: lidDepth } = LAPTOP;
  return (
    <group>
      {/* Gövde yatay: üst yüzü +y'ye bakar. */}
      <group rotation-x={-Math.PI / 2}>
        <mesh geometry={geometries.base} material={assets.body} />
        <mesh geometry={geometries.keys} position={[0, depth * 0.14, base / 2 + 0.001]} material={assets.keys} />
        <mesh geometry={geometries.pad} position={[0, -depth * 0.3, base / 2 + 0.001]} material={assets.pad} />
      </group>
      {/* Menteşe gövdenin arka kenarında; kapak buradan döner. */}
      <group ref={hinge} position={[0, base / 2, -depth / 2 + 0.02]}>
        <group position={[0, h / 2, lidDepth / 2]}>
          <mesh geometry={geometries.lid} material={assets.body} />
          <mesh geometry={geometries.inner} position-z={lidDepth / 2 + 0.0006} material={assets.bezel} />
          <mesh ref={display} geometry={geometries.screen} position-z={lidDepth / 2 + 0.0012} material={assets.screen} />
          <mesh geometry={geometries.screen} position-z={lidDepth / 2 + 0.002} material={assets.glass} userData={{ noSample: true }} />
        </group>
      </group>
    </group>
  );
}
