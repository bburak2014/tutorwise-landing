import { Bricolage_Grotesque, Montserrat, Onest } from "next/font/google";

// Uygulamadaki yazı tipleri (derslik: apps/web/app/layout.tsx). Derlemede
// indirilip kendi sunucumuzdan verilir; latin-ext Türkçe harfleri taşır.
const onest = Onest({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-onest",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["opsz"],
  variable: "--font-bricolage",
});

// Logodaki yazı (Tutorwise Academy): yalnız iki ağırlık, yalnız logo için.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

export const fontVariables = `${onest.variable} ${bricolage.variable} ${montserrat.variable}`;
