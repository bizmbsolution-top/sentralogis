'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const getAdminClient = () => {
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function getTokenPrice() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('token_prices')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    
    return { 
      success: true, 
      price: data?.price_per_token || 1000,
      currency: data?.currency || 'IDR',
      effectiveFrom: data?.effective_from,
      notes: data?.notes
    }
  } catch (error: any) {
    console.error('getTokenPrice error:', error)
    return { success: false, price: 1000, currency: 'IDR' }
  }
}

export async function getTokenPriceHistory() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('token_price_history')
      .select(`
        *,
        changed_by:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getTokenPriceHistory error:', error)
    return { success: false, data: [] }
  }
}

export async function updateTokenPrice(params: {
  newPrice: number
  reason?: string
  userId?: string
}) {
  const admin = getAdminClient()
  try {
    // 1. Get current price
    const { data: currentPrice, error: fetchError } = await admin
      .from('token_prices')
      .select('price_per_token')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch current price error:', fetchError)
    }

    const oldPrice = currentPrice?.price_per_token || 1000

    // 2. End current price records that are still active
    const { error: updateError } = await admin
      .from('token_prices')
      .update({ 
        effective_to: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .is('effective_to', null)

    if (updateError) {
      console.error('Update existing price error:', updateError)
      // Not fatal - might be first time setup
    }

    // 3. Insert new price record
    const { error: insertError } = await admin
      .from('token_prices')
      .insert({
        price_per_token: params.newPrice,
        currency: 'IDR',
        effective_from: new Date().toISOString(),
        updated_by: params.userId || null,
        notes: params.reason || 'Price updated'
      })

    if (insertError) {
      console.error('Insert new price error:', insertError)
      throw new Error(`Failed to save new price: ${insertError.message}`)
    }

    // 4. Log to history
    const { error: historyError } = await admin
      .from('token_price_history')
      .insert({
        old_price: oldPrice,
        new_price: params.newPrice,
        changed_by: params.userId || null,
        reason: params.reason || 'Price updated'
      })

    if (historyError) {
      console.error('Insert history error:', historyError)
      // Not fatal - price was still updated
    }

    return { 
      success: true, 
      message: `Harga token berhasil diubah dari Rp ${oldPrice.toLocaleString()} ke Rp ${params.newPrice.toLocaleString()}` 
    }
  } catch (error: any) {
    console.error('updateTokenPrice error:', error)
    return { success: false, message: error.message || 'Unknown error occurred' }
  }
}
