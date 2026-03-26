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
    // Lire les infos financières depuis Supabase
    const { data: student, error } = await supabase
      .from('students')
      .select('prix_total, nb_paiements, date_creation_notion')
      .eq('id', studentId)
      .single()

    if (error || !student) {
      return NextResponse.json({ found: false, message: 'Client non trouvé' })
    }

    const prixTotal = student.prix_total || 0
    const nbFois = student.nb_paiements || 1
    const dateCreation = student.date_creation_notion

    if (!prixTotal || !dateCreation) {
      return NextResponse.json({ found: false, message: 'Données financières non disponibles. Lancez une sync Notion.' })
    }

    // Calcul mensualité
    const mensualite = nbFois > 0 ? Math.round(prixTotal / nbFois) : prixTotal
    const now = new Date()

    // Construire les échéances à partir de la date de création Notion
    const echeances = []
    let nbMensualitesPayees = 0

    for (let i = 0; i < nbFois; i++) {
      const dateEcheance = new Date(dateCreation)
      dateEcheance.setMonth(dateEcheance.getMonth() + i)

      // Si la date d'échéance est passée → payé (prélèvement auto)
      const paye = now >= dateEcheance

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
    })
  } catch (error) {
    console.error('Erreur API payment:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
