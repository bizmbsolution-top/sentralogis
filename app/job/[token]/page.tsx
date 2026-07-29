import { redirect } from 'next/navigation';

export default function JobRedirect({ params }: { params: Promise<{ token: string }> }) {
  return (
    <TokenExtractor params={params} />
  );
}

async function TokenExtractor({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/jo/${token}`);
}
