"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  Building2,
  MapPin,
  Mail,
  User,
  Phone,
  Save,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ShieldCheck,
  Globe,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CompanySettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    pic_name: "",
    pic_phone: "",
    logo_url: "",
    enableAiAssistant: false,
    helpKnowledgeMode: "local",
    aiProvider: "openai",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await (supabase
        .from("profiles" as any) as any)
        .select("*, organizations(*)")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        if (profile.organizations) {
          const orgSettings = profile.organizations.settings || {};
          const aiSettings =
            typeof orgSettings === "object" ? orgSettings.ai || {} : {};
          setOrganization(profile.organizations);
          setFormData({
            name: profile.organizations.name || "",
            address: profile.organizations.address || "",
            email: profile.organizations.email || "",
            pic_name: profile.organizations.pic_name || "",
            pic_phone: profile.organizations.pic_phone || "",
            logo_url: profile.organizations.logo_url || "",
            enableAiAssistant: aiSettings.enabled ?? false,
            helpKnowledgeMode: aiSettings.knowledgeMode || "local",
            aiProvider: aiSettings.provider || "openai",
          });
        }
      }
    } catch (error: any) {
      toast.error("Failed to sync protocol: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `brand-assets/${organization.id}/logo-${Date.now()}.${fileExt}`;

      // Using 'documents' bucket as verified in PhysicalDocModal
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success("Identity Asset uploaded successfully");
    } catch (error: any) {
      toast.error("Asset Deployment failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setSaving(true);
    try {
      const { error } = await (supabase
        .from("organizations" as any) as any)
        .update({
          name: formData.name,
          address: formData.address,
          email: formData.email,
          pic_name: formData.pic_name,
          pic_phone: formData.pic_phone,
          logo_url: formData.logo_url,
          settings: {
            ...organization.settings,
            ai: {
              enabled: formData.enableAiAssistant,
              knowledgeMode: formData.helpKnowledgeMode,
              provider: formData.aiProvider,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id);

      if (error) throw error;
      toast.success("Protocol updated successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Protocol update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto space-y-12">
        {/* 🌌 HEADER COMMAND BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-3 text-slate-500 hover:text-blue-400 transition-all group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                Back to Command Center
              </span>
            </Link>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                Company <span className="text-blue-500">Identity</span>
              </h1>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">
                  Terminal 01: Branding & Profile Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                System Principal
              </p>
              <p className="text-base font-black italic text-white uppercase tracking-tight">
                {userProfile?.full_name}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* 🛡️ LEFT COLUMN: BRANDING ASSET */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#111214] border border-white/5 rounded-[3.5rem] p-10 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

              <h3 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10 italic">
                Core Branding Asset
              </h3>

              <div className="aspect-square bg-black/40 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group/logo shadow-inner">
                {formData.logo_url ? (
                  <>
                    <Image
                      src=""
                      alt="Logo"
                      fill
                      className="w-3/4 h-3/4 object-contain transition-transform duration-700 group-hover/logo:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-all flex items-center justify-center gap-4">
                      <button
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, logo_url: "" }))
                        }
                        className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all"
                      >
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center group-hover/logo:bg-blue-600/20 transition-all">
                      {uploading ? (
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-slate-500 group-hover/logo:text-blue-500 transition-all" />
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/logo:text-blue-500 transition-all">
                      Deploy Corporate Logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                  Logo ini akan otomatis disematkan pada seluruh dokumen dinamis
                  (Surat Jalan, Invoicing, Laporan) di setiap unit bisnis SBU.
                  Gunakan format .PNG transparan untuk hasil premium.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 p-8 rounded-[2.5rem] border border-blue-500/10 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <Globe className="w-6 h-6 text-blue-400" />
                <h4 className="text-[13px] font-black uppercase tracking-widest">
                  System Status
                </h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Sync Latency</span>
                  <span className="text-blue-400 font-mono">12ms</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-blue-500" />
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Identity updates propagate globally across all SBU nodes in
                  real-time.
                </p>
              </div>
            </div>
          </div>

          {/* 📝 RIGHT COLUMN: PROFILE DATA */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSave}
              className="bg-[#111214] border border-white/5 rounded-[3.5rem] p-10 md:p-14 space-y-12 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 italic flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-blue-500" /> Corporate
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Enter corporate legal name..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-10 text-base font-black italic text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 italic flex items-center gap-3">
                    <Mail className="w-4 h-4 text-blue-500" /> Institutional
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="contact@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-10 text-base font-black italic text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 italic flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-blue-500" /> Headquarters
                  Terminal Address
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Enter full physical address for legal documents..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-8 px-10 h-40 text-base font-black italic text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 italic flex items-center gap-3">
                    <User className="w-4 h-4 text-blue-500" /> Primary PIC Agent
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pic_name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, pic_name: e.target.value }))
                    }
                    placeholder="Full name of authority..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-10 text-base font-black italic text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4 italic flex items-center gap-3">
                    <Phone className="w-4 h-4 text-blue-500" /> Secure Contact
                    Line
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pic_phone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, pic_phone: e.target.value }))
                    }
                    placeholder="+62 8..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-10 text-base font-black italic text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner outline-none"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-3 bg-slate-950/50 border border-slate-800 rounded-[2rem] p-8 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                          AI Assist & Knowledge
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Kontrol mode bantuan chat robot dan pilih sumber
                          jawaban.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 uppercase tracking-[0.2em] font-semibold">
                        <span className="px-3 py-2 bg-slate-900 rounded-full">
                          P0 local first
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-4 rounded-3xl border border-slate-800 bg-slate-950">
                        <input
                          type="checkbox"
                          checked={formData.enableAiAssistant}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              enableAiAssistant: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm font-semibold text-white">
                          Aktifkan Chat AI
                        </span>
                      </label>

                      <div className="space-y-2 p-4 rounded-3xl border border-slate-800 bg-slate-950">
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Knowledge mode
                        </div>
                        <select
                          value={formData.helpKnowledgeMode}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              helpKnowledgeMode: e.target.value,
                            }))
                          }
                          className="w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="local">Local FAQ</option>
                          <option value="rag">RAG / Search</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 p-4 rounded-3xl border border-slate-800 bg-slate-950">
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          LLM provider
                        </div>
                        <select
                          value={formData.aiProvider}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              aiProvider: e.target.value,
                            }))
                          }
                          className="w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                        </select>
                      </div>
                      <div className="space-y-2 p-4 rounded-3xl border border-slate-800 bg-slate-950">
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Bot user
                        </div>
                        <p className="text-sm text-slate-300">
                          Supabase bot user is configured via environment and
                          won’t be stored here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-20 py-7 bg-blue-600 hover:bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] text-[15px] shadow-3xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-4 group"
                  >
                    {saving ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Save className="w-6 h-6 group-hover:scale-125 transition-transform" />
                    )}
                    Synchronize Protocol
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
