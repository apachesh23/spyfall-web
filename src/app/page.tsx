// /app/page.tsx - Landing Page
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/create');
}