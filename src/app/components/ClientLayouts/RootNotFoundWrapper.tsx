"use client";

import { usePathname } from "next/navigation";
import { LangProvider } from "../LangContext";
import NotFoundClient from "./NotFoundClient";

export default function RootNotFoundWrapper() {
  const pathname = usePathname();
  const lang = pathname?.startsWith("/en") ? "en" : "he";
  const dir  = lang === "he" ? "rtl" : "ltr";
  return (
    <LangProvider lang={lang} dir={dir}>
      <NotFoundClient />
    </LangProvider>
  );
}
