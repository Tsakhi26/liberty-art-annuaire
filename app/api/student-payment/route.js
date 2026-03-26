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
    const resteAPayer = props['Reste à payer']?.formula?.number || 0
    const soldeOK = props['Solde OK']?.checkbox || false
    const debutCoaching = props['Date debut de coaching']?.date?.start || null
    const finCoaching = props['Date de fin de coaching']?.formula?.date?.start || null

    // Calcul mensualité
    const mensualite = nbFois > 1 ? Math.round(prixTotal / nbFois) : prixTotal
    const totalPaye = prixTotal - resteAPayer
    const nbMensualitesPayees = mensualite > 0 ? Math.round(totalPaye / mensualite) : 0
    const nbMensualitesRestantes = nbFois - nbMensualitesPayees

    // Calculer les échéances
    const echeances = []
    if (debutCoaching && nbFois > 1) {
      for (let i = 0; i < nbFois; i++) {
        const date = new Date(debutCoaching)
        date.setMonth(date.getMonth() + i)
        echeances.push({
          numero: i + 1,
          date: date.toISOString().split('T')[0],
          montant: mensualite,
          paye: i < nbMensualitesPayees,
        })
      }
    } else {
      echeances.push({
        numero: 1,
        date: debutCoaching,
        montant: prixTotal,
        paye: soldeOK || resteAPayer === 0,
      })
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
      debut_coaching: debutCoaching,
      fin_coaching: finCoaching,
    })
  } catch (error) {
    console.error('Erreur API payment:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
