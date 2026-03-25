import { createClient } from '@supabase/supabase-js'

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchNotionDatabase() {
  const allResults = []
  let hasMore = true
  let startCursor = undefined

  while (hasMore) {
    const body = {
      page_size: 100,
      filter: {
        property: 'Service',
        select: {
          equals: 'Coaching Liberty art',
        },
      },
    }
    if (startCursor) body.start_cursor = startCursor

    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Notion API error: ${error}`)
    }

    const data = await response.json()
    allResults.push(...data.results)
    hasMore = data.has_more
    startCursor = data.next_cursor
  }

  return allResults
}

function extractNotionData(page) {
  const props = page.properties

  // Prénom
  const prenomField = props['Prénom']
  const prenom = prenomField?.rich_text?.[0]?.plain_text || ''

  // Email
  const email = props['E-mail']?.email || ''

  // Date debut de coaching
  const dateDebut = props['Date debut de coaching']?.date?.start || null

  // Date de fin de coaching (formule)
  const dateFin = props['Date de fin de coaching']?.formula?.date?.start || null

  return { prenom: prenom.trim(), email: email.trim().toLowerCase(), dateDebut, dateFin }
}

export async function GET(request) {
  // Vérification simple par header
  const authHeader = request.headers.get('x-admin-auth')
  if (authHeader !== 'liberty-art-sync') {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    // 1. Récupérer tous les clients Notion avec Service = "Coaching Liberty art"
    const notionPages = await fetchNotionDatabase()

    // 2. Récupérer tous les emails existants dans Supabase
    const { data: existingStudents, error: fetchError } = await supabase
      .from('students')
      .select('email')

    if (fetchError) throw fetchError

    const existingEmails = new Set(
      (existingStudents || [])
        .filter((s) => s.email)
        .map((s) => s.email.toLowerCase())
    )

    // 3. Trouver les nouveaux (email pas encore dans Supabase)
    const newStudents = []

    for (const page of notionPages) {
      const data = extractNotionData(page)

      if (!data.email || !data.prenom) continue
      if (existingEmails.has(data.email)) continue

      // Calculer la fin si pas fournie
      let dateFin = data.dateFin
      if (!dateFin && data.dateDebut) {
        const d = new Date(data.dateDebut)
        d.setMonth(d.getMonth() + 6)
        dateFin = d.toISOString().split('T')[0]
      }

      newStudents.push({
        name: data.prenom,
        email: data.email,
        date_debut_coaching: data.dateDebut,
        date_fin_coaching: dateFin,
        photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.prenom)}&background=ff751f&color=fff&size=200&bold=true`,
        bio: null,
        insta_url: null,
        fb_url: null,
        tiktok_url: null,
        google_drive_url: null,
        coaching_cancelled: false,
      })
    }

    // 4. Insérer les nouveaux
    let inserted = 0
    if (newStudents.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('students')
        .insert(newStudents)
        .select()

      if (insertError) throw insertError
      inserted = insertedData?.length || 0
    }

    return Response.json({
      success: true,
      total_notion: notionPages.length,
      already_exists: notionPages.length - newStudents.length - notionPages.filter(p => !extractNotionData(p).email || !extractNotionData(p).prenom).length,
      new_inserted: inserted,
      new_students: newStudents.map((s) => s.name),
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
