import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default function RootPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value !== undefined) qs.set(key, value);
  }
  const query = qs.toString();

  // Detect browser language from Accept-Language header.
  // Primary language tag (before comma or semicolon) determines the redirect.
  // Hebrew (he*) → /he; everything else → /en (handles en-US, en-GB, fr, ru, etc.)
  const acceptLang = headers().get('accept-language') ?? '';
  const primary = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase();
  const lang = primary.startsWith('he') ? 'he' : 'en';

  redirect(`/${lang}${query ? `?${query}` : ''}`);
}
