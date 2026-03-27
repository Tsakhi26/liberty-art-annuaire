import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('id')

  // Vérifier auth admin
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
      .select('prix_total, nb_paiements, date_creation_notion, paiement_manuel, paiements_manuels_json, note_paiement')
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

    if (!prixTotal || !dateCreation) {
      return NextResponse.json({ found: false, message: 'Données financières non disponibles. Lancez une sync Notion.' })
    }

    const mensualite = nbFois > 0 ? Math.round(prixTotal / nbFois) : prixTotal
    const now = new Date()

    const echeances = []
    let nbMensualitesPayees = 0

    for (let i = 0; i < nbFois; i++) {
      const dateEcheance = new Date(dateCreation)
      dateEcheance.setMonth(dateEcheance.getMonth() + i)

      let paye
      if (paiementManuel) {
        // Mode manuel : basé sur les cases cochées
        paye = !!paiementsManuelsJson[String(i + 1)]
      } else {
        // Mode auto : basé sur la date
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
    const resteAPayer = prixTotal - totalPaye
    const nbMensualitesRestantes = nbFois - nbMensualitesPayees
    const soldeOK = nbMensualitesRestantes === 0

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
    })
  } catch (error) {
    console.error('Erreur API payment:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
