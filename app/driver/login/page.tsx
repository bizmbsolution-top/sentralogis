"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";
import { Truck, Loader2, Phone, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useDriverAuth();
  
  const [whatsapp, setWhatsapp] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get("redirect") || "/driver/portal";
  let joToken: string | undefined = undefined;
  if (redirectUrl.includes("/jo/") || redirectUrl.includes("/driver/order/")) {
    const parts = redirectUrl.split(/\/(?:jo|order)\//);
    if (parts.length > 1) {
      joToken = parts[1].split("?")[0];
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinString = pin.join("");
    
    if (whatsapp.length < 10 || pinString.length < 4) {
      toast.error("Masukkan nomor WA dan PIN yang valid");
      return;
    }
    
    setLoading(true);
    const result = await login(whatsapp, pinString, joToken);
    setLoading(false);

    if (result.success) {
      toast.success("Login berhasil");
      // Use window.location.href or router.replace based on needs. router.replace is smoother for Next.js.
      router.replace(redirectUrl);
    } else {
      toast.error(result.error || "Nomor WA atau PIN salah, atau akun tidak aktif");
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-10"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-indigo-500/10 border border-slate-100">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <Truck size={32} className="text-white" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-800 text-center mb-2 tracking-tight">
            SentraLogis Driver
          </h1>
          <p className="text-sm font-semibold text-slate-500 text-center mb-8">
            Silakan login untuk melanjutkan
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={18} className="text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="081234567890"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                PIN (4 Digit)
              </label>
              <div className="flex gap-3 justify-between">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="relative flex-1">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {pin[index] ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      )}
                    </div>
                    <input
                      id={`pin-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={pin[index]}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-transparent focus:text-transparent caret-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || whatsapp.length < 10 || pin.join("").length < 4}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  MASUK <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function DriverLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
