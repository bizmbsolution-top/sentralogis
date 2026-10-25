import { redirect } from 'next/navigation';

export default function AccountsPayablePage() {
  redirect('/reporting/finance/ap-aging');
}
