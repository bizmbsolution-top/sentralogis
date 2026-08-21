'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Sparkles, Cpu, Users, ShieldAlert, Mail, Lock, ChevronRight, ArrowRight,
  Zap, Award, ShieldCheck, RefreshCw, Eye, MessageSquare, Smartphone,
  Radio, Bot, Radar, Timer, TowerControl, Send, BarChart3, Truck, Package,
  Warehouse, Globe, Ship, Container, ScanLine, Headphones, Building2,
  Network, Binary, Orbit, Atom, Hexagon, Layers, Target, TrendingUp,
  Box, Anchor, Plane, Train, Cable, Satellite, Fingerprint,
  Activity, BookOpen, Check, Copy, FileText, MapPin,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

const sectionTitle = (badge: string, title: string, highlight?: string) => (
  <div className="text-center space-y-5 max-w-3xl mx-auto mb-16 sm:mb-20">
    <motion.div {...stagger} className="inline-flex items-center gap-2 bg-white/[0.03] text-white/60 text-xs font-black tracking-widest uppercase px-4 py-2 border border-white/10 rounded-full">
      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
      {badge}
    </motion.div>
    <motion.h2 {...stagger} transition={{ delay: 0.1, ...stagger.transition }} className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-[1.1]">
      {title}{' '}
      {highlight && <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">{highlight}</span>}
    </motion.h2>
  </div>
);

export function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-5 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712] z-[1] pointer-events-none" />
      <div className="relative z-10 text-center max-w-5xl mx-auto pt-24 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-white/[0.03] text-white/50 text-xs font-black tracking-widest uppercase px-5 py-2.5 border border-white/10 rounded-full mb-8"
        >
          <Orbit className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
          {t.landing.heroBadge}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05]"
        >
          <span className="text-white">{t.landing.heroTitle}</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-purple-300">
            {t.landing.heroHighlight}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-base sm:text-lg md:text-xl font-medium max-w-4xl mx-auto mt-6 leading-relaxed"
        >
          {t.landing.heroSubtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
        >
          <button className="px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-[0_0_30px_-5px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_2px_rgba(6,182,212,0.8)] active:scale-95 transition-all">
            {t.landing.heroCTA}
          </button>
          <button className="px-8 sm:px-10 py-4 sm:py-5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-sm uppercase tracking-widest rounded-full border border-white/10 active:scale-95 transition-all">
            {t.landing.heroCTA2}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex items-center justify-center gap-8 text-white/20 text-[10px] font-black tracking-widest uppercase"
        >
          <span>People</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>AI</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>Operations</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="hidden sm:inline">Knowledge</span>
          <span className="hidden sm:inline w-1 h-1 rounded-full bg-white/20" />
          <span className="hidden sm:inline">Data</span>
          <span className="hidden sm:inline w-1 h-1 rounded-full bg-white/20" />
          <span className="hidden sm:inline">Finance</span>
          <span className="hidden sm:inline w-1 h-1 rounded-full bg-white/20" />
          <span className="hidden sm:inline">Partners</span>
        </motion.div>
      </div>
    </section>
  );
}

export function SectionWhy() {
  const { t } = useLanguage();
  return (
    <section id="features" className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.whyBadge, t.landing.whyTitle, t.landing.whyHighlight)}
      <div className="grid sm:grid-cols-2 gap-8 sm:gap-16 items-center max-w-4xl mx-auto">
        <motion.div {...fadeUp} className="space-y-4">
          <div className="text-xs font-black tracking-widest uppercase text-rose-400/80 mb-4">{t.landing.whyTraditionalHead}</div>
          {t.landing.whyTraditionalList.map((s: string, i: number) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 text-white/60 text-sm font-medium border-b border-white/5 pb-3"
            >
              <span className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs">✕</span>
              {s}
            </motion.div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2 text-xs text-rose-400/50 font-medium">
            {t.landing.whyTraditionalTags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/10">{tag}</span>
            ))}
          </div>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="text-xs font-black tracking-widest uppercase text-emerald-400/80 mb-4">{t.landing.whySentralogisHead}</div>
          {t.landing.whySentralogisList.map((s: string, i: number) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-white text-sm font-bold border-b border-white/10 pb-3"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs">✓</span>
              {s}
            </motion.div>
          ))}
          <div className="flex gap-1 pt-2">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const archIcons = [Hexagon, ArrowRight, BarChart3, Headphones, Binary, Bot];
