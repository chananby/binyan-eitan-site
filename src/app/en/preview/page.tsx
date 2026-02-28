"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EnPreview() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("preview_mode", "true");
    router.replace("/en");
  }, [router]);

  return null;
}
