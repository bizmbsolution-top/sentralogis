import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePdf } from '@/lib/invoice/pdf'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const invoiceId = request.nextUrl.searchParams.get('invoice_id')

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing invoice_id query parameter' },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceError) {
      console.error('[invoice/pdf] Supabase query error:', invoiceError)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 },
      )
    }

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 },
      )
    }

    const { buffer, filename } = await generateInvoicePdf(
      invoice.id,
      invoice.invoice_number,
    )

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('[invoice/pdf] Failed to generate PDF:', message)

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        detail: message,
      },
      { status: 500 },
    )
  }
}
