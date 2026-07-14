export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  tags: string[];
  answer: string;
  href?: string;
  hrefLabel?: string;
  pagePaths?: string[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: "tenant-sbu",
    title: "Aktifkan dan kelola SBU",
    description:
      "Buka pengaturan SBU tenant untuk mengaktifkan layanan Trucking, Warehouse, Clearance, atau Forwarding.",
    tags: ["aktifkan", "sbu", "tenant", "aktifkan sbu", "sbu tenant", "role"],
    answer:
      "Buka menu Tenant > SBU. Pilih SBU yang ingin diaktifkan, lalu simpan. Jika kamu belum melihat menu SBU di tenant, pastikan kamu memiliki role Tenant Admin dan tenant sudah selesai setup.",
    href: "/dashboard/tenant/sbu",
    hrefLabel: "Buka Tenant SBU",
    pagePaths: ["/dashboard/tenant", "/dashboard/tenant/sbu"],
  },
  {
    id: "tenant-staff",
    title: "Tambah staff dan atur role",
    description:
      "Kelola pengguna tenant, role, dan akses SBU langsung dari halaman Staff Tenant.",
    tags: ["staff", "pegawai", "role", "akses", "tenant staff", "user"],
    answer:
      "Buka Tenant > Staff. Tambah staff baru dengan data lengkap, pilih role, lalu atur akses SBU atau warehouse. Gunakan role khusus untuk operator SBU dan hubungkan ke tenant.",
    href: "/dashboard/tenant/staff",
    hrefLabel: "Kelola Tenant Staff",
    pagePaths: ["/dashboard/tenant", "/dashboard/tenant/staff"],
  },
  {
    id: "hq-work-order",
    title: "Buat Work Order HQ",
    description: "Buat Work Order dari HQ dan assign ke SBU yang sesuai.",
    tags: ["work order", "wo", "buat wo", "assign", "hq", "sbu assignment"],
    answer:
      "Di menu HQ > Work Orders, klik tombol buat baru. Isi jenis layanan, lokasi, dan detail order. Setelah itu pilih SBU tujuan (Trucking, Warehouse, Clearance, Forwarding) dan simpan.",
    href: "/dashboard/hq/work-orders",
    hrefLabel: "Buka HQ Work Orders",
    pagePaths: ["/dashboard/hq/work-orders"],
  },
  {
    id: "sbu-trucking-jo",
    title: "Buat Job Order Trucking",
    description:
      "Buat JO trucking dengan driver, fleet, pickup, dan delivery point.",
    tags: [
      "jo",
      "job order",
      "trucking",
      "driver",
      "fleet",
      "pickup",
      "delivery",
    ],
    answer:
      "Di SBU Trucking, buka halaman Job Orders atau Work Orders lalu buat JO baru. Pilih layanan trucking, ketik data pickup dan delivery, lalu pilih driver/fleet dan submit.",
    href: "/dashboard/sbu/trucking",
    hrefLabel: "Buka SBU Trucking",
    pagePaths: [
      "/dashboard/sbu/trucking",
      "/dashboard/sbu/trucking/work-orders",
    ],
  },
  {
    id: "driver-portal",
    title: "Panduan Driver Portal",
    description:
      "Informasi status JO untuk driver dan bagaimana mengupload bukti pengiriman.",
    tags: ["driver", "portal", "status", "pod", "picking", "delivered"],
    answer:
      'Driver portal menampilkan status JO secara real-time. Status "PICKING_UP" berarti driver sedang menuju lokasi, sedangkan "DELIVERED" berarti pengiriman sudah selesai. Gunakan tombol upload untuk mengunggah bukti foto atau dokumen.',
    href: "/driver/portal",
    hrefLabel: "Buka Driver Portal",
    pagePaths: ["/driver/portal"],
  },
  {
    id: "warehouse-inbound",
    title: "Proses inbound warehouse",
    description: "Terima inbound di SBU Warehouse dan atur lokasi penyimpanan.",
    tags: ["inbound", "warehouse", "terima", "gudang", "stock", "receipt"],
    answer:
      "Di SBU Warehouse, buka menu inbound atau warehouse page lalu lakukan penerimaan barang. Konfirmasi qty, pilih lokasi storage, lalu simpan receipt. Ini membantu memastikan stok tercatat dengan benar.",
    href: "/dashboard/sbu/warehouse",
    hrefLabel: "Buka SBU Warehouse",
    pagePaths: ["/dashboard/sbu/warehouse"],
  },
  {
    id: "finance-invoice",
    title: "Verifikasi invoice dan billing",
    description:
      "Temukan invoice customer/vendor dan verifikasi tagihan yang masuk.",
    tags: ["invoice", "billing", "finance", "tagihan", "verifikasi", "payment"],
    answer:
      "Buka modul invoice di dashboard finance untuk melihat invoice customer atau vendor. Periksa status pembayaran, dokumen pendukung, dan lakukan approval jika sudah lengkap.",
    href: "/dashboard/hq/invoice-customer",
    hrefLabel: "Buka Invoice Customer",
    pagePaths: [
      "/dashboard/hq/invoice-customer",
      "/dashboard/hq/invoice-vendor",
    ],
  },
];

export const defaultPopularTopics = [
  helpTopics[0],
  helpTopics[2],
  helpTopics[3],
  helpTopics[4],
];

export function getPageHelpTopics(pathname: string) {
  return helpTopics.filter((topic) =>
    topic.pagePaths?.some((path) => pathname.startsWith(path)),
  );
}
