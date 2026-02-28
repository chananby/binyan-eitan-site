"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HePreview() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("preview_mode", "true");
    router.replace("/he");
  }, [router]);

  return null;
}
