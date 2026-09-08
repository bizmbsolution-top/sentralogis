import { redirect } from 'next/navigation';

// [AI] Inbound monitoring merged into unified Operations Monitor
export default function HQWarehouseInboundRedirect() {
  redirect('/hq/warehouse/operations');
}
