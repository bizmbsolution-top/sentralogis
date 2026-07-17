export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  tags: string[];
  answer: string;
  href?: string;
  hrefLabel?: string;
  pagePaths?: string[];
  roles?: string[]; // Allowed roles (e.g., 'CS', 'HQ', 'TENANT_ADMIN', 'TRUCKING', 'WAREHOUSE', 'DRIVER', 'FINANCE', 'COMMON')
}

export const helpTopics: HelpTopic[] = [
  // ==========================================
  // CS / HQ TOPICS (SESUAI MENU SIDEBAR ROLE CS)
  // ==========================================
  {
    id: "hq-work-order",
    title: "Cara Membuat Work Order Baru HQ",
    description: "Panduan membuat Work Order dari HQ dan assign ke SBU yang sesuai.",
    tags: ["work order", "wo", "buat wo", "assign", "hq", "sbu assignment", "cs", "customer service"],
    answer:
      "Di menu HQ > Work Orders (/hq/work-orders), klik tombol 'Buat Work Order Baru' atau gunakan tombol form di bawah ini. Lengkapi informasi pelanggan, jenis layanan, lokasi asal & tujuan, serta jadwal. Setelah tersimpan, pilih SBU tujuan (Trucking, Warehouse, Clearance, Forwarding) lalu tekan 'Kirim ke SBU' agar tim operasional menerima tugas tersebut.",
    href: "/hq/work-orders?action=create",
    hrefLabel: "⚡ Langsung Buka Form Buat WO",
    pagePaths: ["/hq/work-orders"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "cs-handover",
    title: "Cara Menangani & Approve Handover SBU",
    description: "Memeriksa dan menyetujui permintaan penyerahan tugas (handover) antar SBU.",
    tags: ["handover", "serah terima", "cs", "hq", "approval", "transfer sbu", "pending"],
    answer:
      "Ketika SBU menyelesaikan tahapannya (misalnya Trucking tiba di gudang), SBU akan mengajukan status Handover. Tim CS/HQ dapat membuka tab 'Handover Pending' di menu HQ Work Orders, memeriksa dokumen bukti (POD/BAST), dan klik 'Approve Handover' untuk melanjutkan tugas ke SBU berikutnya.",
    href: "/hq/work-orders?status=handover_pending",
    hrefLabel: "⚡ Buka Handover Pending",
    pagePaths: ["/hq/work-orders"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "cs-wo-tracking",
    title: "Cara Lacak Status Multi-SBU Work Order",
    description: "Memantau perkembangan progres pengerjaan JO di seluruh SBU secara real-time.",
    tags: ["lacak", "tracking", "status wo", "progress", "cs", "radar", "monitoring"],
    answer:
      "Untuk melihat progres lengkap sebuah Work Order, klik nomor WO di daftar Work Orders (/hq/work-orders). Anda akan masuk ke halaman pelacakan detail yang menampilkan milestone waktu dari setiap SBU (Trucking, Warehouse, Clearance, Forwarding) beserta koordinat armada dan foto bukti lampiran.",
    href: "/hq/work-orders",
    hrefLabel: "🚀 Buka Daftar Work Orders",
    pagePaths: ["/hq/work-orders", "/track"],
    roles: ["CS", "HQ", "ADMIN", "COMMON"],
  },
  {
    id: "hq-job-order",
    title: "Pantau & Audit Job Order dari HQ",
    description: "Memantau seluruh Job Order (tugas operasional) trucking/warehouse dari level HQ.",
    tags: ["job order", "jo", "audit jo", "trucking jo", "warehouse jo", "hq", "cs"],
    answer:
      "Buka menu HQ > Job Orders (/hq/job-orders) untuk memantau status penugasan armada dan operator di seluruh cabang SBU. Anda juga dapat memeriksa lampiran bukti pengiriman (POD), status verifikasi dokumen, maupun riwayat aktivitas armada dari halaman ini.",
    href: "/hq/job-orders",
    hrefLabel: "🚀 Buka Daftar Job Orders HQ",
    pagePaths: ["/hq/job-orders"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-ops-command",
    title: "Pantau Ops Command Center & Exception Dashboard",
    description: "Panduan melihat kendala operasional (Exceptions) dan monitoring keterlambatan secara real-time.",
    tags: ["ops command", "ops dashboard", "exception", "kendala", "keterlambatan", "alert", "cs", "hq"],
    answer:
      "Buka menu Ops Command (/hq/ops-dashboard) untuk melihat notifikasi kendala operasional, insiden keterlambatan armada, atau masalah dokumen secara real-time. Anda dapat mengklik setiap kendala untuk melakukan tindakan eskalasi atau komunikasi langsung dengan tim SBU bersangkutan.",
    href: "/hq/ops-dashboard",
    hrefLabel: "🚀 Buka Ops Command Center",
    pagePaths: ["/hq/ops-dashboard"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-executive-suite",
    title: "Lihat Executive Suite & Ringkasan Kinerja Bisnis",
    description: "Menganalisis pendapatan, margin profit, dan volume pengiriman seluruh SBU.",
    tags: ["executive", "business", "kpi", "pendapatan", "revenue", "profit", "sbu", "hq", "cs"],
    answer:
      "Di menu HQ > Executive Suite (/hq/business), Anda dapat melihat indikator bisnis utama (KPI), grafik volume pengiriman bulanan, serta kontribusi pendapatan dari masing-masing SBU (Trucking, Warehouse, Clearance, Forwarding) untuk evaluasi manajemen.",
    href: "/hq/business",
    hrefLabel: "🚀 Buka Executive Suite",
    pagePaths: ["/hq/business"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-mission-radar",
    title: "Pantau Mission Radar & Live Tracking SBU",
    description: "Pelacakan koordinat GPS armada dan aktivitas misi SBU secara langsung dari menara kontrol HQ.",
    tags: ["radar", "mission radar", "live tracking", "gps", "armada", "tracking", "tower", "hq", "cs"],
    answer:
      "Buka menu HQ > Mission Radar (/hq/sbu-activities) untuk memantau pergerakan armada truk secara live di peta interaktif, mengecek status muatan kargo, serta melihat estimasi waktu tiba (ETA) di lokasi pelanggan.",
    href: "/hq/sbu-activities",
    hrefLabel: "🚀 Buka Mission Radar HQ",
    pagePaths: ["/hq/sbu-activities"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-driver-fleet-perf",
    title: "Evaluasi Performa Driver & Armada dari HQ",
    description: "Memeriksa rapor kinerja pengemudi, ketepatan waktu pengantaran, serta keandalan armada.",
    tags: ["driver performance", "fleet performance", "rapor driver", "kinerja supir", "evaluasi", "hq", "cs"],
    answer:
      "Buka menu HQ > Driver Performance (/hq/driver-performance) atau Fleet Performance (/hq/fleet-performance) untuk mengevaluasi skor kedisiplinan supir, konsumsi bahan bakar, serta tingkat keberhasilan pengiriman tepat waktu (On-Time Delivery Rate).",
    href: "/hq/driver-performance",
    hrefLabel: "🚀 Buka Driver Performance",
    pagePaths: ["/hq/driver-performance", "/hq/fleet-performance"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-finance-summary",
    title: "Pantau Finance Summary & Keuangan Multi-SBU",
    description: "Ringkasan kas, piutang (AR), hutang (AP), dan profitabilitas operasional SBU.",
    tags: ["finance summary", "keuangan", "ar", "ap", "profitabilitas", "kas", "hq", "cs", "finance matrix"],
    answer:
      "Di menu HQ > Finance Matrix > Finance Summary (/hq/finance/summary), tim CS/HQ dan keuangan dapat memantau kesehatan kas SBU, proyeksi arus kas masuk dari tagihan pelanggan, serta kewajiban pembayaran kepada vendor/mitra.",
    href: "/hq/finance/summary",
    hrefLabel: "🚀 Buka Finance Summary",
    pagePaths: ["/hq/finance/summary"],
    roles: ["CS", "HQ", "FINANCE", "ADMIN"],
  },
  {
    id: "hq-invoice-customer",
    title: "Kelola AR (Invoicing Customer) & Penagihan HQ",
    description: "Membuat invoice tagihan pelanggan, melampirkan POD/Surat Jalan, dan melacak pelunasan.",
    tags: ["invoice", "ar", "invoicing customer", "tagihan", "penagihan", "pod", "hq", "cs", "finance matrix"],
    answer:
      "Buka menu HQ > Finance Matrix > AR = Invoicing (/hq/invoice-customer) untuk menerbitkan invoice resmi kepada customer. Sistem akan otomatis merekap seluruh Job Order yang telah selesai (Delivered) dan melampirkan bukti pengiriman digital (E-POD).",
    href: "/hq/invoice-customer",
    hrefLabel: "🚀 Buka Invoicing Customer HQ",
    pagePaths: ["/hq/invoice-customer"],
    roles: ["CS", "HQ", "FINANCE", "ADMIN"],
  },
  {
    id: "hq-cost-audit",
    title: "Audit Biaya Operasional & AP (Purchase) Vendor",
    description: "Memverifikasi pengajuan biaya jalan supir (klaim BBM/Tol) dan tagihan sub-kontraktor.",
    tags: ["cost audit", "ap", "purchase", "audit biaya", "klaim bbm", "klaim tol", "vendor", "hq", "cs"],
    answer:
      "Buka menu HQ > Finance Matrix > AP = Purchase (/hq/finance/cost-audit) untuk memeriksa keabsahan struk pengeluaran supir di perjalanan maupun tagihan dari mitra ekspedisi vendor sebelum disetujui untuk pencairan dana.",
    href: "/hq/finance/cost-audit",
    hrefLabel: "🚀 Buka Cost Audit HQ",
    pagePaths: ["/hq/finance/cost-audit"],
    roles: ["CS", "HQ", "FINANCE", "ADMIN"],
  },
  {
    id: "hq-master-contacts",
    title: "Buat & Kelola Kontak Pelanggan / Vendor (Master Contacts)",
    description: "Menambahkan data pengirim (Shipper), penerima (Consignee), atau mitra vendor ke dalam sistem.",
    tags: ["kontak", "contacts", "customer", "vendor", "shipper", "consignee", "master data", "cs", "hq"],
    answer:
      "Buka menu HQ > Master Data > Contacts (/hq/master/contacts) atau klik tombol form di bawah. Tekan tombol 'Tambah Kontak', pilih tipe kontak (Customer/Vendor/Mitra), lengkapi alamat detail, koordinat lokasi, dan informasi penanggung jawab (PIC).",
    href: "/hq/master/contacts?action=create",
    hrefLabel: "⚡ Langsung Buka Form Kontak Baru",
    pagePaths: ["/hq/master/contacts"],
    roles: ["CS", "HQ", "ADMIN", "TENANT_ADMIN"],
  },
  {
    id: "hq-master-locations",
    title: "Buat & Kelola Titik Lokasi & Gudang (Master Locations)",
    description: "Mendaftarkan koordinat lokasi pabrik, pelabuhan, atau gudang tujuan pengiriman.",
    tags: ["lokasi", "locations", "titik bongkar", "titik muat", "master data", "cs", "hq", "geofence"],
    answer:
      "Di menu HQ > Master Data > Locations (/hq/master/locations), Anda bisa menambahkan titik lokasi pengiriman baru dengan mengisi nama lokasi, alamat lengkap, radius geofencing, serta petunjuk khusus bagi driver saat melakukan bongkar/muat.",
    href: "/hq/master/locations?action=create",
    hrefLabel: "⚡ Langsung Buka Form Lokasi",
    pagePaths: ["/hq/master/locations"],
    roles: ["CS", "HQ", "ADMIN", "TENANT_ADMIN"],
  },
  {
    id: "hq-master-services",
    title: "Kelola Master Layanan & Tarif Biaya (Services & Charges)",
    description: "Mengatur daftar layanan logistik (FTL/LTL/WMS) serta referensi harga standar.",
    tags: ["layanan", "services", "charges", "tarif", "harga", "master data", "cs", "hq"],
    answer:
      "Buka menu HQ > Master Data > Services & Charges (/hq/master/services) untuk menetapkan katalog layanan SBU beserta komponen biaya standar yang akan digunakan otomatis saat pembuatan Work Order maupun Quotation penawaran.",
    href: "/hq/master/services",
    hrefLabel: "🚀 Buka Master Services",
    pagePaths: ["/hq/master/services"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-master-drivers-fleets",
    title: "Kelola Master Armada & Supir dari HQ",
    description: "Mendaftarkan supir baru, truk armada, dan tipe kendaraan dari pusat HQ.",
    tags: ["master supir", "master driver", "master armada", "fleets", "fleet types", "cs", "hq", "master data"],
    answer:
      "Buka menu HQ > Master Data > Drivers (/hq/master/drivers) atau Fleets (/hq/master/fleets) untuk mendaftarkan armada dan pengemudi yang bertugas. Anda dapat mengatur nomor polisi, masa berlaku STNK/KIR, hingga SIM driver.",
    href: "/hq/master/drivers?action=create",
    hrefLabel: "⚡ Langsung Buka Form Tambah Driver",
    pagePaths: ["/hq/master/drivers", "/hq/master/fleets", "/hq/master/fleet-types"],
    roles: ["CS", "HQ", "ADMIN"],
  },
  {
    id: "hq-master-products",
    title: "Buat & Kelola Master Produk / SKU Gudang (HQ)",
    description: "Mendaftarkan barang/SKU baru beserta spesifikasi berat, dimensi, dan barcode untuk WMS.",
    tags: ["master produk", "products", "sku", "barang", "wms", "gudang", "cs", "hq"],
    answer:
      "Di menu HQ > Warehouse > Master Products (/hq/master-data/products), klik tombol form untuk mendaftarkan SKU baru. Masukkan kode barang, nama, kategori, satuan (UOM), dimensi (P x L x T), dan harga standar.",
    href: "/hq/master-data/products?action=create",
    hrefLabel: "⚡ Langsung Buka Form Tambah Produk",
    pagePaths: ["/hq/master-data/products"],
    roles: ["CS", "HQ", "WAREHOUSE", "ADMIN"],
  },
  {
    id: "hq-master-categories",
    title: "Kelola Kategori Produk & Satuan UOM Gudang (HQ)",
    description: "Mengelompokkan barang ke dalam kategori tertentu dan mendefinisikan satuan konversi (UOM).",
    tags: ["categories", "kategori", "uom", "satuan", "master gudang", "cs", "hq"],
    answer:
      "Buka menu HQ > Warehouse > Master Categories (/hq/master-data/categories) untuk membuat grup barang, atau Master UOM (/hq/master-data/uoms) untuk mengatur konversi satuan pengemasan barang gudang (Pcs / Box / Pallet).",
    href: "/hq/master-data/categories?action=create",
    hrefLabel: "⚡ Langsung Buka Form Kategori",
    pagePaths: ["/hq/master-data/categories", "/hq/master-data/uoms"],
    roles: ["CS", "HQ", "WAREHOUSE", "ADMIN"],
  },
  {
    id: "hq-warehouse-monitoring",
    title: "Monitoring Inbound & Outbound Gudang dari HQ",
    description: "Memantau jadwal barang masuk (Inbound) dan barang keluar (Outbound) di seluruh gudang SBU.",
    tags: ["warehouse monitoring", "inbound hq", "outbound hq", "gudang hq", "monitoring wms", "cs", "hq"],
    answer:
      "Sebagai tim CS/HQ, Anda dapat mengawasi aktivitas gudang melalui menu HQ > Warehouse > Inbound (/hq/warehouse/inbound) atau Outbound (/hq/warehouse/outbound) untuk memastikan ketepatan waktu bongkar muat dan kesiapan dokumen BAST.",
    href: "/hq/warehouse/inbound",
    hrefLabel: "🚀 Buka Monitoring Inbound HQ",
    pagePaths: ["/hq/warehouse/inbound", "/hq/warehouse/outbound", "/hq/warehouse"],
    roles: ["CS", "HQ", "WAREHOUSE", "ADMIN"],
  },
  {
    id: "hq-warehouse-inventory",
    title: "Cek Stok Inventory & Log Pergerakan Barang HQ",
    description: "Memeriksa ketersediaan stok fisik secara real-time, lokasi rak/bin, dan mutasi barang.",
    tags: ["inventory hq", "stok gudang", "movements", "transfers", "customer stock", "cs", "hq"],
    answer:
      "Buka menu HQ > Warehouse > Inventory (/hq/warehouse/inventory) atau Movements (/hq/warehouse/movements) untuk melacak jumlah stok barang pelanggan yang tersedia saat ini, kartu stok (Stock Card), serta riwayat pemindahan antar rak.",
    href: "/hq/warehouse/inventory",
    hrefLabel: "🚀 Buka Inventory HQ",
    pagePaths: ["/hq/warehouse/inventory", "/hq/warehouse/movements", "/hq/warehouse/transfers", "/hq/warehouse/customer-stock"],
    roles: ["CS", "HQ", "WAREHOUSE", "ADMIN"],
  },
  {
    id: "hq-reporting",
    title: "Pusat Laporan (Reporting) Eksekutif & Operasional",
    description: "Mengunduh rekapitulasi data pengiriman, kinerja SLA, utilisasi armada, dan laporan keuangan.",
    tags: ["reporting", "laporan", "rekap", "excel", "pdf", "audit", "cs", "hq"],
    answer:
      "Di menu HQ > Reporting (/hq/reporting), Anda dapat memilih berbagai jenis laporan operasional maupun finansial sesuai periode tanggal yang diinginkan, kemudian mengunduhnya dalam format Excel (XLSX) atau PDF untuk keperluan audit manajemen.",
    href: "/hq/reporting",
    hrefLabel: "🚀 Buka Pusat Laporan HQ",
    pagePaths: ["/hq/reporting"],
    roles: ["CS", "HQ", "ADMIN", "FINANCE", "TENANT_ADMIN", "COMMON"],
  },

  // ==========================================
  // TENANT ADMIN / OWNER TOPICS
  // ==========================================
  {
    id: "tenant-sbu",
    title: "Aktifkan dan Kelola SBU Tenant",
    description:
      "Buka pengaturan SBU tenant untuk mengaktifkan layanan Trucking, Warehouse, Clearance, atau Forwarding.",
    tags: ["aktifkan", "sbu", "tenant", "aktifkan sbu", "sbu tenant", "role", "admin"],
    answer:
      "Buka menu Tenant > SBU. Pilih SBU yang ingin diaktifkan (misalnya Trucking atau Warehouse), lalu simpan konfigurasi. SBU yang aktif otomatis akan muncul di panel sidebar bagi staff yang memiliki hak akses.",
    href: "/tenant/sbu",
    hrefLabel: "Buka Tenant SBU",
    pagePaths: ["/tenant", "/tenant/sbu"],
    roles: ["TENANT_ADMIN", "OWNER"],
  },
  {
    id: "tenant-staff",
    title: "Tambah Staff dan Atur Role Tenant",
    description:
      "Kelola pengguna tenant, role, dan akses SBU langsung dari halaman Staff Tenant.",
    tags: ["staff", "pegawai", "role", "akses", "tenant staff", "user", "admin"],
    answer:
      "Buka Tenant > Staff. Klik 'Tambah Staff', masukkan nama dan WhatsApp ID/Email, lalu pilih perannya (misalnya CS HQ, SBU Trucking Dispatcher, atau Warehouse Operator). Atur juga akses cabang atau gudang tempat staff tersebut bertugas.",
    href: "/tenant/staff?action=create",
    hrefLabel: "⚡ Langsung Buka Form Tambah Staff",
    pagePaths: ["/tenant", "/tenant/staff"],
    roles: ["TENANT_ADMIN", "OWNER"],
  },
  {
    id: "tenant-topup",
    title: "Top-up Saldo Token (TKN)",
    description: "Panduan mengisi ulang token energi agar Work Order dan Job Order dapat terus berjalan.",
    tags: ["token", "topup", "tkn", "saldo", "energi", "tenant", "liquidity"],
    answer:
      "Setiap eksekusi Job Order membutuhkan reservasi token. Jika saldo token Anda di bawah 5 TKN atau habis, buka menu Tenant > Topup, pilih nominal paket token yang diinginkan, dan lakukan konfirmasi pembayaran.",
    href: "/tenant/topup",
    hrefLabel: "Buka Top-up Token",
    pagePaths: ["/tenant", "/tenant/topup"],
    roles: ["TENANT_ADMIN", "OWNER"],
  },

  // ==========================================
  // SBU TRUCKING / DISPATCHER TOPICS
  // ==========================================
  {
    id: "sbu-trucking-jo",
    title: "Buat Job Order Trucking & Assign Armada (SBU)",
    description:
      "Buat JO trucking dengan driver, fleet, pickup, dan delivery point dari modul SBU Trucking.",
    tags: [
      "jo",
      "job order",
      "trucking",
      "driver",
      "fleet",
      "pickup",
      "delivery",
      "dispatcher",
    ],
    answer:
      "Di menu SBU Trucking > Work Orders / JO, pilih tugas yang masuk dari HQ lalu klik 'Assign / Buat JO'. Pilih supir dan armada dari daftar FMS yang tersedia (Ready), tentukan rute pengiriman, dan tekan 'Submit Job Order'. Supir akan langsung menerima notifikasi di Driver Portal.",
    href: "/sbu/trucking/work-orders?action=create",
    hrefLabel: "⚡ Langsung Buka Form Assign JO",
    pagePaths: [
      "/sbu/trucking",
      "/sbu/trucking/work-orders",
      "/sbu/trucking/assignments",
    ],
    roles: ["TRUCKING", "SBU_TRUCKING", "DISPATCHER"],
  },
  {
    id: "sbu-trucking-fleet",
    title: "Kelola Status Kesiapan Armada (FMS SBU Trucking)",
    description: "Memantau armada truk yang siap jalan (Ready), dalam tugas (On Mission), atau maintenance.",
    tags: ["fms", "armada", "fleet", "truk", "maintenance", "ready", "trucking"],
    answer:
      "Buka menu SBU Trucking > Fleet Manajemen. Di sini Anda dapat memantau seluruh truk milik tenant maupun vendor. Jika ada armada yang sedang pemeliharaan rutin, ubah statusnya menjadi 'Maintenance' agar tidak teralokasikan pada tugas baru.",
    href: "/sbu/trucking/fleet",
    hrefLabel: "Kelola Armada Fleet",
    pagePaths: ["/sbu/trucking/fleet"],
    roles: ["TRUCKING", "SBU_TRUCKING", "DISPATCHER"],
  },

  // ==========================================
  // SBU WAREHOUSE / GUDANG TOPICS
  // ==========================================
  {
    id: "warehouse-inbound",
    title: "Proses Penerimaan Inbound Gudang (SBU Warehouse)",
    description: "Terima inbound di SBU Warehouse, hitung kuantitas, dan atur lokasi penyimpanan rak.",
    tags: ["inbound", "warehouse", "terima", "gudang", "stock", "receipt", "putaway"],
    answer:
      "Di menu SBU Warehouse > Inbound, pilih pengiriman yang tiba di gudang. Lakukan proses Tally atau penerimaan barang, cocokkan kuantitas fisik dengan dokumen surat jalan, lalu pilih lokasi rak penyimpanan (Zone / Rak / Bin) dan simpan Inbound Receipt.",
    href: "/sbu/warehouse/inbound?action=create",
    hrefLabel: "⚡ Langsung Buka Form Inbound",
    pagePaths: ["/sbu/warehouse", "/sbu/warehouse/inbound"],
    roles: ["WAREHOUSE", "SBU_WAREHOUSE"],
  },
  {
    id: "warehouse-outbound",
    title: "Proses Pengeluaran & Picking Outbound (SBU Warehouse)",
    description: "Menyiapkan barang keluar (Picking/Packing) dan mencetak Berita Acara Serah Terima (BAST).",
    tags: ["outbound", "picking", "packing", "bast", "gudang", "warehouse", "keluar"],
    answer:
      "Buka menu SBU Warehouse > Outbound. Pilih Work Order pengeluaran, lakukan proses Picking sesuai daftar lokasi SKU, dan konfirmasi barang siap dimuat. Klik tombol 'Print BAST Outbound' untuk diserahkan kepada supir armada jemputan.",
    href: "/sbu/warehouse/outbound?action=create",
    hrefLabel: "⚡ Langsung Buka Form Outbound",
    pagePaths: ["/sbu/warehouse/outbound"],
    roles: ["WAREHOUSE", "SBU_WAREHOUSE"],
  },
  {
    id: "warehouse-stock-opname",
    title: "Cara Stock Opname & Penyesuaian Stok (SBU Warehouse)",
    description: "Melakukan audit penghitungan fisik stok gudang dan mencatat selisih (discrepancy).",
    tags: ["stock opname", "audit", "stok", "discrepancy", "inventory", "gudang", "warehouse"],
    answer:
      "Buka menu SBU Warehouse > Stock Opname. Klik 'Buat Opname Baru', pilih zona atau kategori barang yang ingin diperiksa. Masukkan hasil penghitungan aktual di lapangan. Jika terdapat selisih antara sistem dan fisik, sistem akan mencatat penyesuaian stok setelah disetujui.",
    href: "/sbu/warehouse/stock-opname?action=create",
    hrefLabel: "⚡ Langsung Buka Form Stock Opname",
    pagePaths: ["/sbu/warehouse/stock-opname"],
    roles: ["WAREHOUSE", "SBU_WAREHOUSE"],
  },

  // ==========================================
  // DRIVER PORTAL TOPICS
  // ==========================================
  {
    id: "driver-portal",
    title: "Panduan Driver Portal & Status JO (Supir)",
    description:
      "Informasi status JO untuk driver dan bagaimana mengupload bukti pengiriman.",
    tags: ["driver", "portal", "status", "pod", "picking", "delivered", "supir"],
    answer:
      'Driver portal menampilkan status JO secara real-time. Status "PICKING_UP" berarti driver sedang menuju lokasi jemput, sedangkan "DELIVERED" berarti pengiriman tiba di tujuan. Klik tombol foto untuk mengunggah bukti Surat Jalan / POD langsung dari kamera HP.',
    href: "/driver/portal",
    hrefLabel: "Buka Driver Portal",
    pagePaths: ["/driver/portal"],
    roles: ["DRIVER", "SUPIR"],
  },

  // ==========================================
  // FINANCE & INVOICE TOPICS (TENANT / SBU)
  // ==========================================
  {
    id: "finance-invoice",
    title: "Verifikasi Invoice & Tagihan Pelanggan (Tenant Invoice)",
    description:
      "Temukan invoice customer/vendor di tingkat Tenant dan verifikasi tagihan yang masuk.",
    tags: ["invoice", "billing", "finance", "tagihan", "verifikasi", "payment", "akuntansi"],
    answer:
      "Buka menu Tenant > Invoice atau SBU Trucking > Finances untuk melihat daftar tagihan customer dan vendor. Periksa kelengkapan lampiran POD, perhitungan PPN/PPh, serta status pelunasan sebelum melakukan approval pembayaran.",
    href: "/tenant/invoice",
    hrefLabel: "Buka Modul Invoice",
    pagePaths: [
      "/tenant/invoice",
      "/sbu/trucking/finances",
    ],
    roles: ["FINANCE", "ACCOUNTING", "TENANT_ADMIN"],
  },
];

export const defaultPopularTopics = [
  helpTopics[0], // hq-work-order
  helpTopics[1], // cs-handover
  helpTopics[2], // cs-wo-tracking
  helpTopics[4], // hq-ops-command
];

export function getPageHelpTopics(pathname: string) {
  return helpTopics.filter((topic) =>
    topic.pagePaths?.some((path) => pathname.startsWith(path)),
  );
}

/**
 * Filter topics strictly by user role or profile info so no unrelated topics leak
 */
export function getTopicsByRole(role?: string) {
  if (!role) return helpTopics;
  const upper = role.toUpperCase();
  
  // Categorize role
  const isCS = upper.includes("CS") || upper.includes("HQ") || upper === "CUSTOMER_SERVICE";
  const isTenantAdmin = upper.includes("ADMIN") || upper.includes("OWNER") || upper.includes("SUPERADMIN");
  const isTrucking = upper.includes("TRUCKING") || upper.includes("DISPATCH") || (upper.includes("OPS") && !upper.includes("WAREHOUSE"));
  const isWarehouse = upper.includes("WAREHOUSE") || upper.includes("GUDANG") || upper.includes("WMS");
  const isDriver = upper.includes("DRIVER") || upper.includes("SUPIR");
  const isFinance = upper.includes("FINANCE") || upper.includes("INVOICE") || upper.includes("ACCOUNTING");

  return helpTopics.filter((topic) => {
    if (!topic.roles || topic.roles.includes("COMMON")) return true;
    if (isCS && (topic.roles.includes("CS") || topic.roles.includes("HQ"))) return true;
    if (isTenantAdmin && (topic.roles.includes("TENANT_ADMIN") || topic.roles.includes("ADMIN") || topic.roles.includes("OWNER"))) return true;
    if (isTrucking && (topic.roles.includes("TRUCKING") || topic.roles.includes("SBU_TRUCKING") || topic.roles.includes("DISPATCHER"))) return true;
    if (isWarehouse && (topic.roles.includes("WAREHOUSE") || topic.roles.includes("SBU_WAREHOUSE"))) return true;
    if (isDriver && (topic.roles.includes("DRIVER") || topic.roles.includes("SUPIR"))) return true;
    if (isFinance && (topic.roles.includes("FINANCE") || topic.roles.includes("ACCOUNTING"))) return true;
    
    // Also check direct match
    return topic.roles.some(r => upper.includes(r));
  });
}
