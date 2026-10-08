<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tutorwise landing: çalışma kuralları

- Marka **Tutorwise** (`tutorwise.academy`). "Derslik" yalnız ana uygulama deposunun adıdır; sitede geçmez (`tests/content.test.ts` denetler).
- Metinler `content/<dil>.ts`'te; Türkçe kaynak, 7 dil aynı anahtarları taşır. Ürün terimleri ana uygulamanın kataloglarıyla aynıdır.
- Statik çıktı: `cookies()`, `headers`/`redirects` ayarı, route handler ve varsayılan `next/image` kullanılmaz. Güvenlik başlıkları `public/_headers`'ta.
- Göndermeden önce hepsi geçer: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, ve `pnpm serve` açıkken `pnpm verify`.
- 3D hesapları (`three/choreography.ts`) saf fonksiyondur ve testlidir; poz değişince testler ve ekran görüntüleriyle doğrulanır.
- Dış 3D varlık yalnız CC0 ya da ticari kullanıma açık lisansla, `public/3d/LICENSES.md`'ye kaydedilerek eklenir.
