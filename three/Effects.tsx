"use client";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

/* Son işlem: yalnız sarı vurguları tutan hafif bir parlama, renkleri
   koruyan ton eşleme (Neutral), çok hafif film greni ve vinyet. */
export function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Noise opacity={0.035} premultiply blendFunction={BlendFunction.SCREEN} />
      <Vignette offset={0.25} darkness={0.4} />
    </EffectComposer>
  );
}
