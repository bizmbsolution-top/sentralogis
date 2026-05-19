$path = "components\sbu\FleetTrackingConsole.tsx"
$content = [IO.File]::ReadAllText($path)

$oldPart = @"
                     </div>
                  </div>
                  <Navigation size={64} className="text-slate-100 animate-pulse" />
               </div>
               <h2 class="text-3xl font-black text-slate-300 uppercase tracking-tighter">Select a Unit to Track</h2>
"@

# I need to match the actual file content which might have different quotes/spacing
$regex = [regex]::Escape('                     </div>
                  </div>
                  <Navigation size={64} className="text-slate-100 animate-pulse" />
               </div>
               <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Select a Unit to Track</h2>')

$newPart = @"
                     </div>
                  </div>
                ))
              )}
           </div>
           
           <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                 <span>Sync Status</span>
                 <div className="flex items-center gap-1.5">
                    <RefreshCcw size={10} className="animate-spin-slow" />
                    <span>Last Update: {mounted ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Content: Map and Route Details */}
        <div className="flex-1 flex flex-col relative bg-slate-50">
           {!selectedJo ? (
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8">
                   <Navigation size={64} className="text-slate-100 animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Select a Unit to Track</h2>
"@

$content = $content -replace $regex, $newPart
[IO.File]::WriteAllText($path, $content)
