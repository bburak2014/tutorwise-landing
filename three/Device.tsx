"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AdditiveBlending,
  ExtrudeGeometry,
  MeshBasicMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TextureLoader,
  type Group,
  type Mesh,
  type Texture,
} from "three";
import { LEAVES, PAGE_W, rightTop } from "./bookShape.ts";
import { screenReveal, smoothstep, type DeviceKind, type ScreenId } from "./choreography.ts";
import { frame } from "./Director.tsx";
import { drawScreen } from "./screenArt.ts";
import { story } from "./story.ts";
import { canvasTexture } from "./textures.ts";

/* Markasız telefon ve tablet: yuvarlak köşeli alüminyum gövde, ince çerçeve,
   cam yüzey. Ekran ışık almaz (toneMapped kapalı): ekran görüntüsü olduğu
   gibi görünür. */

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

function roundedShape(w: number, h: number, r: number) {
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

/** Ekranın üzerinden geçen çapraz ışık bandı: cihaz yerine otururken bir
 *  kez soldan sağa süpürür. Konum dışarıdan (sheen.value) verilir. */
const sheenFragment = /* glsl */ `
  uniform float uPos;
  varying vec2 vUv;
  void main() {
    float d = abs((vUv.x + vUv.y * 0.45) - uPos);
    float band = 1.0 - smoothstep(0.0, 0.14, d);
    gl_FragColor = vec4(vec3(1.0), band * 0.32);
  }
`;
const sheenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Parlamanın konumu için dışarıdan yazılan değer (React state'i değil). */
export type Sheen = { value: number };

export function DeviceModel({
  kind,
  screen,
  sheen,
}: Readonly<{ kind: DeviceKind; screen: MeshBasicMaterial; sheen?: Sheen }>) {
  const spec = SPEC[kind];
  const band = useRef<Mesh>(null);
  const sheenMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sheenVertex,
        fragmentShader: sheenFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uPos: { value: -1 } },
      }),
    [],
  );
  useEffect(() => () => sheenMaterial.dispose(), [sheenMaterial]);
  useFrame(() => {
    if (!band.current || !sheen) return;
    const pos = sheen.value;
    band.current.visible = pos > -0.3 && pos < 1.75;
    (band.current.material as ShaderMaterial).uniforms.uPos.value = pos;
  });
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
    },
    [geometries],
  );
  return (
    <group>
      <mesh geometry={geometries.body} castShadow>
        <meshPhysicalMaterial
          color="#1d2030"
          metalness={0.85}
          roughness={0.3}
          clearcoat={0.7}
          clearcoatRoughness={0.25}
        />
      </mesh>
      <mesh geometry={geometries.screen} position-z={spec.d / 2 + 0.0008} material={screen} />
      {sheen && (
        <mesh
          ref={band}
          geometry={geometries.screen}
          position-z={spec.d / 2 + 0.0012}
          material={sheenMaterial}
          visible={false}
        />
      )}
      <mesh geometry={geometries.screen} position-z={spec.d / 2 + 0.0016}>
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0.05} metalness={0} envMapIntensity={1.4} />
      </mesh>
    </group>
  );
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
    let alive = true;
    const locale = document.documentElement.lang;
    const loader = new TextureLoader();
    for (const id of SCREENS) {
      loader.load(`/screens/${locale}/${id}.webp`, async (texture) => {
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

function useScreens() {
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

const setReveal = (material: MeshBasicMaterial, value: number) => {
  (material.userData.reveal as { value: number }).value = story.reduced ? 1 : value;
};

/** Ekranın malzemesi bir kez kurulur; doku sonradan showScreen ile değişir.
 *  (Doku değişince yeni malzeme kurulursa eskisinin gölgelendiricisi
 *  bırakılır ve cihaz ilk göründüğünde yeniden derlenir, kare donar.) */
function useScreenMaterial(initial: Texture) {
  const [material] = useState(() => screenMaterial(initial));
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/** Cihaz yükselirken sayfanın yüzünde açılan ışık halkası: ortada sarı bir
 *  çekirdek, dışa doğru genişleyip sönen mavi bir halka. */
const ringFragment = /* glsl */ `
  uniform float uT;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float radius = mix(0.08, 0.95, uT);
    float ring = exp(-pow((d - radius) * 16.0, 2.0)) * (1.0 - uT);
    float core = exp(-pow(d * 3.4, 2.0)) * (1.0 - uT * 0.7);
    vec3 color = mix(vec3(0.55, 0.63, 1.0), vec3(1.0, 0.85, 0.29), core / max(core + ring, 0.0001));
    gl_FragColor = vec4(color, clamp((ring + core * 0.8) * uStrength, 0.0, 1.0));
  }
`;

function PageRing({ rise }: Readonly<{ rise: { value: number } }>) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sheenVertex,
        fragmentShader: ringFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uT: { value: 0 }, uStrength: { value: 0 } },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (!mesh.current) return;
    const r = rise.value;
    const visible = !story.poster && !story.reduced && r > 0.002 && r < 0.995;
    mesh.current.visible = visible;
    if (!visible) return;
    // Halka, sağda en üstteki yaprağın yüzünde durur.
    const curl = smoothstep(0.5, 1, frame.pose.cover);
    mesh.current.position.z = rightTop(0.66 / PAGE_W, curl, LEAVES - 1 - Math.round(frame.pose.flip)) + 0.004;
    const { uniforms } = mesh.current.material as ShaderMaterial;
    uniforms.uT.value = smoothstep(0.05, 0.9, r);
    uniforms.uStrength.value = smoothstep(0, 0.12, r) * (1 - smoothstep(0.85, 0.99, r)) * 1.4;
  });
  return (
    <mesh ref={mesh} position={[0.66, -0.12, 0.13]} material={material} visible={false}>
      <planeGeometry args={[1.2, 1.2]} />
    </mesh>
  );
}

/** Özellik bölümlerinde sayfadan yükselen cihaz (kitabın çocuğu). */
/** Cihaz yükselişinin son yarısında parlama -0.4'ten 1.8'e süpürür. */
const sweep = (amount: number) => -0.4 + 2.2 * smoothstep(0.45, 1, amount);
const chapterSheen = { tablet: { value: -1 }, phone: { value: -1 } };
const pairSheen = { tablet: { value: -1 }, phone: { value: -1 } };
/** Bölüm cihazının yükselişi (0–1); halka okur. */
const chapterRise = { value: 0 };

export function ChapterDevices() {
  const screens = useScreens();
  const tabletScreen = useScreenMaterial(screens.calendar);
  const phoneScreen = useScreenMaterial(screens.homework);
  const tablet = useRef<Group>(null);
  const phone = useRef<Group>(null);

  useFrame(() => {
    const device = frame.device;
    const rise = smoothstep(0, 1, device.rise);
    chapterRise.value = device.screen === null ? 0 : rise;
    for (const [kind, group, material] of [
      ["tablet", tablet.current, tabletScreen],
      ["phone", phone.current, phoneScreen],
    ] as const) {
      if (!group) continue;
      const active = !story.poster && device.kind === kind && device.screen !== null && rise > 0.002;
      group.visible = active;
      if (!active || !device.screen) continue;
      showScreen(material, screens[device.screen]);
      setReveal(material, screenReveal(rise));
      chapterSheen[kind].value = story.reduced ? -1 : sweep(rise);
      // Sağ sayfanın ortasından yükselir; kitabın eğimini dengeleyip kameraya döner.
      group.position.set(0.66, -0.12 + rise * 0.28, 0.12 + rise * 0.78);
      group.rotation.set(-frame.pose.rx * rise * 0.9, -0.12 * rise, (1 - rise) * 0.08);
      group.scale.setScalar((kind === "tablet" ? 0.95 : 1.1) * (0.3 + 0.7 * rise));
    }
  });

  return (
    <>
      <group ref={tablet} visible={false}>
        <DeviceModel kind="tablet" screen={tabletScreen} sheen={chapterSheen.tablet} />
      </group>
      <group ref={phone} visible={false}>
        <DeviceModel kind="phone" screen={phoneScreen} sheen={chapterSheen.phone} />
      </group>
      <PageRing rise={chapterRise} />
    </>
  );
}

/** "Her yerde" sahnesi: telefon ve tablet metnin iki yanında. */
export function PairDevices() {
  const screens = useScreens();
  const tabletScreen = useScreenMaterial(screens.calendar);
  const phoneScreen = useScreenMaterial(screens.summary);
  const root = useRef<Group>(null);
  const tablet = useRef<Group>(null);
  const phone = useRef<Group>(null);

  useFrame(() => {
    const amount = smoothstep(0, 1, frame.pose.pair);
    if (!root.current || !tablet.current || !phone.current) return;
    root.current.visible = !story.poster && amount > 0.002;
    if (!root.current.visible) return;
    showScreen(tabletScreen, screens.calendar);
    showScreen(phoneScreen, screens.summary);
    setReveal(tabletScreen, screenReveal(amount));
    setReveal(phoneScreen, screenReveal(Math.max(0, amount - 0.08)));
    pairSheen.tablet.value = story.reduced ? -1 : sweep(amount);
    pairSheen.phone.value = story.reduced ? -1 : sweep(Math.max(0, amount - 0.08));
    const narrow = story.layout === "narrow";
    const t = frame.time;
    const bob = story.reduced ? 0 : Math.sin(t * 0.8) * 0.03;
    const lift = (1 - amount) * -0.8;
    if (narrow) {
      tablet.current.position.set(-0.25, 1.12 + lift + bob, -0.4);
      phone.current.position.set(0.62, 0.98 + lift - bob, 0.2);
    } else {
      tablet.current.position.set(2.68, -0.05 + lift + bob, -0.4);
      phone.current.position.set(-2.72, -0.1 + lift - bob, 0.1);
    }
    tablet.current.rotation.set(0.05, narrow ? 0.18 : -0.52, 0.03);
    phone.current.rotation.set(0.04, narrow ? -0.2 : 0.48, -0.04);
    const scale = (narrow ? 0.7 : 0.95) * (0.85 + 0.15 * amount);
    tablet.current.scale.setScalar(scale);
    phone.current.scale.setScalar(scale * 1.15);
  });

  return (
    <group ref={root} visible={false}>
      <group ref={tablet}>
        <DeviceModel kind="tablet" screen={tabletScreen} sheen={pairSheen.tablet} />
      </group>
      <group ref={phone}>
        <DeviceModel kind="phone" screen={phoneScreen} sheen={pairSheen.phone} />
      </group>
    </group>
  );
}
