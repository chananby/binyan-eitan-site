// Admin segment layout — intentionally minimal.
// Lives at /admin (outside any locale folder) to avoid all locale-prefix
// middleware complications. The he/layout.tsx FloatingWhatsApp and JSON-LD
// do not apply here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div dir="rtl">{children}</div>;
}
