export type Locale = 'id' | 'en' | 'zh';

export const translations: Record<Locale, {
  nav: {
    beranda: string;
    fitur: string;
    kontak: string;
    login: string;
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
}> = {
  id: {
    nav: {
      beranda: 'BERANDA',
      fitur: 'FITUR & EKOSISTEM',
      kontak: 'KONTAK',
      login: 'PORTAL LOGIN',
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
  },
  en: {
    nav: {
      beranda: 'HOME',
      fitur: 'FEATURES & ECOSYSTEM',
      kontak: 'CONTACT',
      login: 'PORTAL LOGIN',
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
  },
  zh: {
    nav: {
      beranda: '首页',
      fitur: '功能与生态',
      kontak: '联系我们',
      login: '登录门户',
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
  },
};
