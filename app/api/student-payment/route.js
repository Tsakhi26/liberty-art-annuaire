import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('id')

  const authHeader = request.headers.get('x-admin-auth')
  if (authHeader !== 'liberty-art-sync') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!studentId) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 })
  }

  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('prix_total, nb_paiements, date_creation_notion, paiement_manuel, paiements_manuels_json, note_paiement, coaching_cancelled, rembourse')
      .eq('id', studentId)
      .single()

    if (error || !student) {
      return NextResponse.json({ found: false, message: 'Client non trouvé' })
    }

    const prixTotal = student.prix_total || 0
    const nbFois = student.nb_paiements || 1
    const dateCreation = student.date_creation_notion
    const paiementManuel = student.paiement_manuel || false
    const paiementsManuelsJson = student.paiements_manuels_json || {}
    const notePaiement = student.note_paiement || ''
    const coachingCancelled = student.coaching_cancelled || false
    const rembourse = student.rembourse || false

    if (!prixTotal || !dateCreation) {
      return NextResponse.json({ found: false, message: 'Données financières non disponibles. Lancez une sync Notion.', coaching_cancelled: coachingCancelled, rembourse })
    }

    const mensualite = nbFois > 0 ? Math.round(prixTotal / nbFois) : prixTotal
    const now = new Date()

    // Cas REMBOURSÉ : tout à 0
    if (rembourse) {
      const echeancesVides = Array.from({ length: nbFois }, (_, i) => {
        const d = new Date(dateCreation)
        d.setMonth(d.getMonth() + i)
        return { numero: i + 1, date: d.toISOString().split('T')[0], montant: 0, paye: false }
      })
      return NextResponse.json({
        found: true,
        prix_total: 0,
        nb_fois: nbFois,
        mensualite: 0,
        total_paye: 0,
        reste_a_payer: 0,
        solde_ok: true,
        nb_mensualites_payees: 0,
        nb_mensualites_restantes: 0,
        echeances: echeancesVides,
        date_creation_notion: dateCreation,
        paiement_manuel: paiementManuel,
        paiements_manuels_json: paiementsManuelsJson,
        note_paiement: notePaiement,
        coaching_cancelled: coachingCancelled,
        rembourse: true,
      })
    }

    // Calcul normal des échéances
    const echeances = []
    let nbMensualitesPayees = 0

    for (let i = 0; i < nbFois; i++) {
      const dateEcheance = new Date(dateCreation)
      dateEcheance.setMonth(dateEcheance.getMonth() + i)

      let paye
      if (paiementManuel) {
        paye = !!paiementsManuelsJson[String(i + 1)]
      } else {
        paye = now >= dateEcheance
      }

      if (paye) nbMensualitesPayees++

      echeances.push({
        numero: i + 1,
        date: dateEcheance.toISOString().split('T')[0],
        montant: mensualite,
        paye,
      })
    }

    const totalPaye = nbMensualitesPayees * mensualite
    let resteAPayer = prixTotal - totalPaye
    let nbMensualitesRestantes = nbFois - nbMensualitesPayees
    let soldeOK = nbMensualitesRestantes === 0

    // Cas COACHING ANNULÉ : reste à payer = 0
    if (coachingCancelled) {
      resteAPayer = 0
      nbMensualitesRestantes = 0
      soldeOK = true
    }

    return NextResponse.json({
      found: true,
      prix_total: prixTotal,
      nb_fois: nbFois,
      mensualite,
      total_paye: totalPaye,
      reste_a_payer: resteAPayer,
      solde_ok: soldeOK,
      nb_mensualites_payees: nbMensualitesPayees,
      nb_mensualites_restantes: nbMensualitesRestantes,
      echeances,
      date_creation_notion: dateCreation,
      paiement_manuel: paiementManuel,
      paiements_manuels_json: paiementsManuelsJson,
      note_paiement: notePaiement,
      coaching_cancelled: coachingCancelled,
      rembourse,
    })
  } catch (error) {
    console.error('Erreur API payment:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
