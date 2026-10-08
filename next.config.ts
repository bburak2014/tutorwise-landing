import type { NextConfig } from "next";

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
};

export default nextConfig;
