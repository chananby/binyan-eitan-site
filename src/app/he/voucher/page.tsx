import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const VoucherGenerator = dynamic(
  () => import('../../components/VoucherGenerator'),
  { ssr: false },
);

export const metadata: Metadata = {
  title: 'מחולל שוברי מתנה',
  robots: 'noindex,nofollow',
};

export default function VoucherPage() {
  return <VoucherGenerator />;
}
