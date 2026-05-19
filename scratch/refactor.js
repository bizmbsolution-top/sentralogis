const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/hq/finance/cost-audit/page.tsx', 'utf8');

// Replace selectedJoId with selectedWoId
code = code.replace(/selectedJoId/g, 'selectedWoId');
code = code.replace(/setSelectedJoId/g, 'setSelectedWoId');
code = code.replace(/selectedJo/g, 'selectedWo');

// Change grouping logic
const newGroupLogic = `
  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {};
    data.forEach(item => {
      const wo = item.job_orders?.wo_item?.wo;
      if (!wo) return;
      const woId = wo.id;
      
      if (!groups[woId]) {
        groups[woId] = { 
          wo: wo, 
          costs: [], 
          wo_id: woId,
          jo_map: {}
        };
      }
      
      groups[woId].costs.push(item);
      
      if (!groups[woId].jo_map[item.jo_id]) {
        groups[woId].jo_map[item.jo_id] = { jo: item.job_orders, costs: [] };
      }
      groups[woId].jo_map[item.jo_id].costs.push(item);
    });

    return Object.values(groups)
      .map((group: any) => {
        let totalRevenue = 0;
        let totalCogs = 0;
        let totalApprovedSurcharges = 0;
        let totalDriverShareAmount = 0;
        let totalApprovedExtraCosts = 0;
        
        const joList = Object.values(group.jo_map) as any[];
        
        joList.forEach((joGroup: any) => {
          const basePrice = Number(joGroup.jo?.base_price || 0);
          const dealPrice = Number(joGroup.jo?.wo_item?.item_data?.deal_price || 0);
          const effectiveRevenue = basePrice > 0 ? basePrice : dealPrice;
          
          const approvedSurcharges = joGroup.costs.reduce((sum: number, c: any) => sum + (c.status === 'approved' && c.charge_type === 'surcharge' ? Number(c.amount) : 0), 0);
          const joRevenue = effectiveRevenue + approvedSurcharges;
          
          const driverSharePct = Number(joGroup.jo?.driver_share_percentage || 40);
          const driverShareAmount = effectiveRevenue * (driverSharePct / 100);
          
          const approvedExtraCosts = joGroup.costs.reduce((sum: number, c: any) => sum + ((c.status === 'approved' || c.status === 'rejected_as_cogs') && (c.paid_by_sbu || c.charge_type === 'reimbursement') ? Number(c.amount) : 0), 0);
          const joCogs = driverShareAmount + approvedExtraCosts;
          
          totalRevenue += joRevenue;
          totalCogs += joCogs;
          totalApprovedSurcharges += approvedSurcharges;
          totalDriverShareAmount += driverShareAmount;
          totalApprovedExtraCosts += approvedExtraCosts;
          
          joGroup.margin = { revenue: joRevenue, cogs: joCogs, driverShareAmount, approvedExtraCosts, driverSharePct };
        });

        const grossMargin = totalRevenue - totalCogs;
        const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
        
        group.jo_list = joList;

        return {
          ...group,
          margin: { 
            revenue: totalRevenue, cogs: totalCogs, absolute: grossMargin, percent: marginPercent,
            driverShareAmount: totalDriverShareAmount, approvedExtraCosts: totalApprovedExtraCosts
          }
        };
      })
      .filter((group: any) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || group.wo?.wo_number?.toLowerCase().includes(term) || group.wo?.customer?.name?.toLowerCase().includes(term);
        
        let matchesStatus = false;
        if (statusFilter === 'all') matchesStatus = true;
        else if (statusFilter === 'new_request') matchesStatus = group.costs.some((c: any) => c.status === 'need_approval');
        else if (statusFilter === 'audit_done') matchesStatus = group.costs.every((c: any) => c.status !== 'need_approval');

        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        const aNeeds = a.costs.some((c: any) => c.status === 'need_approval');
        const bNeeds = b.costs.some((c: any) => c.status === 'need_approval');
        if (aNeeds && !bNeeds) return -1;
        if (!aNeeds && bNeeds) return 1;
        return 0;
      });
  }, [data, searchTerm, statusFilter]);
`;

