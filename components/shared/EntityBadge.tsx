export default function EntityBadge({ jo }: { jo: any }) {
  const isVendor = jo?.md_fleets?.md_entities?.is_vendor;
  const pct = jo?.driver_share_percentage;
  const vendorName = jo?.md_fleets?.md_entities?.legal_name || jo?.md_fleets?.md_entities?.name || 'Vendor';

  if (isVendor) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 bg-orange-50 border border-orange-200">
        VENDOR: {vendorName}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 bg-blue-50 border border-blue-200">
      Internal {pct ? `${pct}%` : ''}
    </span>
  );
}
