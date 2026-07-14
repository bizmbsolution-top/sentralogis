import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Commercial Contracts | Sentralogis',
};

export default async function ContractsPage() {
  redirect('/hq/warehouse/billing');
}