const archColors = [
  'from-cyan-500/20 to-cyan-600/5', 'border-cyan-500/30', 'text-cyan-400',
  'from-violet-500/20 to-violet-600/5', 'border-violet-500/30', 'text-violet-400',
  'from-emerald-500/20 to-emerald-600/5', 'border-emerald-500/30', 'text-emerald-400',
  'from-amber-500/20 to-amber-600/5', 'border-amber-500/30', 'text-amber-400',
  'from-pink-500/20 to-pink-600/5', 'border-pink-500/30', 'text-pink-400',
  'from-indigo-500/20 to-indigo-600/5', 'border-indigo-500/30', 'text-indigo-400',
];

export function SectionArchitecture() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.archBadge, t.landing.archTitle, t.landing.archHighlight)}
      <div className="relative flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-pink-500/20 border border-white/20 flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.15)]"
        >
          <div className="text-center">
            <Hexagon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <span className="text-white font-black text-sm uppercase tracking-wider whitespace-pre-line">{t.landing.archCenter}</span>
          </div>
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10" style={{ animationDuration: '4s' }} />
        </motion.div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 max-w-4xl mx-auto">
        {t.landing.archDomains.map((name: string, i: number) => {
          const Icon = archIcons[i];
          const bg = archColors[i * 3];
          const brd = archColors[i * 3 + 1];
          const txt = archColors[i * 3 + 2];
          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border ${brd} bg-gradient-to-br ${bg} backdrop-blur-xl p-5 text-center hover:scale-105 transition-transform`}
            >
              <Icon className={`w-6 h-6 ${txt} mx-auto mb-2`} />
              <span className={`text-xs font-black uppercase tracking-wider ${txt}`}>{name}</span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const opsIcons = [Truck, Package, Globe, ShieldCheck, Container, Ship, ScanLine, MapPin, Layers, Users];

export function SectionOperations() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.opsBadge, t.landing.opsTitle, t.landing.opsHighlight)}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
        {t.landing.opsCapabilities.map((label: string, i: number) => {
          const Icon = opsIcons[i];
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 p-5 text-center transition-all"
            >
              <Icon className="w-8 h-8 text-cyan-400/80 group-hover:text-cyan-300 mx-auto mb-3 transition-colors" />
              <span className="text-xs font-bold text-white/60 group-hover:text-white/90 uppercase tracking-wider transition-colors">{label}</span>
            </motion.div>
          );
        })}
      </div>
      <motion.p {...fadeUp} className="text-center text-white/30 text-sm mt-8 max-w-xl mx-auto font-medium">
        {t.landing.opsFooter}
      </motion.p>
    </section>
  );
}

const aiIcons = [Bot, Package, FileText, Headphones, BarChart3, ShieldAlert, Binary, Target];

export function SectionAI() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.aiBadge, t.landing.aiTitle, t.landing.aiHighlight)}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {t.landing.aiWorkforce.map((ai: { name: string; desc: string }, i: number) => {
          const Icon = aiIcons[i];
          return (
            <motion.div
              key={ai.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -5 }}
              className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-6 hover:border-indigo-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-shadow">
                <Icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-sm font-black uppercase text-white tracking-wide mb-2">{ai.name}</h3>
              <p className="text-xs text-white/40 font-medium leading-relaxed">{ai.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const knowIcons = [BookOpen, RefreshCw, Layers, Radio, MessageSquare, TrendingUp];

export function SectionKnowledge() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.knowBadge, t.landing.knowTitle, t.landing.knowHighlight)}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {t.landing.knowItems.map((k: { label: string; desc: string }, i: number) => {
          const Icon = knowIcons[i];
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-emerald-500/30 transition-all"
            >
              <Icon className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="text-sm font-black uppercase text-white tracking-wide mb-1">{k.label}</h3>
              <p className="text-xs text-white/40 font-medium">{k.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const healthIcons = [Award, Activity, Users, BarChart3, Network, TrendingUp];
const healthColors = ['text-cyan-400', 'text-emerald-400', 'text-amber-400', 'text-pink-400', 'text-violet-400', 'text-indigo-400'];

export function SectionIntelligence() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.intelBadge, t.landing.intelTitle, t.landing.intelHighlight)}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {t.landing.intelMetrics.map((label: string, i: number) => {
          const Icon = healthIcons[i];
          const color = healthColors[i];
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.05 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 text-center hover:border-white/20 transition-all"
            >
              <Icon className={`w-7 h-7 ${color} mx-auto mb-3`} />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{label}</span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export function SectionEcosystem() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-6xl mx-auto">
      {sectionTitle(t.landing.ecoBadge, t.landing.ecoTitle, t.landing.ecoHighlight)}
      <motion.div {...fadeUp} className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 blur-3xl rounded-full" />
        <div className="relative grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {t.landing.ecoRoles.map((role: string, i: number) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.08, y: -3 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:py-4 text-center hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all"
            >
              <span className="text-xs sm:text-sm font-bold text-white/60 hover:text-white/90 uppercase tracking-wider transition-colors">{role}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.p {...fadeUp} className="text-center text-white/20 text-xs font-medium mt-8 tracking-widest uppercase">{t.landing.ecoFooter}</motion.p>
    </section>
  );
}

export function SectionFuture() {
  const { t } = useLanguage();
  return (
    <section className="relative z-10 py-24 sm:py-32 px-5 sm:px-6 max-w-5xl mx-auto text-center">
      {sectionTitle(t.landing.roadBadge, t.landing.roadTitle, t.landing.roadHighlight)}
      <div className="flex flex-col items-center gap-0 max-w-md mx-auto">
        {t.landing.roadSteps.map((step: string, i: number) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-4 w-full"
          >
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 ${i === 4 ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/20 bg-white/5'}`} />
              {i < 4 && <div className="w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent" />}
            </div>
            <span className={`text-sm font-bold uppercase tracking-wider ${i === 4 ? 'text-cyan-300' : 'text-white/50'}`}>{step}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SectionCTA() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copyEmail = () => {
    navigator.clipboard.writeText('info@sentralogis.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" className="relative z-10 py-24 sm:py-36 px-5 sm:px-6 border-t border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center space-y-10 relative">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/[0.03] text-white/50 text-xs font-black tracking-widest uppercase px-4 py-2 border border-white/10 rounded-full">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            {t.landing.ctaBadge}
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none whitespace-pre-line">
            {t.landing.ctaTitle}
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
            {t.landing.ctaSubtitle}
          </p>
        </div>
        <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(99,102,241,0.1)] hover:border-cyan-500/30 transition-all flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Mail className="w-7 h-7" />
          </div>
          <p className="text-xs text-white/40 font-medium">{t.landing.ctaEmailLabel}</p>
          <p className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight select-all">info@sentralogis.com</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <a href="mailto:info@sentralogis.com?subject=Enterprise%20Demo%20Request" className="flex-1">
              <button className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all">
                {t.landing.ctaRequestDemo}
              </button>
            </a>
            <button onClick={copyEmail} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-full border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-2">
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-emerald-400" /> {t.landing.ctaCopied}</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> {t.landing.ctaCopyEmail}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  const { t } = useLanguage();
  return (
    <footer className="relative z-10 py-12 sm:py-16 px-5 sm:px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-3">
          <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-8 w-auto opacity-60" />
          <span className="text-white/40 text-sm font-black uppercase tracking-wider">{t.landing.footerTagline}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold tracking-widest uppercase text-white/30">
          {t.landing.footerLinks.map((link: string) => (
            <span key={link} className="hover:text-white/60 cursor-pointer transition-colors">{link}</span>
          ))}
        </div>
        <div className="text-[10px] font-black tracking-widest text-white/20">
          {t.landing.footerCopyright}
        </div>
      </div>
    </footer>
  );
}


