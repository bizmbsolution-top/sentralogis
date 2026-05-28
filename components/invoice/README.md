# InvoicePrint Component Documentation

## Overview

`InvoicePrint` adalah komponen React yang siap pakai untuk mencetak invoice dengan format A4, desain formal, dan dukungan multi-tenant. Komponen ini dioptimalkan untuk printing dan menggunakan black & white styling.

## Features

✅ **A4 Print Optimized** - Responsive layout untuk kertas A4
✅ **Black & White** - Hanya menggunakan grayscale, cocok untuk printer B&W
✅ **Multi-Tenant Support** - Logo, nama, alamat, dan kontak perusahaan
✅ **Professional Design** - Formal corporate invoice style
✅ **Currency Support** - Format mata uang (IDR, USD, etc)
✅ **Tax Calculation** - Support untuk pajak/tax
✅ **Notes & T&C** - Terms & Conditions dan catatan
✅ **Print-Ready** - Optimized CSS untuk print

## Installation

Komponen sudah tersedia di:

```
/components/invoice/InvoicePrint.tsx
```

## Usage

### Basic Implementation

```tsx
import InvoicePrint from "@/components/invoice/InvoicePrint";

export default function MyInvoicePage() {
  return (
    <InvoicePrint
      invoiceNumber="INV-2026-05-001"
      invoiceDate="2026-05-27"
      dueDate="2026-06-27"
      tenantName="SENTRALOGIS LOGISTICS"
      tenantLogoUrl="/logo.svg"
      tenantAddress="Jl. Boulevard Raya No. 45\nJakarta Barat 12120"
      tenantPhone="+62-21-1234-5678"
      customerName="PT TRADING PERDANA SUKSES"
      customerAddress="Gedung Sentra Bisnis\nJl. MH Thamrin No. 12"
      items={[
        {
          id: "1",
          description: "Transportation Service",
          quantity: 1,
          unitPrice: 5000000,
          total: 5000000,
        },
        {
          id: "2",
          description: "Handling Service",
          quantity: 2,
          unitPrice: 500000,
          total: 1000000,
        },
      ]}
      subtotal={6000000}
      taxRate={10}
      taxAmount={600000}
      totalAmount={6600000}
      notes="Payment should be made within 30 days."
      termsAndConditions="All goods are insured."
      currency="IDR"
    />
  );
}
```

## Props Interface

```typescript
interface InvoicePrintProps {
  // Invoice Data
  invoiceNumber: string; // e.g. "INV-2026-05-001"
  invoiceDate: string; // e.g. "2026-05-27"
  dueDate?: string; // Optional: "2026-06-27"

  // Tenant (Company) Data
  tenantName: string; // e.g. "SENTRALOGIS LOGISTICS"
  tenantLogoUrl?: string; // Path to logo image
  tenantAddress?: string; // Multi-line: "Jl. X\nKota\nNegara"
  tenantPhone?: string; // e.g. "+62-21-1234-5678"

  // Customer Data
  customerName: string; // e.g. "PT TRADING PERDANA SUKSES"
  customerAddress?: string; // Multi-line address

  // Invoice Items
  items: InvoiceItem[]; // Array of line items

  // Financial Summary
  subtotal: number; // Subtotal amount
  taxRate?: number; // Tax percentage (default: 10)
  taxAmount?: number; // Tax amount in rupiah
  totalAmount: number; // Grand total

  // Optional
  notes?: string; // Additional notes
  termsAndConditions?: string; // T&C text
  currency?: string; // Currency code (default: 'IDR')
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
```

## InvoiceItem Structure

Setiap item dalam array `items` harus memiliki struktur:

```typescript
{
  id: '1',                           // Unique identifier
  description: 'Service description', // Line item description
  quantity: 1,                       // Quantity
  unitPrice: 5000000,               // Price per unit
  total: 5000000,                   // Quantity × Unit Price
}
```

## Printing

### Automatic Print Button

Komponen sudah menyediakan tombol "Print Invoice" yang akan membuka print dialog.

### Manual Printing

Pengguna juga bisa menggunakan:

- `Ctrl+P` (Windows/Linux)
- `Cmd+P` (Mac)

### Print Behavior

- Print button otomatis hilang saat print (menggunakan `print:hidden`)
- Hanya tampilkan invoice, semua UI lain disembunyikan
- A4 page breaks diatur otomatis
- Black & White styling diterapkan

## Styling Details

