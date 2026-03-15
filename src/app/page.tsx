import { redirect } from 'next/navigation';
import { isAppSetup } from '@/lib/db/staff';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const setup = await isAppSetup();

  if (!setup) {
    redirect('/setup');
  } else {
    redirect('/login');
  }
}
