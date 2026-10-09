import type { NextConfig } from "next";
import { assetVersion } from "./lib/asset-version.ts";

// Statik çıktı: `next build` → out/. Her dil kendi klasöründe (out/tr/index.html).
// Statik çıktıda headers/redirects ayarı ve varsayılan görsel iyileştirmesi
// çalışmaz; güvenlik başlıkları public/_headers'ta, görseller olduğu gibi.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // Büyük JS paketleri için kaynak haritaları (hata ayıklama, Lighthouse).
  // Kaynak kod zaten açık depoda; haritalar yalnız istenince indirilir.
  productionBrowserSourceMaps: true,
  // Ekran görüntüleri ve posterler ?v=<içerik özeti> ile istenir; _headers
  // onları bir yıl önbellekte tutar (lib/assets.ts).
  env: { NEXT_PUBLIC_ASSET_VERSION: assetVersion(["public/screens", "public/poster"]) },
};

export default nextConfig;
