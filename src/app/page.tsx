import { redirect } from 'next/navigation';

export default function RootPage() {
  // הפנייה אוטומטית לעברית כברירת מחדל
  redirect('/he');
}
