import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { amount, donorId, description } = await req.json()

  const res = await fetch('https://api.paymongo.com/v1/links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amount * 100,
          description,
          remarks: 'RescueLink AI Donation',
        },
      },
    }),
  })

  const link = await res.json()
  const checkoutUrl = link.data.attributes.checkout_url
  const referenceNumber = link.data.attributes.reference_number

  const { data: donation } = await supabase
    .from('donations')
    .insert({
      donor_id: donorId ?? null,
      type: 'monetary',
      amount,
      currency: 'PHP',
      payment_method: 'paymongo',
      payment_reference: referenceNumber,
      status: 'pending',
    })
    .select()
    .single()

  return new Response(
    JSON.stringify({ checkoutUrl, donationId: donation.id }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
