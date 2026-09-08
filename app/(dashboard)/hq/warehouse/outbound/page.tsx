import { redirect } from 'next/navigation';

// [AI] Outbound monitoring merged into unified Operations Monitor
export default function HQWarehouseOutboundRedirect() {
  redirect('/hq/warehouse/operations');
}
