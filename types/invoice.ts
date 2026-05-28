export interface InvoiceTenant {
  name: string
  logo_url: string | null
  address?: string
  phone?: string
  branding?: {
    primary_color?: string
    font?: string
  }
}

export interface InvoiceMeta {
  invoice_number: string
  invoice_date: string
  due_date: string
  status: string
}

export interface InvoiceCustomer {
  name: string
  address: string
  tax_id?: string
}

export interface InvoiceLineRow {
  id: string
  description: string
  quantity: number
  unit_amount: number
  amount: number
}

export interface InvoiceTotals {
  dpp: number
  tax: number
  grand_total: number
}

export type InvoiceTheme = 'blackWhite' | 'corporate' | 'lightBrand'

export interface InvoiceTemplateBaseProps {
  tenant: InvoiceTenant
  invoice: InvoiceMeta
  customer: InvoiceCustomer
  lines: InvoiceLineRow[]
  totals: InvoiceTotals
  theme?: InvoiceTheme
  notes?: string
  terms?: string
  currency?: string
  tax_rate?: number
}
