import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biuro Rachunkowe Jarosław Konik — Strefa Klienta",
  description: "Prototyp portalu Biura Rachunkowego Jarosław Konik: KSeF, e-ZUS, dokumenty i kontakt z biurem.",
  openGraph: { title: "Biuro Rachunkowe Jarosław Konik", description: "Portal klienta — wersja demonstracyjna", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Biuro Rachunkowe Jarosław Konik", description: "Portal klienta — wersja demonstracyjna", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
