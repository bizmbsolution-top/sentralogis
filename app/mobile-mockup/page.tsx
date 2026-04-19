"use client";

import { useState } from "react";
import { 
  Bell, 
  Search, 
  MapPin, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  User, 
  ScanLine, 
  Package, 
  Wrench, 
  Truck,
  ArrowRight,
  Menu
} from "lucide-react";

export default function ResponsiveMockupPage() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const categories = ["Dashboard", "Orders", "Tracking", "Warehouse", "Reports"];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 md:pb-0">
      
      {/* 🔹 Responsive Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 md:px-10 md:py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
               <Globe className="w-6 h-6 text-orange-500" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase md:text-xs">sentralogis</p>
                <h1 className="text-sm md:text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Atlas Web</h1>
             </div>
           </div>

           {/* Desktop Navigation Links */}
           <nav className="hidden lg:flex gap-2 ml-10">
             {categories.map((cat) => (
               <button 
                 key={cat}
                 onClick={() => setActiveTab(cat)}
                 className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                   activeTab === cat 
                   ? 'bg-orange-50 text-orange-600' 
                   : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                 }`}
               >
                 {cat}
               </button>
             ))}
           </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex relative group">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
             </div>
             <input type="text" placeholder="Search waybill..." className="bg-slate-100 border-transparent rounded-full pl-10 pr-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none w-64 transition-all" />
          </div>
          
          <button className="md:hidden w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Search className="w-5 h-5 text-slate-600" />
          </button>
          
          <button className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center relative hover:bg-white transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-600 rounded-full ring-2 ring-white"></span>
          </button>
          
          <div className="hidden md:block w-px h-6 bg-slate-200 mx-2"></div>
          
          <button className="hidden md:flex items-center gap-2 px-1 hover:opacity-80">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">S</div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">Santo</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">QC Lead</p>
            </div>
          </button>
        </div>
      </header>

      {/* 🔹 Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-6 md:px-10 md:py-8 lg:flex lg:gap-8">
        
        {/* Left Column (Hero & Stats) */}
        <div className="lg:w-2/3 space-y-8">
           
           <div className="md:hidden space-y-1">
             <p className="text-3xl font-medium text-slate-400">Welcome, <span className="font-bold text-slate-900">Santo!</span></p>
           </div>

           {/* Mobile Category Tabs (Hidden on Desktop) */}
           <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              {categories.map((cat) => (
                 <button 
                   key={cat}
                   onClick={() => setActiveTab(cat)}
                   className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                     activeTab === cat 
                     ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                     : 'bg-white border text-slate-600 border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   {cat}
                 </button>
              ))}
           </div>

           {/* 🔹 Hero Co-Pilot Card */}
           <div className="bg-[#0F172A] rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-white/10 pb-8 mb-8">
                 <div className="space-y-4 max-w-lg">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#FF4B1F] bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">AI Co-Pilot Aktif</span>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">Optimum Warehouse Efficiency</h2>
                    <p className="text-sm md:text-base font-medium text-slate-400">Your layout logic and packing zones are operating perfectly today. No bottlenecks detected.</p>
                 </div>
                 <button className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors w-fit shadow-lg shadow-orange-600/20 whitespace-nowrap">
                   Explore Analytics <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
           </div>

           {/* 🔹 Dashboard Stats Grid (Responsive 2 cols mobile, 4 desktop) */}
           <div>
              <div className="flex justify-between items-end mb-5">
                  <h3 className="text-xl font-bold text-slate-900">Operational Stats</h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Physical Check</p>
                       <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-orange-50 transition-colors"><ScanLine className="w-5 h-5 text-slate-400 group-hover:text-orange-500" /></div>
                    </div>
                    <div>
                       <h3 className="text-3xl lg:text-4xl font-black text-slate-900">3</h3>
                       <p className="text-xs font-medium text-slate-500 mt-1">Active Jobs</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Transit Area</p>
                       <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-orange-50 transition-colors"><Package className="w-5 h-5 text-slate-400 group-hover:text-orange-500" /></div>
                    </div>
                    <div>
                       <h3 className="text-3xl lg:text-4xl font-black text-slate-900">8</h3>
                       <p className="text-xs font-medium text-slate-500 mt-1">Ready Pallets</p>
                    </div>
                 </div>

                 <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 lg:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer ring-1 ring-inset ring-rose-500/20">
                    <div className="flex justify-between items-start mb-6">
                       <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Refurbish</p>
                       <div className="p-2 bg-rose-100 rounded-lg"><Wrench className="w-5 h-5 text-rose-600" /></div>
                    </div>
                    <div>
                       <h3 className="text-3xl lg:text-4xl font-black text-rose-600">1</h3>
                       <p className="text-xs font-bold text-rose-500 mt-1">Item HOLD</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Outbound</p>
                       <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-orange-50 transition-colors"><Truck className="w-5 h-5 text-slate-400 group-hover:text-orange-500" /></div>
                    </div>
                    <div>
                       <h3 className="text-3xl lg:text-4xl font-black text-slate-900">2</h3>
                       <p className="text-xs font-medium text-slate-500 mt-1">Containers Loading</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column (Pipeline ListView) */}
        <div className="lg:w-1/3 mt-8 lg:mt-0">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-900">Active Pipeline</h3>
               <button className="text-xs font-bold text-orange-600 uppercase tracking-wide hover:underline">View All</button>
            </div>

            <div className="space-y-4 flex-1">
              
              {/* Task Item */}
              <div className="group border border-slate-100 hover:border-orange-200 rounded-2xl p-4 transition-all hover:bg-orange-50/30 cursor-pointer shadow-sm">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-white">S</div>
                      <div>
                         <p className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">#SN-013925</p>
                         <p className="text-xs font-medium text-slate-500">CGK &rarr; BDO</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md uppercase tracking-wide group-hover:bg-white group-hover:border-orange-200">QC Ongoing</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full w-[45%] rounded-full"></div>
                   </div>
                   <span className="text-[11px] font-bold text-slate-600 w-8 text-right">45%</span>
                </div>
              </div>

               {/* Task Item (Hold) */}
               <div className="group border border-rose-100 bg-rose-50/30 rounded-2xl p-4 transition-all cursor-pointer shadow-sm">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-600 font-bold text-xs shadow-sm shadow-rose-100 border border-rose-100">B</div>
                      <div>
                         <p className="font-bold text-rose-900">#SN-013888</p>
                         <p className="text-xs font-medium text-rose-500">SUB &rarr; SUB</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md uppercase tracking-wide">Repack</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-full bg-rose-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[10%] rounded-full"></div>
                   </div>
                   <span className="text-[11px] font-bold text-rose-600 w-8 text-right">HOLD</span>
                </div>
              </div>

               {/* Task Item */}
               <div className="group border border-slate-100 hover:border-orange-200 rounded-2xl p-4 transition-all hover:bg-orange-50/30 cursor-pointer shadow-sm">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-white">M</div>
                      <div>
                         <p className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">#SN-014002</p>
                         <p className="text-xs font-medium text-slate-500">JKT &rarr; MES</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md uppercase tracking-wide">Loading</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[85%] rounded-full"></div>
                   </div>
                   <span className="text-[11px] font-bold text-slate-600 w-8 text-right">85%</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>

      {/* 🔹 Mobile Bottom Navigation (Hidden on Desktop) */}
      <div className="md:hidden fixed bottom-0 w-full left-0 bg-white border-t border-slate-100 px-4 py-3 rounded-t-[2rem] shadow-[0_-15px_40px_rgba(0,0,0,0.06)] z-20 pb-safe">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center gap-1 p-2 text-orange-600">
            <ScanLine className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900">
            <Package className="w-6 h-6" />
            <span className="text-[10px] font-bold">Inventory</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900">
            <Clock className="w-6 h-6" />
            <span className="text-[10px] font-bold">History</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-900">
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