### Print CSS

```css
@media print {
  * {
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  body {
    background: white !important;
    color: #000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  @page {
    size: A4;
    margin: 0 !important;
  }

  /* Prevent page breaks inside table rows */
  tr {
    page-break-inside: avoid;
  }
}
```

### Page Layout

- **Width**: 210mm (A4 width)
- **Height**: 297mm (A4 height)
- **Padding**: 15mm all sides
- **Font**: Arial (fallback: sans-serif)
- **Color**: Black (#000) on White

## Demo Page

Akses demo page di:

```
/invoice-print-demo
```

Tersedia 2 template:

1. **Standard Invoice** - Lengkap dengan T&C
2. **Simple Invoice** - Minimal dan ringkas

## Real-World Integration Example

### Connecting to Supabase

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import InvoicePrint from "@/components/invoice/InvoicePrint";

export default function InvoiceViewPage({
  params,
}: {
  params: { id: string };
}) {
  const [invoice, setInvoice] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoice = async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*, tenant(*), customer(*), items(*)")
        .eq("id", params.id)
        .single();

      setInvoice(data);
    };

    fetchInvoice();
  }, [params.id]);

  if (!invoice) return <div>Loading...</div>;

  return (
    <InvoicePrint
      invoiceNumber={invoice.invoice_number}
      invoiceDate={invoice.invoice_date}
      dueDate={invoice.due_date}
      tenantName={invoice.tenant.name}
      tenantLogoUrl={invoice.tenant.logo_url}
      tenantAddress={invoice.tenant.address}
      tenantPhone={invoice.tenant.phone}
      customerName={invoice.customer.name}
      customerAddress={invoice.customer.address}
      items={invoice.items.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      }))}
      subtotal={invoice.subtotal}
      taxRate={invoice.tax_rate}
      taxAmount={invoice.tax_amount}
      totalAmount={invoice.total_amount}
      notes={invoice.notes}
      termsAndConditions={invoice.terms}
      currency="IDR"
    />
  );
}
```

## Browser Support

✅ Chrome/Chromium (Full support)
✅ Firefox (Full support)
✅ Safari (Full support)
✅ Edge (Full support)

## Responsive Behavior

- **Desktop/Tablet**: Preview dengan ukuran normal
- **Mobile**: Adjustment otomatis
- **Print**: Selalu A4 format

## Troubleshooting

### Logo tidak muncul

```tsx
// Pastikan path logo benar
tenantLogoUrl = "/path/to/logo.svg"; // ✓ Benar
tenantLogoUrl = "path/to/logo.svg"; // ✗ Salah
```

### Font tidak sesuai

Komponen menggunakan Arial. Pastikan font tersedia di sistem.

### Print margin tidak benar

Jika ada margin ekstra saat print:

1. Buka Print Settings (Ctrl+P / Cmd+P)
2. Set Margins ke "None"
3. Uncheck "Headers and footers"

### Currency formatting salah

Sesuaikan locale dan currency code:

```tsx
currency = "USD"; // Untuk Dollar
currency = "IDR"; // Untuk Rupiah
```

## Files Location

```
/components/invoice/
├── InvoicePrint.tsx           // Main component
├── mockInvoiceData.ts         // Sample data for testing
└── README.md                  // This documentation

/app/(dashboard)/
└── invoice-print-demo/
    └── page.tsx               // Demo page
```

## Performance Tips

1. **Lazy Load Images**: Logo harus di-optimize
2. **Memoization**: Wrap component dengan React.memo jika di-render berkali-kali
3. **Data**: Pre-calculate subtotal, tax, total

```tsx
import React from "react";

const MemoizedInvoicePrint = React.memo(InvoicePrint);

export default function Page() {
  return <MemoizedInvoicePrint {...props} />;
}
```

## Customization

Untuk customize styling, edit file `InvoicePrint.tsx` bagian inline styles dalam JSX.

### Mengubah Font

```tsx
style={{ fontFamily: 'Times New Roman, serif' }}
```

### Mengubah Warna (Warning: Will break B&W printing)

```tsx
style={{ color: '#333' }}  // Dark gray
```

## Version History

- **v1.0.0** - Initial release
  - A4 print support
  - Multi-tenant support
  - Tax calculation
  - Professional styling

## Support & Feedback

Untuk issues atau improvement suggestions, hubungi development team.

---

**Last Updated**: May 27, 2026
**Component Author**: Sentralogis Dev Team
