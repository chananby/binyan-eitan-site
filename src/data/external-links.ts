export interface ExternalLinkItem {
  label: string;
  url: string;
  description?: string;
}

export interface ExternalLinkGroup {
  category: string;
  items: ExternalLinkItem[];
}

export const externalLinks: ExternalLinkGroup[] = [
  {
    category: "ניהול האתר",
    items: [
      {
        label: "Vercel",
        url: "https://vercel.com/dashboard",
        description: "Deployments · env vars · domains",
      },
      {
        label: "GitHub",
        url: "https://github.com/chananby/binyan-eitan-site",
        description: "Source code · branches · PRs",
      },
      {
        label: "Sentry",
        url: "https://sentry.io",
        description: "Error monitoring · alerts",
      },
    ],
  },
  {
    category: "Analytics",
    items: [
      {
        label: "Google Analytics",
        url: "https://analytics.google.com",
        description: "GA4 — G-1CWQG6YY4H",
      },
      {
        label: "Microsoft Clarity",
        url: "https://clarity.microsoft.com/projects/view/w40c828o9d",
        description: "Session recordings · heatmaps",
      },
      {
        label: "Plausible",
        url: "https://plausible.io/binyaneitan.com",
        description: "Privacy-first page analytics",
      },
    ],
  },
  {
    category: "תקשורת",
    items: [
      {
        label: "Resend",
        url: "https://resend.com/emails",
        description: "Transactional email — contact form",
      },
      {
        label: "WhatsApp Business",
        url: "https://business.facebook.com",
        description: "WhatsApp Business account",
      },
      {
        label: "Formspree",
        url: "https://formspree.io",
        description: "Backup contact form fallback",
      },
    ],
  },
  {
    category: "נתונים ואחסון",
    items: [
      {
        label: "Supabase",
        url: "https://supabase.com/dashboard",
        description: "Database · auth · RLS policies",
      },
      {
        label: "Cloudinary",
        url: "https://cloudinary.com/console",
        description: "Portfolio & gallery images",
      },
      {
        label: "Vercel Blob",
        url: "https://vercel.com/storage",
        description: "File uploads · attachments",
      },
    ],
  },
];
