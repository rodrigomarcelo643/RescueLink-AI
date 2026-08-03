# 09 — Payments (Donations)

## Supported Methods

- GCash
- Maya
- Bank Transfer
- Credit / Debit Card

## Provider: PayMongo (recommended for PH)

---

## Step 1: Setup

1. Register at [paymongo.com](https://paymongo.com)
2. Get **Secret Key** and **Public Key** from Dashboard → Developers
3. Save as Supabase secrets:

```bash
supabase secrets set PAYMONGO_SECRET_KEY=sk_...
supabase secrets set PAYMONGO_PUBLIC_KEY=pk_...
```

---

## Step 2: process-donation Edge Function

Handles creating a PayMongo payment link and recording the donation.

```
supabase/functions/process-donation/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { amount, donorId, description } = await req.json()

  // Create PayMongo payment link
  const res = await fetch('https://api.paymongo.com/v1/links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amount * 100, // in centavos
          description,
          remarks: 'RescueLink AI Donation',
        },
      },
    }),
  })

  const link = await res.json()
  const checkoutUrl = link.data.attributes.checkout_url
  const referenceNumber = link.data.attributes.reference_number

  // Record pending donation
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
```

---

## Step 3: PayMongo Webhook (Confirm Payment)

PayMongo sends a webhook when payment is completed. Handle it in a separate function:

```
supabase/functions/paymongo-webhook/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
```

Register this webhook URL in PayMongo Dashboard → Webhooks:
```
https://<project-ref>.supabase.co/functions/v1/paymongo-webhook
```

---

## Step 4: Deploy

```bash
supabase functions deploy process-donation
supabase functions deploy paymongo-webhook
```

---

## Step 5: Frontend Donation Flow

```ts
// src/services/donations.service.ts
import { supabase } from './supabase'

export const createDonationLink = async (amount: number, description: string) => {
  const { data, error } = await supabase.functions.invoke('process-donation', {
    body: { amount, description },
  })
  if (error) throw error
  return data as { checkoutUrl: string; donationId: string }
}

export const getDonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

---

## In-Kind Donation Flow

No payment processing needed. Citizens submit via chatbot or web form:

```ts
export const submitInKindDonation = async (items: Record<string, unknown>, donorId?: string) => {
  const { error } = await supabase.from('donations').insert({
    donor_id: donorId ?? null,
    type: 'in_kind',
    items,
    status: 'pending',
  })
  if (error) throw error
}
```

AI categorizes items and recommends the evacuation center with the highest need via the `ai-extract` function.
