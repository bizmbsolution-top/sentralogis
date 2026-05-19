
$path = "components\sbu\FleetTrackingConsole.tsx"
$content = Get-Content $path -Raw

# 1. Update Mapping Logic
$oldMapping = 'const processed = jos\.map\(jo => \{[\s\S]+?\}\);'
$newMapping = 'const processed = jos.map(jo => {
          const joRoutes = (routesRes.data || []).filter(r => r.job_order_id === jo.id).sort((a, b) => a.sequence - b.sequence);
          const joTracking = (trackingRes.data || []).filter(t => t.job_order_id === jo.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          const fleetData: any = fleetsRes.data?.find(f => f.id === jo.fleet_id);

          return {
            ...jo,
            drivers: driversRes.data?.find(d => d.id === jo.driver_id),
            fleets: fleetData,
            transporter_name: fleetData?.transporters?.name || "Sentralogis (Internal)",
            fleet_icon: fleetData?.md_fleet_types?.icon_url,
            routes: joRoutes,
            tracking_history: joTracking,
            latest_log: joTracking[joTracking.length - 1],
            wo_number: jo.wo_items?.work_orders?.wo_number || "N/A",
            route_info: jo.wo_items?.work_orders 
              ? (jo.wo_items.work_orders.origin_address + " ➔ " + jo.wo_items.work_orders.destination_address)
              : "No Route Info",
            truck_type_req: jo.wo_items?.md_truck_types?.name || "Standard Truck"
          };
        });'

$content = [regex]::Replace($content, $oldMapping, $newMapping)

# 2. Update groupedJos memo
$oldMemo = 'const filteredJos = useMemo\(\(\) => \{[\s\S]+?\}, \[jobOrders, searchQuery\]\);'
$newMemo = 'const filteredJos = useMemo(() => {
    return jobOrders.filter(jo => 
      jo.jo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.fleets?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.drivers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jo.wo_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobOrders, searchQuery]);

  const groupedJos = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredJos.forEach(jo => {
      const key = jo.wo_number || "Unassigned WO";
      if (!groups[key]) groups[key] = [];
      groups[key].push(jo);
    });
    return groups;
  }, [filteredJos]);'

$content = [regex]::Replace($content, $oldMemo, $newMemo)

