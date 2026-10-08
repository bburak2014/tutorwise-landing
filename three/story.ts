import type { Layout } from "./choreography.ts";

/** Sayfa (DOM) ile 3D sahne arasındaki ortak durum. React state'i değildir:
 *  her karede okunur, değişmesi yeniden çizim tetiklemez. */
export const story = {
  /** Yumuşatılmış beat; sahne bunu okur. */
  beat: 0,
  /** Kaydırmanın şu anki beat'i; `beat` buna doğru yumuşakça gider. */
  target: 0,
  /** İmlecin görünüm alanındaki konumu (-1..1); dokunmatikte 0. */
  pointerX: 0,
  pointerY: 0,
  layout: "wide" as Layout,
  /** prefers-reduced-motion: boşta süzülme ve imleç paralaksı yok. */
  reduced: false,
  /** Poster çekimi (?poster=<beat>): sahne sabit, cihazlar gizli. */
  poster: false,
};
