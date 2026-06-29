import type { Metadata } from "next";

// /he/internal is the worker portal entry. It used to wrap a shared-PIN
// gate (PinGate) around every child route, but the gate was friction the
// crew didn't want — phone-based identify on /api/worker/identify is
// the only auth from now on. The layout stays around because the
// metadata block must live on a server component.

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function InternalLayoutHe({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
