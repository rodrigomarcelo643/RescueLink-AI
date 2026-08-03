import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const body = await req.json()
  const event = body.data?.attributes

  if (event?.type === 'link.payment.paid') {
    const referenceNumber = event.data.attributes.reference_number
    await supabase
      .from('donations')
      .update({ status: 'confirmed' })
      .eq('payment_reference', referenceNumber)
  }

  return new Response('OK', { status: 200 })
})
