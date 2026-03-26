import { NextResponse } from 'next/server'

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  // Vérifier auth admin
  const authHeader = request.headers.get('x-admin-auth')
  if (authHeader !== 'liberty-art-sync') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  }

  try {
    // Chercher dans Notion par email
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'E-mail',
          email: { equals: email },
        },
      }),
    })

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ found: false, message: 'Client non trouvé dans Notion' })
    }

    const page = data.results[0]
    const props = page.properties

    const prixTotal = props['Prix total']?.number || 0
    const nbFois = props['Paiement en nombre de fois']?.number || 1
    // Date de création sur Notion = date du 1er prélèvement
    const dateCreation = page.created_time ? page.created_time.split('T')[0] : null

    // Calcul mensualité
    const mensualite = nbFois > 0 ? Math.round(prixTotal / nbFois) : prixTotal
    const now = new Date()

    // Construire les échéances à partir de la date de création Notion
    const echeances = []
    let nbMensualitesPayees = 0

    for (let i = 0; i < nbFois; i++) {
      const dateEcheance = new Date(dateCreation)
      dateEcheance.setMonth(dateEcheance.getMonth() + i)

      // Si la date d'échéance est passée → c'est payé (prélèvement auto)
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
