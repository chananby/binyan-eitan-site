// Admin segment layout — intentionally minimal.
// Overrides the parent he/layout.tsx to prevent the public FloatingWhatsApp
// widget and JSON-LD schema from rendering inside the admin area.
// The 'force-dynamic' directive on each page handles SSR; this layout
// simply provides a clean HTML wrapper.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div dir="rtl">{children}</div>;
}
