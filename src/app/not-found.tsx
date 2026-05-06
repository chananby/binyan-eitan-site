"use client";

import { usePathname } from "next/navigation";
import { LangProvider } from "./components/LangContext";
import NotFoundClient from "./components/ClientLayouts/NotFoundClient";

export default function RootNotFound() {
  const pathname = usePathname();
  const lang = pathname?.startsWith("/en") ? "en" : "he";
  const dir  = lang === "he" ? "rtl" : "ltr";
  return (
    <LangProvider lang={lang} dir={dir}>
      <NotFoundClient />
    </LangProvider>
  );
}
