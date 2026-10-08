import { CanvasTexture, SRGBColorSpace, type WebGLRenderer } from "three";

/** Tuvali sRGB dokuya çevirir; eğik bakışta netlik için anizotropi açık. */
export function canvasTexture(canvas: HTMLCanvasElement, gl: WebGLRenderer) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  return texture;
}
