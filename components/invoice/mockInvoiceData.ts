export const mockTenants = {
  sentralogis: {
    name: 'SENTRALOGIS LOGISTICS',
    logo_url: '/sentralogis_logo.svg',
    address: 'Jl. Boulevard Raya No. 45\nJakarta Barat 12120\nIndonesia',
    phone: '+62-21-1234-5678',
    branding: {
      primary_color: '#1e293b',
      font: 'Arial, sans-serif',
    },
  },
  halu: {
    name: 'PT HALU LOGISTIK INDONESIA',
    logo_url: '/logo.png',
    address: 'Jl. Industri Raya No. 1\nTangerang 15001\nIndonesia',
    phone: '+62-21-9876-5432',
    branding: {
      primary_color: '#0f766e',
      font: 'Georgia, serif',
    },
  },
  nusantara: {
    name: 'PT NUSANTARA LOGISTIK',
    logo_url: null,
    address: 'Gedung Nusantara\nJl. Asia Afrika No. 8\nBandung 40115',
    phone: '+62-22-555-0199',
    branding: {
      primary_color: '#7c3aed',
      font: 'Arial, sans-serif',
    },
  },
}

export const mockCustomers = {
  perdana: {
    name: 'PT TRADING PERDANA SUKSES',
    address: 'Gedung Sentra Bisnis\nJl. MH Thamrin No. 12\nJakarta Pusat 10340',
    tax_id: '01.234.567.8-999.000',
  },
  retail: {
    name: 'PT RETAIL INDONESIA',
    address: 'Jl. Gatot Subroto Kav. 56\nJakarta Selatan 12950',
    tax_id: '09.876.543.2-111.222',
  },
  mega: {
    name: 'PT MEGA KONSTRUKSI NUSANTARA',
    address: 'Jl. Sudirman No. 88\nJakarta Pusat 10220',
    tax_id: '03.456.789.1-333.444',
  },
}

export const mockInvoices = {
  inv001: {
    invoice_number: 'INV-2026-05-001',
    invoice_date: '2026-05-27',
    due_date: '2026-06-27',
    status: 'unpaid',
  },
  inv002: {
    invoice_number: 'INV-2026-05-002',
    invoice_date: '2026-05-20',
    due_date: '2026-06-20',
    status: 'paid',
  },
  inv003: {
    invoice_number: 'INV-2026-05-003',
    invoice_date: '2026-05-01',
    due_date: '2026-06-01',
    status: 'overdue',
  },
}

export const mockLines = {
  full: [
    {
      id: '1',
      description: 'Transportasi - Jakarta ke Surabaya (Full Truck Load)',
      quantity: 1,
      unit_amount: 5000000,
      amount: 5000000,
    },
    {
      id: '2',
      description: 'Jasa Bongkar Muat & Handling',
      quantity: 2,
      unit_amount: 500000,
      amount: 1000000,
    },
    {
      id: '3',
      description: 'Asuransi Barang (1% dari nilai)',
      quantity: 1,
      unit_amount: 60000,
      amount: 60000,
    },
    {
      id: '4',
      description: 'Biaya Administrasi & Dokumentasi',
      quantity: 1,
      unit_amount: 250000,
      amount: 250000,
    },
    {
      id: '5',
      description: 'Warehouse Storage (7 hari)',
      quantity: 7,
      unit_amount: 50000,
      amount: 350000,
    },
  ],
  simple: [
    {
      id: '1',
      description: 'Pengiriman Reguler - Paket Corporate',
      quantity: 5,
      unit_amount: 200000,
      amount: 1000000,
    },
    {
      id: '2',
      description: 'Sewa Gudang (1 pallet/bulan)',
      quantity: 1,
      unit_amount: 300000,
      amount: 300000,
    },
  ],
  construction: [
    {
      id: '1',
      description: 'Angkutan Material - Pasir & Batu Split',
      quantity: 10,
      unit_amount: 1500000,
      amount: 15000000,
    },
    {
      id: '2',
      description: 'Sewa Alat Berat - Crane 50 ton',
      quantity: 3,
      unit_amount: 3500000,
      amount: 10500000,
    },
    {
      id: '3',
      description: 'Jasa Pengawalan Proyek',
      quantity: 5,
      unit_amount: 750000,
      amount: 3750000,
    },
  ],
}

export const mockTemplateData: Record<string, Omit<import('@/types/invoice').InvoiceTemplateBaseProps, 'theme'> & { theme: import('@/types/invoice').InvoiceTheme }> = {
  blackWhite: {
    tenant: mockTenants.sentralogis,
    invoice: mockInvoices.inv001,
    customer: mockCustomers.perdana,
    lines: mockLines.full,
    totals: { dpp: 6310000, tax: 631000, grand_total: 6941000 },
    notes: 'Payment should be made within 30 days from invoice date.',
    terms: 'Risk and insurance are transferred upon goods handover at loading point.',
    currency: 'IDR',
    tax_rate: 10,
    theme: 'blackWhite',
  },
  corporate: {
    tenant: mockTenants.nusantara,
    invoice: mockInvoices.inv003,
    customer: mockCustomers.mega,
    lines: mockLines.construction,
    totals: { dpp: 29250000, tax: 2925000, grand_total: 32175000 },
    notes: 'Please transfer to BCA 1234567890 a.n. PT Nusantara Logistik.',
    terms: 'Payment due within 14 days. Late payment subject to 2% monthly interest.',
    currency: 'IDR',
    tax_rate: 10,
    theme: 'corporate',
  },
  lightBrand: {
    tenant: mockTenants.halu,
    invoice: mockInvoices.inv002,
    customer: mockCustomers.retail,
    lines: mockLines.simple,
    totals: { dpp: 1300000, tax: 130000, grand_total: 1430000 },
    notes: 'Terima kasih atas kerjasamanya.',
    terms: 'Pembayaran maksimal H+30 dari tanggal invoice.',
    currency: 'IDR',
    tax_rate: 10,
    theme: 'lightBrand',
  },
}
