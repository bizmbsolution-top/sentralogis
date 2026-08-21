import { redirect } from 'next/navigation';

export default async function JobRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/jo/${token}`);
}
