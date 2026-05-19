import type { Metadata } from 'next';
import VoucherGenerator from '../../components/VoucherGenerator';

export const metadata: Metadata = {
  title: 'מחולל שוברי מתנה',
  robots: 'noindex,nofollow',
};

export default function VoucherPage() {
  return <VoucherGenerator />;
}
