# Tutorwise — tanıtım sitesi

[tutorwise.academy](https://tutorwise.academy) için statik tanıtım sitesi. Next.js 16
(`output: "export"`), React Three Fiber, Drei ve GSAP. 7 dil: tr, en, de, fr, es, zh, ja.

Sayfa kaydırıldıkça açılan bir kitap anlatır: kitap karanlıktan ışığa doğru süzülerek
gelir, kapak açılır, her özellik bölümünde bir sayfa döner ve sayfadan, o dildeki gerçek
uygulama ekranını gösteren bir tablet ya da telefon yükselir. Geniş ekranda beş özellik
tek, sabitlenmiş bir sahnede okunur (soldaki 01–05 çizgisi); sayfa sonunda kitap kapanır,
sırtı nabız gibi parlar.

## Başlatma

Node 22.13+ ve pnpm 11.

```sh
pnpm install
pnpm dev          # geliştirme: http://localhost:3200
pnpm build        # statik çıktı: out/
pnpm serve        # out/'u yayındaki gibi servis eder (_headers dahil): http://127.0.0.1:4321
```

Kontroller:

```sh
pnpm typecheck && pnpm lint && pnpm test
pnpm verify       # gerçek tarayıcıda: yönlendirme, 7 dil × 2 düzen, FPS, hareket azaltma, WebGL'siz
pnpm e2e          # ziyaretçi gibi: bağlantılar, menü, bölüm çizgisi, imleç, tekerlek, açılış, 3D donması
```

`pnpm test` statik çıktıyı da denetler; önce `pnpm build` gerekir. `pnpm verify` ve
`pnpm e2e` için `pnpm serve` açık olmalı; ikisi de canlı siteye de çalıştırılabilir
(`pnpm e2e https://tutorwise.academy`).

## Neyi nereden değiştiririm

| Ne | Nerede |
|---|---|
| Metinler (7 dil) | `content/<dil>.ts`. Türkçe kaynak; diğerleri aynı anahtarları taşımak zorunda (derleme hatası). |
| Gerçek bilgi bekleyenler | Sayfada sarı kesik çizgiyle görünür: `[YER TUTUCU …]`, `[PLACEHOLDER …]` vb. (ekip hikâyesi, iletişim e-postası). |
| Bağlantılar (uygulama, mağazalar, gizlilik) | `lib/site.ts` → `links` (şimdilik hepsi `#`). |
| Dil çerezinin alan adı | `lib/site.ts` → `cookieDomain` (örn. `.tutorwise.academy`, uygulamayla paylaşmak için). |
| Kitabın her bölümdeki pozu | `three/choreography.ts` → `keys.wide` / `keys.narrow`. |
| Sayfa görselleri (yazısız) | `three/pageArt.ts`. |
| Açılış, sırt ışığı, bölüm geçişi (saf fonksiyonlar) | `three/choreography.ts` → `introPose`, `spineGlow`, `chapterIndex`. |
| Işık huzmesi, toz | `three/Atmosphere.tsx`. |

Dil listesi, eşleme kuralları ve bayraklar ana uygulamadan (derslik deposu,
`packages/contracts/src/i18n`) kopyalandı; uygulamaya dil eklenirse `i18n/` de güncellenir.
Dil seçimi uygulamadakiyle aynıdır: `derslik-locale` çerezi → tarayıcı dili → İngilizce.

## Görseller

| Klasör | Ne | Nasıl üretilir |
|---|---|---|
| `public/3d/` | CC0 HDRI ve dokular; kaynaklar `public/3d/LICENSES.md` | `pnpm assets:optimize <indirme-klasörü>` |
| `public/screens/<dil>/` | Uygulamanın gerçek ekranları (5 × 7 dil) | `pnpm capture:screens` |
| `public/poster/` | 3D sahnenin sabit görüntüleri (yer tutucu + WebGL'siz) | `pnpm build && pnpm serve`, sonra `pnpm capture:posters` |
| `public/og/` | Paylaşım görselleri (1200×630) | `pnpm build && pnpm serve`, sonra `pnpm capture:og` |

`capture:screens`, yandaki `../derslik` deposunun yerel test düzeneğini çalıştırır
(gerçek API + gömülü Postgres + sahte Supabase, 127.0.0.1:3100/3101), her dilde örnek veri
yükler (`scripts/demo-data.mjs`) ve ekranları çeker. Ana depoda dosya değiştirmez; önce orada
bir kez `pnpm api:build && pnpm web:build` gerekir. Çekim sırasında sayfadaki "Derslik"
yazıları "Tutorwise" ile değiştirilir.

## Performans ve yedekler

- Masaüstünde 3D tarayıcı boşa çıkınca yüklenir ve açılış oynar.
- Dokunmatik ya da zayıf cihazlarda önce sahnenin poster görüntüsü görünür; 3D ilk etkileşimde yüklenir ve aynı pozdan devam eder.
- Kaydırma tarayıcının kendi kaydırmasıdır (gecikme yok). Bağlantıyla uzak bir bölüme
  atlanınca 3D aradaki sahneleri oynatmaz, kısa bir geçişle yeni sahneye geçer.
- Açılış oturumda bir kez oynar; dil değiştirince tekrar etmez.
- Gölgelendiriciler ve dokular sahne görünmeden hazırlanır: cihazlar ilk kez
  göründüğünde kare donmaz.
- Tuval en fazla 1,5× piksel yoğunluğunda çizilir; kimse kaydırmıyorken yarı hızda.
- Kaydırırken kare hızı uzun süre düşük kalırsa çözünürlük ve efektler kendiliğinden düşer.
- Adresi henüz olmayan bağlantılar (`#`) tıklanınca sayfayı kımıldatmaz.
- `prefers-reduced-motion`: açılış yok; sahne her bölümde sabit poz.
- WebGL yoksa posterler gösterilir.

## Yayın

Cloudflare Workers (statik dosyalar), GitHub'a bağlı: `main`'e her gönderim yayına çıkar.

| Ayar | Değer |
|---|---|
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` (varsayılan) |

`wrangler.jsonc` wrangler'a `out/` klasörünü statik site olarak yayınlamasını söyler; bu dosya
olmazsa wrangler projeyi sunuculu Next.js sanıp OpenNext kurulumuna girişir ve derleme düşer.
`public/_headers` (güvenlik başlıkları, önbellek) Workers tarafından okunur.

Yerelde Cloudflare ortamında denemek için: `pnpm build`, sonra
`pnpm dlx --allow-build=workerd wrangler dev` ve `pnpm verify http://127.0.0.1:8787`.
