export type Locale = 'id' | 'en' | 'zh';

export const translations: Record<Locale, {
  nav: {
    beranda: string;
    fitur: string;
    kontak: string;
    login: string;
    loginManajemen: string;
  };
  hero: {
    badge: string;
    title1: string;
    titleHighlight: string;
    title2: string;
    subtitle: string;
    cta_consult: string;
    cta_features: string;
  };
  features: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    sla: { title: string; desc: string; items: string[] };
    chat: { title: string; desc: string; items: string[] };
    whatsapp: { title: string; desc: string; items: string[] };
    realtime: { title: string; desc: string; items: string[] };
    dispatch: { title: string; desc: string; items: string[] };
    towers: { title: string; desc: string; items: string[] };
  };
  ecosystem: {
    badge: string;
    step1: { title: string; desc: string };
    step2: { title: string; desc: string };
    step3: { title: string; desc: string };
    step4: { title: string; desc: string };
    flowDesc: string;
  };
  cta: {
    badge: string;
    title: string;
    subtitle: string;
    emailLabel: string;
    copySuccess: string;
  };
  footer: {
    copyright: string;
  };
  wo: {
    workOrder: string;
    live: string;
    customerInfo: string;
    customer: string;
    woNumber: string;
    status: string;
    location: string;
    lastUpdate: string;
    allJobOrders: string;
    filterTab: { all: string; active: string; completed: string; pending: string };
    statusLabels: {
      waitingLoad: string;
      loading: string;
      enRoute: string;
      unloading: string;
      completed: string;
    };
    noData: string;
    selectJo: string;
  };
  sidebar: Record<string, string>;
  navbar: Record<string, string>;
  landing: {
    heroBadge: string;
    heroTitle: string;
    heroHighlight: string;
    heroSubtitle: string;
    heroCTA: string;
    heroCTA2: string;
    whyBadge: string;
    whyTitle: string;
    whyHighlight: string;
    whyTraditionalHead: string;
    whyTraditionalList: string[];
    whyTraditionalTags: string[];
    whySentralogisHead: string;
    whySentralogisList: string[];
    archBadge: string;
    archTitle: string;
    archHighlight: string;
    archCenter: string;
    archDomains: string[];
    opsBadge: string;
    opsTitle: string;
    opsHighlight: string;
    opsCapabilities: string[];
    opsFooter: string;
    aiBadge: string;
    aiTitle: string;
    aiHighlight: string;
    aiWorkforce: { name: string; desc: string }[];
    knowBadge: string;
    knowTitle: string;
    knowHighlight: string;
    knowItems: { label: string; desc: string }[];
    intelBadge: string;
    intelTitle: string;
    intelHighlight: string;
    intelMetrics: string[];
    ecoBadge: string;
    ecoTitle: string;
    ecoHighlight: string;
    ecoRoles: string[];
    ecoFooter: string;
    roadBadge: string;
    roadTitle: string;
    roadHighlight: string;
    roadSteps: string[];
    ctaBadge: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaEmailLabel: string;
    ctaCopyEmail: string;
    ctaCopied: string;
    ctaRequestDemo: string;
    footerTagline: string;
    footerLinks: string[];
    footerCopyright: string;
  };
}> = {
  id: {
    nav: {
      beranda: 'BERANDA',
      fitur: 'FITUR & EKOSISTEM',
      kontak: 'KONTAK',
      login: 'PORTAL LOGIN',
      loginManajemen: 'LOGIN MANAJEMEN',
    },
    hero: {
      badge: 'PLATFORM LOGISTIK UNIFIED 4-SBU',
      title1: 'Orkestrasi',
      titleHighlight: 'Universe Logistik',
      title2: 'Perusahaan Anda',
      subtitle: 'Satu platform terintegrasi untuk <span class="font-bold text-white">Trucking</span>, <span class="font-bold text-white">Warehouse</span>, <span class="font-bold text-white">Clearance</span>, dan <span class="font-bold text-white">Forwarding</span>. Orkestrasi seluruh operasi logistik dari satu pusat kendali.',
      cta_consult: 'KONSULTASI GRATIS →',
      cta_features: 'PELAJARI FITUR ↓',
    },
    features: {
      title: 'Fitur Unggulan',
      titleHighlight: 'Sentralogis',
      subtitle: 'Ekosistem terintegrasi yang menghubungkan Trucking, Warehouse, Clearance, dan Forwarding dalam satu platform — komunikasi real-time, otomasi dispatch, dan intelligence dashboard.',
      sla: {
        title: 'SLA PERFORMANCE',
        desc: 'Pantau kinerja tim lintas SBU melalui <span class="text-amber-400 font-bold">Service Level Agreement</span> yang terotomasi. Setiap aktivitas driver, operator warehouse, petugas clearance, dan forwarding tercatat sebagai skor performa.',
        items: ['Skor performa per SBU & individu', 'Target SLA configurable per operasi', 'Dashboard ranking & reward otomatis'],
      },
      chat: {
        title: 'CHAT PANEL INTERNAL',
        desc: 'Panel komunikasi internal yang <span class="text-cyan-400 font-bold">fokus ke setiap order</span>. Tim operasional, driver, dan warehouse dapat berdiskusi langsung di konteks order tanpa berpindah aplikasi.',
        items: ['Thread diskusi per order number', 'Lampiran foto & dokumen langsung', 'Notifikasi real-time ke semua pihak'],
      },
      whatsapp: {
        title: 'WHATSAPP INTEGRATION',
        desc: 'Tim lapangan menggunakan <span class="text-emerald-400 font-bold">WhatsApp</span> untuk update status lintas SBU — driver kirim POD, operator warehouse konfirmasi received, petugas clearance upload dokumen.',
        items: ['POD & update status via WhatsApp', 'Auto-sync ke semua dashboard SBU', 'Notifikasi real-time ke pelanggan'],
      },
      realtime: {
        title: 'REALTIME UPDATING',
        desc: 'Status order, posisi armada, stok warehouse, progress clearance, dan pengiriman forwarding <span class="text-violet-400 font-bold">ter-update real-time</span> tanpa refresh.',
        items: ['Live tracking lintas semua SBU', 'Push notification status berubah', 'Customer portal self-service'],
      },
      dispatch: {
        title: 'SMART DISPATCH',
        desc: 'Sistem <span class="text-rose-400 font-bold">otentikasi otomatis</span> lintas SBU — menugaskan driver trucking, operator warehouse, atau petugas clearance berdasarkan kapasitas, reputasi, dan proximity.',
        items: ['Auto-match personil & order lintas SBU', 'Pertimbangan reputasi & proximity', 'Reduce idle time seluruh operasi'],
      },
      towers: {
        title: 'INTELLIGENCE TOWERS',
        desc: '<span class="text-sky-400 font-bold">Pusat komando visual</span> untuk memonitor seluruh operasi logistik dari satu layar. Visualisasi trucking, warehouse, clearance, dan forwarding dalam satu dashboard.',
        items: ['Bird-eye view lintas 4 SBU', 'Heatmap bottleneck & anomali', 'KPI dashboard SDM & armada'],
      },
    },
    ecosystem: {
      badge: 'ECOSYSTEM OVERVIEW',
      step1: { title: 'ORDER MASUK', desc: 'Trucking / Warehouse / Clearance / Forwarding' },
      step2: { title: 'SMART DISPATCH', desc: 'Auto-assign ke SBU terkait' },
      step3: { title: 'EKSEKUSI LAPANGAN', desc: 'Update via WhatsApp' },
      step4: { title: 'INTELLIGENCE TOWERS', desc: 'Monitor semua SBU real-time' },
      flowDesc: '<span class="text-white font-bold tracking-wide">Alur Ekosistem:</span> Order dari <span class="text-indigo-400 font-bold">4 SBU</span> (Trucking, Warehouse, Clearance, Forwarding) → <span class="text-cyan-400 font-bold">Smart Dispatch</span> (auto-assign ke SBU terkait) → <span class="text-emerald-400 font-bold">Eksekusi via WhatsApp</span> (update status real-time) → <span class="text-amber-400 font-bold">Intelligence Towers</span> (monitor seluruh operasi dari satu layar).',
},
    cta: {
      badge: 'HUBUNGI KAMI',
      title: 'Siap Orkestrasi Logistik Anda?',
      subtitle: 'Jadwalkan demo Sentralogis untuk perusahaan Anda — Trucking, Warehouse, Clearance, dan Forwarding dalam satu platform. Hubungi kami via email.',
      emailLabel: 'OFFICIAL PARTNER CONTACT',
      copySuccess: 'SALIN BERHASIL',
    },
    footer: {
      copyright: '© 2026 Sentralogis.com | Powered by MBsolutions. All Rights Reserved.',
    },
    landing: {
      heroBadge: 'ENTERPRISE OPERATING SYSTEM v2.0',
      heroTitle: 'The Enterprise Operating System',
      heroHighlight: 'untuk Logistik Modern',
      heroSubtitle: 'Satu platform yang menghubungkan Transportasi, Gudang, Forwarding, Kepabeanan, Exchange, Capital, Customer Success, Intelligence dan AI.',
      heroCTA: 'Request Demo Enterprise',
      heroCTA2: 'Tonton Vision',
      whyBadge: 'MENGAPA SENTRALOGIS',
      whyTitle: 'Sistem Tradisional',
      whyHighlight: 'Tidak Terhubung',
      whyTraditionalHead: 'Tradisional',
      whyTraditionalList: ['TMS', 'WMS', 'ERP', 'CRM', 'Spreadsheet', 'Email', 'WhatsApp'],
      whyTraditionalTags: ['Tidak Terhubung', 'Reaktif', 'Terisolasi', 'Lambat'],
      whySentralogisHead: 'Sentralogis',
      whySentralogisList: ['Terhubung', 'Cerdas', 'Kolaboratif', 'Bertenaga AI', 'Siap Enterprise'],
      archBadge: 'ARSITEKTUR',
      archTitle: 'Enterprise',
      archHighlight: 'Operating System',
      archCenter: 'Bisnis\nKapabilitas',
      archDomains: ['Operasi', 'Exchange', 'Capital', 'Customer Success', 'Intelligence', 'AI Copilot'],
      opsBadge: 'OPERASI',
      opsTitle: 'Platform',
      opsHighlight: 'Operasi',
      opsCapabilities: ['Transportasi', 'Gudang', 'Freight Forwarding', 'Kepabeanan', 'Kontainer', 'Pengiriman', 'Inventaris', 'Pelacakan', 'Armada', 'Driver'],
      opsFooter: 'Workspace Operasi · Jurnal Operasi',
      aiBadge: 'TENAGA KERJA AI',
      aiTitle: 'Tenaga Kerja',
      aiHighlight: 'AI Digital',
      aiWorkforce: [
        { name: 'AI Dispatcher', desc: 'Penugasan rute & muatan cerdas' },
        { name: 'AI Warehouse Planner', desc: 'Penyimpanan & putaway optimal' },
        { name: 'AI Doc Assistant', desc: 'Generate dokumen pengiriman otomatis' },
        { name: 'AI Customer Assistant', desc: 'Inquiry & tracking 24/7' },
        { name: 'AI Finance Copilot', desc: 'Otomatisasi invoice & pembayaran' },
        { name: 'AI Risk Advisor', desc: 'Prediksi & mitigasi gangguan' },
        { name: 'AI Knowledge Agent', desc: 'Pengetahuan institusional on demand' },
        { name: 'AI Decision Assistant', desc: 'Rekomendasi berbasis data' },
      ],
      knowBadge: 'PENGETAHUAN',
      knowTitle: 'Platform',
      knowHighlight: 'Pengetahuan',
      knowItems: [
        { label: 'Jurnal Operasi', desc: 'Setiap peristiwa. Setiap keputusan. Tercatat.' },
        { label: 'Pelajaran Berharga', desc: 'Perbaikan berkelanjutan dari operasi nyata' },
        { label: 'Pengetahuan Enterprise', desc: 'Memori institusional. Tidak pernah hilang.' },
        { label: 'Event Bisnis', desc: 'Stream event real-time lintas semua domain' },
        { label: 'Percakapan', desc: 'Chat sebagai objek bisnis. Terlacak.' },
        { label: 'Pembelajaran Berkelanjutan', desc: 'AI belajar dari pola operasi Anda' },
      ],
      intelBadge: 'INTELIJEN',
      intelTitle: 'Intelijen',
      intelHighlight: 'Enterprise',
      intelMetrics: ['Skor Kesehatan Bisnis', 'Kesehatan Operasional', 'Kesehatan Pelanggan', 'Kesehatan Finansial', 'Kesehatan Jaringan', 'Analitik Prediktif'],
      ecoBadge: 'EKOSISTEM',
      ecoTitle: 'Ekosistem',
      ecoHighlight: 'Terhubung',
      ecoRoles: ['Pelanggan', 'Carrier', 'Gudang', 'Forwarder', 'Shipping Line', 'Maskapai', 'Kepabeanan', 'Pemerintah', 'Bank', 'Asuransi', 'Marketplace', 'AI'],
      ecoFooter: 'Semua Terhubung.',
      roadBadge: 'ROADMAP',
      roadTitle: 'Roadmap',
      roadHighlight: 'Evolusi',
      roadSteps: ['Fundasi Digital', 'Enterprise Terhubung', 'Enterprise Cerdas', 'Enterprise Otonom', 'Platform Jaringan Logistik'],
      ctaBadge: 'MULAI',
      ctaTitle: 'Bangun Masa Depan\nLogistik',
      ctaSubtitle: 'Jangan beli software lain. Bangun enterprise Anda di Sentralogis.',
      ctaEmailLabel: 'Hubungi tim kami',
      ctaCopyEmail: 'Salin Email',
      ctaCopied: 'Tersalin!',
      ctaRequestDemo: 'Request Demo Enterprise →',
      footerTagline: 'Sentralogis',
      footerLinks: ['Produk', 'Solusi', 'Arsitektur', 'Keamanan', 'Developer', 'Perusahaan', 'Kontak'],
      footerCopyright: '© 2026 Sentralogis',
    },
    wo: {
      workOrder: 'Pesanan Kerja',
      live: 'Langsung',
      customerInfo: 'Informasi Pelanggan',
      customer: 'Pelanggan',
      woNumber: 'Nomor WO',
      status: 'Status',
      location: 'Lokasi',
      lastUpdate: 'Terakhir Diperbarui',
      allJobOrders: 'Semua Pesanan Kerja',
      filterTab: { all: 'Semua', active: 'Aktif', completed: 'Selesai', pending: 'Menunggu' },
      statusLabels: {
        waitingLoad: 'Menunggu Muat',
        loading: 'Sedang Memuat',
        enRoute: 'Dalam Perjalanan',
        unloading: 'Sedang Membongkar',
        completed: 'Selesai'
      },
      noData: 'Tidak ada data pesanan kerja',
      selectJo: 'Pilih pesanan kerja untuk melihat detail'
    },
    sidebar: {
      'Work Order': 'Pesanan Kerja',
      'Job Order': 'Order Pekerjaan',
      'Mission Radar': 'Radar Misi',
      'Intelligence Tower': 'Intelligence Tower',
      'Master Data': 'Data Master',
      'Finance Matrix': 'Finance Matrix',
      'AR = Invoicing': 'Invoice Pelanggan',
      'AP = Purchase': 'Audit Biaya',
      'Organization': 'Organisasi',
      'Users': 'Pengguna',
      'Settings': 'Pengaturan',
      'Trucking': 'Trucking',
      'Warehouse': 'Gudang',
      'Clearance': 'Clearance',
      'Forwarding': 'Forwarding',
      'Reporting': 'Laporan',
      'Dashboard': 'Dasbor',
      'Profile': 'Profil'
    },
    navbar: {
      systemOnline: 'Sistem Online',
      poweredBy: 'Dipersembahkan oleh',
      robotChat: 'Robot Chat',
      notifications: 'Notifikasi',
      new: 'BARU',
      markAllRead: 'Tandai Semua Dibaca',
      noNewNotif: 'Tidak ada notifikasi baru',
      viewAll: 'Lihat Semua Notifikasi',
      profile: 'Profil',
      logout: 'Keluar',
      justNow: 'Baru Saja'
    }
  },
  en: {
    nav: {
      beranda: 'HOME',
      fitur: 'FEATURES & ECOSYSTEM',
      kontak: 'CONTACT',
      login: 'PORTAL LOGIN',
      loginManajemen: 'LOGIN MANAGEMENT',
    },
    hero: {
      badge: 'UNIFIED LOGISTICS PLATFORM 4-SBU',
      title1: 'Orchestrate',
      titleHighlight: 'Your Logistics Universe',
      title2: 'From One Command Center',
      subtitle: 'One integrated platform for <span class="font-bold text-white">Trucking</span>, <span class="font-bold text-white">Warehouse</span>, <span class="font-bold text-white">Clearance</span>, and <span class="font-bold text-white">Forwarding</span>. Orchestrate all logistics operations from a single command center.',
      cta_consult: 'FREE CONSULTATION →',
      cta_features: 'EXPLORE FEATURES ↓',
    },
    features: {
      title: 'Key Features',
      titleHighlight: 'Sentralogis',
      subtitle: 'An integrated ecosystem connecting Trucking, Warehouse, Clearance, and Forwarding in one platform — real-time communication, automated dispatch, and intelligence dashboard.',
      sla: {
        title: 'SLA PERFORMANCE',
        desc: 'Monitor cross-SBU team performance through automated <span class="text-amber-400 font-bold">Service Level Agreements</span>. Every activity from drivers, warehouse operators, clearance officers, and forwarding staff is recorded as a performance score.',
        items: ['Performance score per SBU & individual', 'Configurable SLA targets per operation', 'Automated ranking & reward dashboard'],
      },
      chat: {
        title: 'INTERNAL CHAT PANEL',
        desc: 'Internal communication panel <span class="text-cyan-400 font-bold">focused on each order</span>. Operations team, drivers, and warehouse staff can discuss directly in order context without switching apps.',
        items: ['Discussion thread per order number', 'Direct photo & document attachments', 'Real-time notifications to all parties'],
      },
      whatsapp: {
        title: 'WHATSAPP INTEGRATION',
        desc: 'Field teams use <span class="text-emerald-400 font-bold">WhatsApp</span> for cross-SBU status updates — drivers send POD, warehouse operators confirm received, clearance officers upload documents.',
        items: ['POD & status updates via WhatsApp', 'Auto-sync to all SBU dashboards', 'Real-time customer notifications'],
      },
      realtime: {
        title: 'REALTIME UPDATING',
        desc: 'Order status, fleet position, warehouse stock, clearance progress, and forwarding shipments <span class="text-violet-400 font-bold">update in real-time</span> without refresh.',
        items: ['Live tracking across all SBUs', 'Push notifications on status changes', 'Self-service customer portal'],
      },
      dispatch: {
        title: 'SMART DISPATCH',
        desc: 'Automated <span class="text-rose-400 font-bold">cross-SBU assignment</span> system — assigns trucking drivers, warehouse operators, or clearance officers based on capacity, reputation, and proximity.',
        items: ['Auto-match personnel & orders across SBUs', 'Reputation & proximity considerations', 'Reduce idle time across all operations'],
      },
      towers: {
        title: 'INTELLIGENCE TOWERS',
        desc: '<span class="text-sky-400 font-bold">Visual command center</span> to monitor all logistics operations from one screen. Visualize trucking, warehouse, clearance, and forwarding in one actionable dashboard.',
        items: ['Bird-eye view across 4 SBUs', 'Bottleneck & anomaly heatmap', 'SDM & fleet KPI dashboard'],
      },
    },
    ecosystem: {
      badge: 'ECOSYSTEM OVERVIEW',
      step1: { title: 'ORDER INPUT', desc: 'Trucking / Warehouse / Clearance / Forwarding' },
      step2: { title: 'SMART DISPATCH', desc: 'Auto-assign to relevant SBU' },
      step3: { title: 'FIELD EXECUTION', desc: 'Update via WhatsApp' },
      step4: { title: 'INTELLIGENCE TOWERS', desc: 'Monitor all SBUs real-time' },
      flowDesc: '<span class="text-white font-bold tracking-wide">Ecosystem Flow:</span> Orders from <span class="text-indigo-400 font-bold">4 SBUs</span> (Trucking, Warehouse, Clearance, Forwarding) → <span class="text-cyan-400 font-bold">Smart Dispatch</span> (auto-assign to relevant SBU) → <span class="text-emerald-400 font-bold">Field Execution via WhatsApp</span> (real-time status updates) → <span class="text-amber-400 font-bold">Intelligence Towers</span> (monitor all operations from one screen).',
    },
    cta: {
      badge: 'CONTACT US',
      title: 'Ready to Orchestrate Your Logistics?',
      subtitle: 'Schedule a Sentralogis demo for your company — Trucking, Warehouse, Clearance, and Forwarding in one platform. Contact us via email.',
      emailLabel: 'OFFICIAL PARTNER CONTACT',
      copySuccess: 'COPIED!',
    },
    footer: {
      copyright: '© 2026 Sentralogis.com | Powered by MBsolutions. All Rights Reserved.',
    },
    landing: {
      heroBadge: 'ENTERPRISE OPERATING SYSTEM v2.0',
      heroTitle: 'The Enterprise Operating System',
      heroHighlight: 'for Modern Logistics',
      heroSubtitle: 'One platform connecting Transportation, Warehouse, Freight Forwarding, Customs Clearance, Exchange, Capital, Customer Success, Intelligence and AI.',
      heroCTA: 'Request Enterprise Demo',
      heroCTA2: 'Watch Vision',
      whyBadge: 'WHY SENTRALOGIS',
      whyTitle: 'Traditional Systems Are',
      whyHighlight: 'Disconnected',
      whyTraditionalHead: 'Traditional',
      whyTraditionalList: ['TMS', 'WMS', 'ERP', 'CRM', 'Spreadsheet', 'Email', 'WhatsApp'],
      whyTraditionalTags: ['Disconnected', 'Reactive', 'Siloed', 'Slow'],
      whySentralogisHead: 'Sentralogis',
      whySentralogisList: ['Connected', 'Intelligent', 'Collaborative', 'AI Powered', 'Enterprise Ready'],
      archBadge: 'ARCHITECTURE',
      archTitle: 'Enterprise',
      archHighlight: 'Operating System',
      archCenter: 'Business\nCapability',
      archDomains: ['Operations', 'Exchange', 'Capital', 'Customer Success', 'Intelligence', 'AI Copilot'],
      opsBadge: 'OPERATIONS',
      opsTitle: 'Operations',
      opsHighlight: 'Platform',
      opsCapabilities: ['Transportation', 'Warehouse', 'Freight Forwarding', 'Customs Clearance', 'Container', 'Shipment', 'Inventory', 'Tracking', 'Fleet', 'Driver'],
      opsFooter: 'Operational Workspace · Operational Journal',
      aiBadge: 'AI WORKFORCE',
      aiTitle: 'AI Digital',
      aiHighlight: 'Workforce',
      aiWorkforce: [
        { name: 'AI Dispatcher', desc: 'Intelligent route & load assignment' },
        { name: 'AI Warehouse Planner', desc: 'Optimal storage & putaway' },
        { name: 'AI Doc Assistant', desc: 'Auto-generate shipping docs' },
        { name: 'AI Customer Assistant', desc: '24/7 inquiry & tracking' },
        { name: 'AI Finance Copilot', desc: 'Invoice & payment automation' },
        { name: 'AI Risk Advisor', desc: 'Predict & mitigate disruptions' },
        { name: 'AI Knowledge Agent', desc: 'Institutional knowledge on demand' },
        { name: 'AI Decision Assistant', desc: 'Data-backed recommendations' },
      ],
      knowBadge: 'KNOWLEDGE',
      knowTitle: 'Knowledge',
      knowHighlight: 'Platform',
      knowItems: [
        { label: 'Operational Journal', desc: 'Every event. Every decision. Recorded.' },
        { label: 'Lessons Learned', desc: 'Continuous improvement from real operations' },
        { label: 'Enterprise Knowledge', desc: 'Institutional memory. Never lost.' },
        { label: 'Business Events', desc: 'Real-time event stream across all domains' },
        { label: 'Conversation', desc: 'Chat as a business object. Tracked.' },
        { label: 'Continuous Learning', desc: 'AI trains on your operational patterns' },
      ],
      intelBadge: 'INTELLIGENCE',
      intelTitle: 'Enterprise',
      intelHighlight: 'Intelligence',
      intelMetrics: ['Business Health Score', 'Operational Health', 'Customer Health', 'Financial Health', 'Network Health', 'Predictive Analytics'],
      ecoBadge: 'ECOSYSTEM',
      ecoTitle: 'Connected',
      ecoHighlight: 'Ecosystem',
      ecoRoles: ['Customer', 'Carrier', 'Warehouse', 'Forwarder', 'Shipping Line', 'Airline', 'Customs', 'Government', 'Bank', 'Insurance', 'Marketplace', 'AI'],
      ecoFooter: 'All Connected.',
      roadBadge: 'ROADMAP',
      roadTitle: 'Evolution',
      roadHighlight: 'Roadmap',
      roadSteps: ['Digital Foundation', 'Connected Enterprise', 'Intelligent Enterprise', 'Autonomous Enterprise', 'Logistics Network Platform'],
      ctaBadge: 'GET STARTED',
      ctaTitle: 'Build the Future\nof Logistics',
      ctaSubtitle: "Don't buy another software. Build your enterprise on Sentralogis.",
      ctaEmailLabel: 'Reach our team',
      ctaCopyEmail: 'Copy Email',
      ctaCopied: 'Copied!',
      ctaRequestDemo: 'Request Enterprise Demo →',
      footerTagline: 'Sentralogis',
      footerLinks: ['Product', 'Solutions', 'Architecture', 'Security', 'Developers', 'Company', 'Contact'],
      footerCopyright: '© 2026 Sentralogis',
    },
    wo: {
      workOrder: 'Work Order',
      live: 'Live',
      customerInfo: 'Customer Info',
      customer: 'Customer',
      woNumber: 'WO Number',
      status: 'Status',
      location: 'Location',
      lastUpdate: 'Last Updated',
      allJobOrders: 'All Job Orders',
      filterTab: { all: 'All', active: 'Active', completed: 'Completed', pending: 'Waiting' },
      statusLabels: {
        waitingLoad: 'Waiting for Load',
        loading: 'Loading',
        enRoute: 'En Route',
        unloading: 'Unloading',
        completed: 'Completed'
      },
      noData: 'No job order data',
      selectJo: 'Select a job order to view details'
    },
    sidebar: {
      'Work Order': 'Work Order',
      'Job Order': 'Job Order',
      'Mission Radar': 'Mission Radar',
      'Intelligence Tower': 'Intelligence Tower',
      'Master Data': 'Master Data',
      'Finance Matrix': 'Finance Matrix',
      'AR = Invoicing': 'AR = Invoicing',
      'AP = Purchase': 'AP = Purchase',
      'Organization': 'Organization',
      'Users': 'Users',
      'Settings': 'Settings',
      'Trucking': 'Trucking',
      'Warehouse': 'Warehouse',
      'Clearance': 'Clearance',
      'Forwarding': 'Forwarding',
      'Reporting': 'Reporting',
      'Dashboard': 'Dashboard',
      'Profile': 'Profile'
    },
    navbar: {
      systemOnline: 'System Online',
      poweredBy: 'Powered by',
      robotChat: 'Robot Chat',
      notifications: 'Notifications',
      new: 'NEW',
      markAllRead: 'Mark All Read',
      noNewNotif: 'No new notifications',
      viewAll: 'View All Notifications',
      profile: 'Profile',
      logout: 'Logout',
      justNow: 'Just now'
    }
  },
  zh: {
    nav: {
      beranda: '首页',
      fitur: '功能与生态',
      kontak: '联系我们',
      login: '登录门户',
      loginManajemen: '管理登录',
    },
    hero: {
      badge: '一体化物流平台 4大业务单元',
      title1: '编排',
      titleHighlight: '您的物流宇宙',
      title2: '从一个指挥中心',
      subtitle: '一个集成平台，涵盖<span class="font-bold text-white">运输</span>、<span class="font-bold text-white">仓储</span>、<span class="font-bold text-white">报关</span>和<span class="font-bold text-white">货代</span>。从一个指挥中心编排所有物流运营。',
      cta_consult: '免费咨询 →',
      cta_features: '探索功能 ↓',
    },
    features: {
      title: '核心功能',
      titleHighlight: 'Sentralogis',
      subtitle: '连接运输、仓储、报关和货代的一体化生态系统——实时通讯、智能调度和智能仪表盘。',
      sla: {
        title: 'SLA 绩效',
        desc: '通过自动化的<span class="text-amber-400 font-bold">服务水平协议</span>监控跨业务单元团队绩效。司机、仓库操作员、报关员和货代人员的每项活动都记录为绩效分数。',
        items: ['按业务单元和个人的绩效评分', '可配置的SLA目标', '自动化排名与奖励仪表盘'],
      },
      chat: {
        title: '内部聊天面板',
        desc: '<span class="text-cyan-400 font-bold">聚焦每个订单</span>的内部沟通面板。运营团队、司机和仓库人员可以直接在订单上下文中讨论，无需切换应用。',
        items: ['每个订单号的讨论串', '直接上传照片和文件', '实时通知所有相关方'],
      },
      whatsapp: {
        title: 'WhatsApp 集成',
        desc: '现场团队使用<span class="text-emerald-400 font-bold">WhatsApp</span>进行跨业务单元状态更新——司机发送签收证明，仓库操作员确认收货，报关员上传文件。',
        items: ['通过WhatsApp发送签收证明', '自动同步到所有仪表盘', '实时客户通知'],
      },
      realtime: {
        title: '实时更新',
        desc: '订单状态、车队位置、仓库库存、报关进度和货代发货<span class="text-violet-400 font-bold">实时更新</span>，无需刷新。',
        items: ['跨所有业务单元的实时追踪', '状态变更推送通知', '自助客户服务门户'],
      },
      dispatch: {
        title: '智能调度',
        desc: '自动化的<span class="text-rose-400 font-bold">跨业务单元分配</span>系统——根据能力、声誉和距离分配运输司机、仓库操作员或报关员。',
        items: ['跨业务单元自动匹配人员与订单', '考虑声誉与距离', '减少所有运营的空闲时间'],
      },
      towers: {
        title: '智能塔',
        desc: '<span class="text-sky-400 font-bold">可视化指挥中心</span>，从一个屏幕监控所有物流运营。在一个仪表盘中可视化运输、仓储、报关和货代。',
        items: ['跨4个业务单元的鸟瞰视图', '瓶颈与异常热力图', '人员与车队KPI仪表盘'],
      },
    },
    ecosystem: {
      badge: '生态系统概览',
      step1: { title: '订单输入', desc: '运输 / 仓储 / 报关 / 货代' },
      step2: { title: '智能调度', desc: '自动分配到相关业务单元' },
      step3: { title: '现场执行', desc: '通过WhatsApp更新' },
      step4: { title: '智能塔', desc: '实时监控所有业务单元' },
      flowDesc: '<span class="text-white font-bold tracking-wide">生态系统流程：</span>来自<span class="text-indigo-400 font-bold">4大业务单元</span>的订单（运输、仓储、报关、货代）→ <span class="text-cyan-400 font-bold">智能调度</span>（自动分配到相关业务单元）→ <span class="text-emerald-400 font-bold">通过WhatsApp现场执行</span>（实时状态更新）→ <span class="text-amber-400 font-bold">智能塔</span>（从一个屏幕监控所有运营）。',
    },
    cta: {
      badge: '联系我们',
      title: '准备好编排您的物流了吗？',
      subtitle: '为您的公司安排Sentralogis演示——运输、仓储、报关和货代，尽在一个平台。通过邮件联系我们。',
      emailLabel: '官方合作伙伴联系方式',
      copySuccess: '已复制！',
    },
    footer: {
      copyright: '© 2026 Sentralogis.com | Powered by MBsolutions. 保留所有权利。',
    },
    landing: {
      heroBadge: 'ENTERPRISE OPERATING SYSTEM v2.0',
      heroTitle: '企业操作系统',
      heroHighlight: '现代物流而生',
      heroSubtitle: '一个平台连接运输、仓储、货代、报关、Exchange、Capital、客户成功、智能和AI。',
      heroCTA: '申请企业演示',
      heroCTA2: '观看愿景',
      whyBadge: '为什么选择SENTRALOGIS',
      whyTitle: '传统系统',
      whyHighlight: '互不连接',
      whyTraditionalHead: '传统',
      whyTraditionalList: ['TMS', 'WMS', 'ERP', 'CRM', 'Spreadsheet', 'Email', 'WhatsApp'],
      whyTraditionalTags: ['互不连接', '被动响应', '信息孤岛', '缓慢'],
      whySentralogisHead: 'Sentralogis',
      whySentralogisList: ['互联', '智能', '协作', 'AI驱动', '企业就绪'],
      archBadge: '架构',
      archTitle: '企业',
      archHighlight: '操作系统',
      archCenter: '业务\n能力',
      archDomains: ['运营', 'Exchange', 'Capital', '客户成功', '智能', 'AI Copilot'],
      opsBadge: '运营',
      opsTitle: '运营',
      opsHighlight: '平台',
      opsCapabilities: ['运输', '仓储', '货代', '报关', '集装箱', '货运', '库存', '追踪', '车队', '司机'],
      opsFooter: '运营工作空间 · 运营日志',
      aiBadge: 'AI劳动力',
      aiTitle: 'AI数字',
      aiHighlight: '劳动力',
      aiWorkforce: [
        { name: 'AI调度员', desc: '智能路线与负载分配' },
        { name: 'AI仓库规划师', desc: '最优存储与上架' },
        { name: 'AI文档助手', desc: '自动生成运输文件' },
        { name: 'AI客户助手', desc: '全天候查询与追踪' },
        { name: 'AI财务副驾', desc: '发票与支付自动化' },
        { name: 'AI风险顾问', desc: '预测并缓解中断' },
        { name: 'AI知识代理', desc: '按需获取机构知识' },
        { name: 'AI决策助手', desc: '数据驱动的建议' },
      ],
      knowBadge: '知识',
      knowTitle: '知识',
      knowHighlight: '平台',
      knowItems: [
        { label: '运营日志', desc: '每个事件。每个决策。记录在案。' },
        { label: '经验教训', desc: '从真实运营中持续改进' },
        { label: '企业知识', desc: '机构记忆。永不丢失。' },
        { label: '业务事件', desc: '跨所有领域的实时事件流' },
        { label: '对话', desc: '聊天作为业务对象。可追踪。' },
        { label: '持续学习', desc: 'AI从您的运营模式中学习' },
      ],
      intelBadge: '智能',
      intelTitle: '企业',
      intelHighlight: '智能',
      intelMetrics: ['业务健康评分', '运营健康', '客户健康', '财务健康', '网络健康', '预测分析'],
      ecoBadge: '生态',
      ecoTitle: '互联',
      ecoHighlight: '生态系统',
      ecoRoles: ['客户', '承运商', '仓储', '货代', '航运公司', '航空公司', '报关', '政府', '银行', '保险', '市场', 'AI'],
      ecoFooter: '万物互联。',
      roadBadge: '路线图',
      roadTitle: '演进',
      roadHighlight: '路线图',
      roadSteps: ['数字基础', '互联企业', '智能企业', '自主企业', '物流网络平台'],
      ctaBadge: '开始',
      ctaTitle: '构建物流\n的未来',
      ctaSubtitle: '不要再买另一个软件了。在Sentralogis上构建您的企业。',
      ctaEmailLabel: '联系我们的团队',
      ctaCopyEmail: '复制邮箱',
      ctaCopied: '已复制！',
      ctaRequestDemo: '申请企业演示 →',
      footerTagline: 'Sentralogis',
      footerLinks: ['产品', '解决方案', '架构', '安全', '开发者', '公司', '联系我们'],
      footerCopyright: '© 2026 Sentralogis',
    },
    wo: {
      workOrder: '工作订单',
      live: '实时',
      customerInfo: '客户信息',
      customer: '客户',
      woNumber: 'WO 编号',
      status: '状态',
      location: '位置',
      lastUpdate: '最后更新',
      allJobOrders: '所有工作订单',
      filterTab: { all: '全部', active: '活跃', completed: '已完成', pending: '待办' },
      statusLabels: {
        waitingLoad: '等待装载',
        loading: '正在装载',
        enRoute: '运输中',
        unloading: '正在卸载',
        completed: '已完成'
      },
      noData: '暂无工作订单数据',
      selectJo: '选择工作订单以查看详情'
    },
    sidebar: {
      'Work Order': '工作订单',
      'Job Order': '任务订单',
      'Mission Radar': '任务雷达',
      'Intelligence Tower': '智能塔',
      'Master Data': '主数据',
      'Finance Matrix': '财务矩阵',
      'AR = Invoicing': '应收发票',
      'AP = Purchase': '成本审计',
      'Organization': '组织',
      'Users': '用户',
      'Settings': '设置',
      'Trucking': '运输',
      'Warehouse': '仓储',
      'Clearance': '报关',
      'Forwarding': '货代',
      'Reporting': '报告',
      'Dashboard': '仪表盘',
      'Profile': '个人资料'
    },
    navbar: {
      systemOnline: '系统在线',
      poweredBy: '技术支持',
      robotChat: '机器人聊天',
      notifications: '通知',
      new: '新',
      markAllRead: '标为已读',
      noNewNotif: '没有新通知',
      viewAll: '查看所有通知',
      profile: '个人资料',
      logout: '登出',
      justNow: '刚刚'
    }
  },
};
