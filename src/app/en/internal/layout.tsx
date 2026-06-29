import type { Metadata } from "next";

// See he/internal/layout.tsx for the rationale — PinGate is gone; phone
// identify is the only auth from here on.

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function InternalLayoutEn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
