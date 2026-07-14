const fs = require('fs');

const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// The layout part is roughly:
/*
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Vertical Progress * /
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 sticky top-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Progress</h3>
            <div className="relative">
              {/* Vertical Line * /
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
              
              <div className="space-y-8 relative">
                {steps.map((s, i) => {
                  const isActive = step === s.id;
                  const isCompleted = step > s.id;
                  
                  return (
                    <div key={s.id} className="flex items-start gap-4">
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm \${
                        isActive ? 'bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-50' 
                        : isCompleted ? 'bg-emerald-500 text-white' 
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : s.id}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-bold transition-colors \${isActive ? 'text-indigo-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                          {s.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Main Form * /
        <div className="lg:col-span-3">
*/

const oldLayoutStart = `      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Vertical Progress */}
        <div className="lg:col-span-1 space-y-6">`;
const oldLayoutMiddle = `        {/* Right Content: Main Form */}
        <div className="lg:col-span-3">`;

const newTopProgress = `      <div className="mb-8 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="flex flex-col sm:flex-row justify-between relative">
          {/* Horizontal Line Background */}
          <div className="hidden sm:block absolute top-5 left-8 right-8 h-0.5 bg-slate-100" />
          
          {steps.map((s, i) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            
            return (
              <div key={s.id} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-3 mb-4 sm:mb-0 flex-1">
                <div className={\`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm mx-auto \${
                  isActive ? 'bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-50' 
                  : isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-50' 
                  : 'bg-white border-2 border-slate-200 text-slate-400'
                }\`}>
                  {isCompleted ? <CheckCircle2 size={20} /> : s.id}
                </div>
                <div className="text-left sm:text-center">
                  <p className={\`text-sm font-bold transition-colors \${isActive ? 'text-indigo-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'}\`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full">
        <div className="w-full">`;

// Safe replace using substring logic
const startIndex = content.indexOf(oldLayoutStart);
if (startIndex !== -1) {
  const endIndex = content.indexOf(oldLayoutMiddle, startIndex) + oldLayoutMiddle.length;
  if (endIndex > startIndex) {
    content = content.substring(0, startIndex) + newTopProgress + content.substring(endIndex);
    fs.writeFileSync(path, content);
    console.log('Successfully updated layout to horizontal tabs');
  } else {
    console.log('Could not find end index');
  }
} else {
  console.log('Could not find start index');
}