# 3. Update UI part (The most fragile part)
# Replace the filteredJos.map with groupedJos loop
$oldUI = 'filteredJos\.map\(jo => \{[\s\S]+?\}\)'
$newUI = 'Object.entries(groupedJos).map(([woNum, jos]) => (
                <div key={woNum} className="mb-6 last:mb-0">
                    <div className="px-6 py-4 bg-slate-50 border-y border-slate-100 flex flex-col gap-1.5 mb-4 shadow-sm">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{woNum}</span>
                          <span className="text-[8px] font-black bg-white border border-slate-200 text-slate-400 px-2 py-0.5 rounded-md">{jos.length} UNITS</span>
                       </div>
                       <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight line-clamp-2">
                          {jos[0].route_info}
                       </h3>
                       <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{jos[0].truck_type_req}</span>
                       </div>
                    </div>
                    <div className="px-4 space-y-3">
                       {jos.map(jo => {
                          const isSelected = selectedJoId === jo.id;
                          const isExpanded = hoveredJoId === jo.id;
                          return (
                            <div 
                              key={jo.id} 
                              className="space-y-1"
                              onMouseEnter={() => setHoveredJoId(jo.id)}
                              onMouseLeave={() => setHoveredJoId(null)}
                            >
                              <button 
                                onClick={() => setSelectedJoId(jo.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-500 flex items-center gap-4 group relative cursor-pointer ${
                                  isSelected 
                                    ? "bg-blue-600 border-blue-600 shadow-2xl shadow-blue-600/40 text-white z-20 scale-[1.02]" 
                                    : "bg-white border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-1 z-10 hover:z-30"
                                } active:scale-95`}
                              >
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${
                                   isSelected ? "bg-white/20" : "bg-slate-900 text-white"
                                 }`}>
                                    {jo.fleet_icon ? (
                                      <img src={jo.fleet_icon} alt="Truck" className="w-8 h-8 object-contain" />
                                    ) : (
                                      <Truck size={24} />
                                    )}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
                                      isSelected ? "text-blue-100" : "text-slate-400"
                                    }`}>
                                       {jo.jo_number}
                                    </p>
                                    <h4 className="text-sm font-black uppercase tracking-tighter truncate">{jo.fleets?.plate_number}</h4>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      <p className={`text-[10px] font-bold truncate opacity-70 ${
                                        isSelected ? "text-white" : "text-slate-500"
                                      }`}>
                                         {jo.drivers?.name || "No Driver"}
                                      </p>
                                      <p className={`text-[8px] font-black uppercase tracking-tight opacity-50 ${
                                        isSelected ? "text-blue-100" : "text-slate-400"
                                      }`}>
                                         {jo.transporter_name}
                                      </p>
                                    </div>
                                 </div>
                                 <ChevronRight size={16} className={`transition-transform duration-300 ${isSelected ? "rotate-90 opacity-100" : "opacity-20"}`} />
                              </button>
                              <div 
                                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                                  isExpanded ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="mx-2 p-4 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 shadow-lg space-y-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity size={12} className="text-blue-500" />
                                        Driver Milestones
                                      </h4>
                                      <span className="text-[8px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {jo.tracking_history?.length || 0} Logs
                                      </span>
                                    </div>
                                    <div className="relative pl-5 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                      <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-blue-300 via-slate-200 to-slate-100 rounded-full" />
                                      {jo.tracking_history && jo.tracking_history.length > 0 ? (
                                        [...jo.tracking_history].reverse().map((log: any, lIdx: number) => {
                                          const isLatest = lIdx === 0;
                                          const logTime = new Date(log.created_at);
                                          const timeStr = logTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                                          const dateStr = logTime.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                                          return (
                                            <button 
                                              key={log.id} 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (log.latitude && log.longitude) {
                                                  setFocusedLocation({
                                                    lat: Number(log.latitude),
                                                    lng: Number(log.longitude),
                                                    title: log.status_update || "Update Posisi"
                                                  });
                                                }
                                              }}
                                              className="relative group/milestone w-full text-left p-3 -ml-1 rounded-xl transition-all duration-300 cursor-pointer bg-white/50 hover:bg-blue-50/80 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                              <div className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all duration-300 ${
                                                isLatest ? "bg-blue-500 ring-4 ring-blue-200 animate-pulse" : "bg-slate-300 group-hover/milestone:bg-blue-400 group-hover/milestone:ring-2 group-hover/milestone:ring-blue-100"
                                              }`} />
                                              <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                  <span className={`text-[10px] font-black uppercase tracking-wide transition-colors ${isLatest ? "text-blue-600" : "text-slate-600 group-hover/milestone:text-blue-600"}`}>
                                                    {log.status_update || "Update Posisi"}
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[8px] font-mono text-slate-400 group-hover/milestone:text-blue-500 transition-colors">{timeStr}</span>
                                                    <span className="text-[7px] font-black text-slate-300 uppercase">{dateStr}</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <MapPin size={9} className="text-slate-300 group-hover/milestone:text-blue-400 transition-colors" />
                                                  <p className="text-[8px] font-mono text-slate-400 group-hover/milestone:text-slate-600 transition-colors tracking-tight">
                                                    {log.latitude ? Number(log.latitude).toFixed(6) : "0.000000"}, {log.longitude ? Number(log.longitude).toFixed(6) : "0.000000"}
                                                  </p>
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <div className="py-8 text-center">
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">No milestones recorded</p>
                                        </div>
                                      )}
                                    </div>
                                </div>
                              </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
               ))'

$content = [regex]::Replace($content, $oldUI, $newUI)

Set-Content $path $content
