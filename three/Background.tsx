"use client";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, PlaneGeometry, ShaderMaterial, Vector2 } from "three";

/* Sahnenin arka planı: CSS'teki .stage geçişlerinin aynısı (lacivert zemin,
   sağ üstte marka mavisi ışıma). Tuval belirirken renk sıçraması olmaz.
   Renkler doğrusal uzayda verilir; çıktı dönüşümünü three yapar. */

const linear = (hex: string) => new Color(hex).convertSRGBToLinear();

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform vec2 uAspect;
  varying vec2 vUv;

  float ellipse(vec2 p, vec2 c, vec2 r) {
    vec2 d = (p - c) / r;
    return clamp(1.0 - length(d), 0.0, 1.0);
  }

  // Bantlaşmayı önleyen çok hafif titreşim.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float y = 1.0 - vUv.y;
    vec3 base = y < 0.55
      ? mix(uTop, uMid, y / 0.55)
      : mix(uMid, uBottom, (y - 0.55) / 0.45);
    float a = ellipse(vUv, vec2(0.78, 0.62), vec2(0.6, 0.5));
    float b = ellipse(vUv, vec2(0.18, 0.15), vec2(0.4, 0.35));
    vec3 color = base + uGlow * (0.32 * a * a * 1.6 + 0.14 * b * b * 1.6);
    color += (hash(vUv * uAspect) - 0.5) / 255.0;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Background() {
  const size = useThree((state) => state.size);
  const { geometry, material } = useMemo(
    () => ({
      geometry: new PlaneGeometry(2, 2),
      material: new ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        uniforms: {
          uTop: { value: linear("#070a1f") },
          uMid: { value: linear("#0b1030") },
          uBottom: { value: linear("#060918") },
          uGlow: { value: linear("#2338a8") },
          uAspect: { value: new Vector2(1, 1) },
        },
      }),
    }),
    [],
  );
  useEffect(() => {
    material.uniforms.uAspect.value.set(size.width, size.height);
  }, [material, size]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