code = code.replace(/const groupedData = useMemo\(\(\) => \{[\s\S]*?\}, \[data, searchTerm, statusFilter\]\);/, newGroupLogic.trim());

code = code.replace(/g\.jo_id === selectedWoId/g, 'g.wo_id === selectedWoId');

code = code.replace(/selectedWo\.jo\?\.jo_number/g, 'selectedWo.wo?.wo_number');
code = code.replace(/selectedWo\.jo\?\.wo_item\?\.wo\?\.customer\?\.name/g, 'selectedWo.wo?.customer?.name');
code = code.replace(/selectedWo\.jo\?\.wo_item\?\.wo\?\.customer\?\.phone/g, 'selectedWo.wo?.customer?.phone');
code = code.replace(/selectedWo\.jo\?\.wo_item\?\.wo\?\.customer\?\.billing_method/g, 'selectedWo.wo?.customer?.billing_method');

// Replace map list logic
code = code.replace(/group\.jo_id/g, 'group.wo_id');
code = code.replace(/group\.jo\?\.jo_number/g, 'group.wo?.wo_number');
code = code.replace(/group\.jo\?\.wo_item\?\.wo\?\.customer\?\.name/g, 'group.wo?.customer?.name');
code = code.replace(/group\.jo\?\.wo_item\?\.item_data\?\.origin_name/g, 'group.jo_list[0]?.jo?.wo_item?.item_data?.origin_name');
code = code.replace(/group\.jo\?\.wo_item\?\.item_data\?\.destination_name/g, 'group.jo_list[0]?.jo?.wo_item?.item_data?.destination_name');
code = code.replace(/group\.jo\?\.wo_item\?\.wo\?\.wo_number/g, '(group.jo_list.length + " Missions")');
code = code.replace(/group\.jo\?\.created_at/g, 'group.costs[0]?.created_at');

// Finalize audit button
code = code.replace(/await supabase\.from\('job_orders'\)\.update\(\{ status: 'ready_for_billing' \}\)\.eq\('id', selectedWoId\);/, "await Promise.all(selectedWo.jo_list.map((jo: any) => supabase.from('job_orders').update({ status: 'ready_for_billing' }).eq('id', jo.jo.id)));");

// Also Driver, Bagi Hasil Driver and Billing Method cards in Detail View need to loop over jo_list or just show N/A
// I will just replace the grid grid-cols-1 md:grid-cols-3 with a map over jo_list
const oldCards = /<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-indigo-50\/30">[\s\S]*?<\/div>\s*<\/div>/;
const newCards = `
                    <div className="pt-8 border-t border-indigo-50/30 space-y-4">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic mb-4">Job Order Missions</p>
                       {selectedWo.jo_list.map((joGroup: any) => (
                         <div key={joGroup.jo.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-indigo-50/30 p-4 rounded-3xl border border-indigo-50">
                           <div className="col-span-1">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-1">{joGroup.jo.jo_number}</p>
                             <p className="font-black text-indigo-950 uppercase italic text-xs">{joGroup.jo.md_drivers?.name || 'No Driver'}</p>
                           </div>
                           <div className="col-span-1">
                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Bagi Hasil ({joGroup.margin.driverSharePct}%)</p>
                             <p className="font-black text-emerald-700 italic text-xs">{formatRupiah(joGroup.margin.driverShareAmount)}</p>
                           </div>
                           <div className="col-span-2">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Fleet</p>
                             <p className="font-black text-indigo-800 uppercase italic text-xs">{joGroup.jo.md_fleets?.plate_number || 'N/A'} — {joGroup.jo.md_fleets?.fleet_type?.type_name || 'N/A'}</p>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
`;
code = code.replace(oldCards, newCards);

fs.writeFileSync('app/(dashboard)/hq/finance/cost-audit/page.tsx', code);
console.log('Done refactoring');
