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
        description: "פריסות · משתני סביבה · דומיין",
      },
      {
        label: "GitHub",
        url: "https://github.com/chananby/binyan-eitan-site",
        description: "קוד מקור · ענפים · בקשות משיכה",
      },
      {
        label: "Sentry",
        url: "https://sentry.io/organizations/40fe707b9df3/projects/binyaneitan/",
        description: "ניטור שגיאות · התראות",
      },
      {
        label: "Anthropic Console",
        url: "https://console.anthropic.com/",
        description: "מפתחות API · שימוש · חיוב",
      },
      {
        label: "Cowork",
        url: "https://cowork.anthropic.com/",
        description: "סביבת עבודה — Claude Code",
      },
    ],
  },
  {
    category: "אנליטיקה",
    items: [
      {
        label: "Google Analytics",
        url: "https://analytics.google.com",
        description: "GA4 — G-1CWQG6YY4H",
      },
      {
        label: "Microsoft Clarity",
        url: "https://clarity.microsoft.com/projects/view/w40c828o9d",
        description: "הקלטות סשן · מפות חום — w40c828o9d",
      },

    ],
  },
  {
    category: "תקשורת",
    items: [
      {
        label: "Resend",
        url: "https://resend.com/overview",
        description: "מיילים טרנזקציוניים — טופס צור קשר",
      },
      {
        label: "WhatsApp Business",
        url: "https://business.facebook.com",
        description: "# TODO — replace with direct WA Business account URL",
      },
      {
        label: "Formspree",
        url: "https://formspree.io",
        description: "טופס גיבוי — Formspree",
      },
    ],
  },
  {
    category: "נתונים ואחסון",
    items: [
      {
        label: "Supabase",
        url: "https://supabase.com/dashboard",
        description: "מסד נתונים · אימות · מדיניות RLS",
      },
      {
        label: "Cloudinary",
        url: "https://cloudinary.com/console",
        description: "# TODO — replace with https://cloudinary.com/console/[cloud-name]",
      },
      {
        label: "Vercel Blob",
        url: "https://vercel.com/storage",
        description: "העלאת קבצים · קבצים מצורפים",
      },
    ],
  },
];
