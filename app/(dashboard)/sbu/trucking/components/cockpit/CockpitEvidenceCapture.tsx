"use client";

import { ImageIcon, ExternalLink, PlusCircle } from "lucide-react";
import Image from "next/image";

interface CockpitEvidenceCaptureProps {
    jo: any;
}

export default function CockpitEvidenceCapture({
    jo
}: CockpitEvidenceCaptureProps) {
    return (
        <div className="space-y-8">
            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2">
                <ImageIcon className="w-6 h-6 text-emerald-500" /> Mission Evidence Capture
            </h4>
            
            <div className="grid grid-cols-2 gap-8 bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[400px]">
                {jo?.documents?.length > 0 ? (
                    jo.documents.map((doc: any) => (
                        <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] overflow-hidden group relative border border-slate-200 shadow-xl active:scale-95 transition-all">
                            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
                                <Image src={doc.file_url} alt="Evidence document" fill className="object-cover group-hover:scale-110 transition-all duration-700" />
                            </div>
                            <div className="absolute inset-0 bg-[#1E293B]/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                                <ExternalLink className="w-8 h-8 text-white mb-2" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest italic">View Asset</span>
                            </div>
                        </a>
                    ))
                ) : (
                    <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40">
                         <PlusCircle className="w-16 h-16" />
                         <p className="text-[13px] font-black uppercase tracking-widest italic tracking-tight">Ready for Field Upload</p>
                    </div>
                )}
            </div>
        </div>
    );
}
