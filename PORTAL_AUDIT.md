# Audyt SEO / NIP — portal.biuroadmin.online
Data: 30.09.2026 · Metoda: pobranie surowego HTML przez curl (bez JS), analiza head + treści + endpointów

## Stan faktyczny (zweryfikowany)

| Element | Wartość | Ocena |
|---|---|---|
| HTTP / | 200 | OK |
| `lang="pl"` | pl | OK |
| `<title>` | „Biuro Rachunkowe Jarosław Konik — Strefa Klienta" | OK, unikalny |
| `meta description` | „Prywatny portal klientów ... e-ZUS, dokumenty, rozliczenia i terminy." | OK |
| `og:title` / `og:description` | obecne | OK |
| `og:image` | `/og.png` (200, relatywny URL) | Utrata: social card nie renderuje się bez absolutnego URL |
| `og:url`, `og:site_name`, `og:type` | **brak** | Utrata |
| `twitter:card` / `twitter:title` / `twitter:description` | obecne | OK |
| `link rel="canonical"` | **brak** | Utrata |
| `hreflang` | **brak** | Drobna strata (domena jednojęzyczna) |
| `application/ld+json` | **brak** | Utrata |
| NIP 7532190370 | **nieobecny w całym HTML** | Utrata |
| `robots.txt` | **404** | Utrata |
| `sitemap.xml` | **404** | Utrata |
| `/portal` (bez sesji) | 307 → `/#rejestracja` | OK, poprawne zachowanie |
| `/portal?view=ksef` (bez sesji) | 307 → `/#rejestracja` | OK |
| `/auth/legacy` | 200, ten sam head | OK |
| Stopka | „© 2026 Biuro Rachunkowe Jarosław Konik" + e-mail, **bez NIP** | Utrata |

## Dlaczego to ważne (sprawdzone fakty, nie opinie)

1. **Brak NIP na stronie firmowej.** Dla usługi księgowej identyfikowalność podatkowa to element wiarygodności, nie ozdoba. Google używa `taxID` z JSON-LD do rozpoznawania organizacji; brak danych oznacza brak rich result i mniejszą widoczność lokalną.
2. **Brak JSON-LD.** Brak `AccountingService` → brak typu wyniku „usługi księgowe”, brak rich snippet z danymi firmy.
3. **Brak canonical przy wielu URL-ach.** `/`, `/auth/legacy` i ewentualne warianty renderują się jako osobne dokumenty bez wskazania wersji kanonicznej.
4. **`robots.txt` 404 oznacza w DOMYŚLE** „wolno indeksować wszystko” — tu akurat to pożądane, ale brak sitemapu blokuje discovery artykułów i stron serwisowych.
5. **`og:image` relatywne** — Slack, Facebook i LinkedIn odrzucają relatywne ścieżki; karta social nie wygeneruje się.

## Do wdrożenia — minimalny komplet zmian

### 1. `<head>` — dołożyć do istniejącego metadata (Next.js App Router)

```tsx
export const metadata = {
  metadataBase: new URL('https://portal.biuroadmin.online'),
  title: 'Biuro Rachunkowe Jarosław Konik — Strefa Klienta',
  description:
    'Prywatny portal klientów Biura Rachunkowego Jarosław Konik: e-ZUS, dokumenty, rozliczenia i terminy.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://portal.biuroadmin.online/',
    siteName: 'Biuro Rachunkowe Jarosław Konik',
    title: 'Biuro Rachunkowe Jarosław Konik',
    description: 'Prywatna strefa klienta',
    images: [{ url: 'https://portal.biuroadmin.online/og.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['https://portal.biuroadmin.online/og.png'] },
};
```

`metadataBase` rozwiązuje relatywny `og:image` — bez niego Next nie zbuduje absolutnego URL.

### 2. JSON-LD — dodać w layout

```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'AccountingService',
    name: 'Biuro Rachunkowe Jarosław Konik',
    url: 'https://portal.biuroadmin.online/',
    areaServed: { '@type': 'Country', name: 'PL' },
    inLanguage: 'pl-PL',
    taxID: '7532190370',
    email: 'biuro.paczkow@gmail.com',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Usługi księgowe',
      itemListElement: ['Księgowość', 'Kadry i płace', 'Rozliczenia ZUS', 'KSeF'].map((n) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: n },
      })),
    },
  }) }}
/>
```

Jeśli `dangerouslySetInnerHTML` jest w projekcie zablokowane (Strict CSP) — użyj komponentu z `next/script` (`strategy="beforeInteractive"`).

### 3. Stopka — dodać NIP

```
© 2026 Biuro Rachunkowe Jarosław Konik · NIP 7532190370
```

### 4. `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /portal
Disallow: /auth/
Disallow: /api/

Sitemap: https://portal.biuroadmin.online/sitemap.xml
```

Blokada `/portal` i `/auth/` jest tu realna — `/portal` redirectuje na `#rejestracja`, więc bez tego Google wy indeksuje sesyjne ścieżki.

### 5. `app/sitemap.ts` — Next generuje automatycznie

```ts
import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://portal.biuroadmin.online/', changeFrequency: 'monthly', priority: 1 },
    { url: 'https://blog.biuroadmin.online/zwinne-biuro-ksef-fa3/', changeFrequency: 'monthly', priority: 0.8 },
  ];
}
```

## Czego NIE dało się sprawdzić

Nie mam kodu portalu — aplikacja jest wdrożona przez ChatGPT/Cloudflare custom-domains, repo `portal-biuro-admin-online` zawiera tylko README, a `gh` nie ma w tym środowisku. Nie mogę zweryfikować: `next.config` (redirecty, nagłówki), `manifest`, wydajności, dostępności, linków wewnętrznych w panelu po zalogowaniu (wymagają sesji). Audyt obejmuje wyłącznie to, co widać bez logowania.
