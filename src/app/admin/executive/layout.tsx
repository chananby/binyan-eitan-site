import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "War Room | Binyan Eitan",
  description: "Executive Partner Dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "War Room",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#141210",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
