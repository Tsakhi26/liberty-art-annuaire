import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInvitation } from '@/lib/brevo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isMissingTableError = (error) => error?.code === 'PGRST205' || error?.code === '42P01'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const honeypot = String(body?.website || '')

  if (honeypot) {
    return NextResponse.json({ ok: true, alreadyRegistered: false })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  try {
    let dbAvailable = true
    let inscriptionId = null

    const { data: existing, error: lookupError } = await supabase
      .from('vernissage_inscriptions')
      .select('id, invitation_envoyee, token_invitation')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      if (isMissingTableError(lookupError)) {
        dbAvailable = false
        console.warn('[vernissage/inscription] Table vernissage_inscriptions absente, envoi sans sauvegarde.')
      } else {
        throw lookupError
      }
    }

    if (existing?.invitation_envoyee) {
      return NextResponse.json({ ok: true, alreadyRegistered: true })
    }

    inscriptionId = existing?.id || null

    await sendInvitation({ email })

    if (dbAvailable && !inscriptionId) {
      const { error: insertError } = await supabase
        .from('vernissage_inscriptions')
        .insert({
          email,
          invitation_envoyee: true,
          nb_invites: 2,
        })

      if (insertError) {
        console.warn('[vernissage/inscription] Invitation envoyée, mais insertion Supabase incomplète.', insertError)
      }
    }

    if (dbAvailable && inscriptionId) {
      const { error: updateError } = await supabase
        .from('vernissage_inscriptions')
        .update({
          invitation_envoyee: true,
        })
        .eq('id', inscriptionId)

      if (updateError) {
        console.warn('[vernissage/inscription] Invitation envoyée, mais sauvegarde Supabase incomplète.', updateError)
      }
    }

    return NextResponse.json({ ok: true, alreadyRegistered: false })
  } catch (err) {
    console.error('[vernissage/inscription]', err)
    return NextResponse.json(
      { error: 'send_failed', message: 'Une erreur est survenue. Réessayez dans un instant.' },
      { status: 500 }
    )
  }
}
