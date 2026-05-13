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
        label: "Vercel — Project",
        url: "https://vercel.com/chananbys-projects/binyan-eitan-site",
        description: "פריסות, לוגים, ביצועים — חשבון: chanan",
      },
      {
        label: "Vercel — Env Vars",
        url: "https://vercel.com/chananbys-projects/binyan-eitan-site/settings/environment-variables",
        description: "AUTH_TOKEN_SECRET · RESEND_API_KEY · EMAIL_FROM · SUPABASE_* וכו'",
      },
      {
        label: "Vercel — Domains",
        url: "https://vercel.com/chananbys-projects/binyan-eitan-site/settings/domains",
        description: "binyaneitan.com · DNS · SSL",
      },
      {
        label: "GitHub Repo",
        url: "https://github.com/chananby/binyan-eitan-site",
        description: "קוד מקור · קומיטים · PRs — חשבון: @chananby",
      },
      {
        label: "Sentry",
        url: "https://sentry.io/organizations/40fe707b9df3/projects/binyaneitan/",
        description: "ניטור שגיאות · התראות",
      },
    ],
  },
  {
    category: "נתונים ואחסון",
    items: [
      {
        label: "Supabase — Project",
        url: "https://supabase.com/dashboard/project/fwyskrdkqwtkpcxprsdk",
        description: "DB · auth · storage. project ref: fwyskrdkqwtkpcxprsdk",
      },
      {
        label: "Supabase — SQL Editor",
        url: "https://supabase.com/dashboard/project/fwyskrdkqwtkpcxprsdk/sql/new",
        description: "להריץ migrations ושאילתות ידניות",
      },
      {
        label: "Supabase — Table Editor",
        url: "https://supabase.com/dashboard/project/fwyskrdkqwtkpcxprsdk/editor",
        description: "תצוגת טבלאות · עריכה ידנית של רשומות",
      },
      {
        label: "Supabase — API Keys",
        url: "https://supabase.com/dashboard/project/fwyskrdkqwtkpcxprsdk/settings/api",
        description: "anon key, service_role key, project URL",
      },
      {
        label: "Cloudinary",
        url: "https://cloudinary.com/console",
        description: "תמונות + Optimized delivery (CDN של תמונות הפורטפוליו)",
      },
      {
        label: "Vercel Blob",
        url: "https://vercel.com/chananbys-projects/binyan-eitan-site/stores",
        description: "אחסון קבצים גדולים · חתימות, צילומי אתר",
      },
    ],
  },
  {
    category: "תקשורת",
    items: [
      {
        label: "Resend — Overview",
        url: "https://resend.com/overview",
        description: "מיילים טרנזקציוניים (forgot-password, אישורים)",
      },
      {
        label: "Resend — Domains",
        url: "https://resend.com/domains",
        description: "סטטוס binyaneitan.com — SPF/DKIM/DMARC. EMAIL_FROM=noreply@binyaneitan.com",
      },
      {
        label: "Resend — API Keys",
        url: "https://resend.com/api-keys",
        description: "RESEND_API_KEY בענן",
      },
      {
        label: "Formspree",
        url: "https://formspree.io",
        description: "טופס גיבוי — Formspree (ChangeOrderForm)",
      },
      {
        label: "WhatsApp Business",
        url: "https://business.whatsapp.com",
        description: "ניהול הודעות עסקיות + תזכורות לעובדים",
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
        description: "הקלטות סשן · מפות חום — project w40c828o9d",
      },
    ],
  },
  {
    category: "עוזרי AI",
    items: [
      {
        label: "Anthropic Console",
        url: "https://console.anthropic.com/",
        description: "מפתחות API · שימוש · חיוב — לפיתוח AI features",
      },
      {
        label: "Claude.ai",
        url: "https://claude.ai",
        description: "סביבת שיחה — שיחות שמורות + פרויקטים",
      },
    ],
  },
];
