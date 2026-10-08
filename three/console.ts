import { setConsoleFunction } from "three";

/* three.js r183'ten beri THREE.Clock'u kullanımdan kalkmış sayıyor. React
   Three Fiber 9 kendi saatini hâlâ Clock ile kuruyor (R3F 10 THREE.Timer'a
   geçiyor, henüz kararlı değil). Bizim kodumuz Clock kullanmıyor; bu tek
   bilinen uyarı konsola düşmesin diye süzülür. Diğer bütün uyarılar, hatalar
   ve günlükler olduğu gibi geçer. R3F 10'a geçince bu dosya silinir. */
const DROPPED_WARNINGS = ["THREE.Clock: This module has been deprecated"];

type Level = "log" | "warn" | "error";

export function shouldForward(level: Level, message: string): boolean {
  return level !== "warn" || !DROPPED_WARNINGS.some((prefix) => message.startsWith(prefix));
}

export function installThreeConsole() {
  setConsoleFunction((level: Level, message: string, ...params: unknown[]) => {
    if (shouldForward(level, message)) console[level](message, ...params);
  });
}
