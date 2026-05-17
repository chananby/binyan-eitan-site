"use client";

import { useSearchParams } from "next/navigation";

export default function ErrorTrigger() {
  const searchParams = useSearchParams();
  if (searchParams.get("test-error") === "1") {
    throw new Error("Intentional test error from ErrorTrigger");
  }
  return null;
}
