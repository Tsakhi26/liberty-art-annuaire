import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, CheckCircle2, Clock3, Mail, Ticket, UsersRound } from 'lucide-react'
import './analyse.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Analyse Invitations — Liberty Art Exposition Paris 2026',
  description: 'Tableau de bord des inscriptions et invitations du vernissage Liberty Art.',
}

function formatDate(value) {
  if (!value) return 'Date inconnue'

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function isToday(value) {
  if (!value) return false

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })

  return formatter.format(new Date(value)) === formatter.format(new Date())
}

async function getInvitationRows() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      rows: [],
      error: 'Configuration Supabase manquante.',
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('vernissage_inscriptions')
    .select('id,email,created_at,invitation_envoyee,token_invitation,nb_invites')
    .order('created_at', { ascending: false })

  if (error) {
    return {
      rows: [],
      error:
        error.code === 'PGRST205' || error.code === '42P01'
          ? 'La table vernissage_inscriptions n’existe pas encore dans Supabase.'
          : error.message,
    }
  }

  return {
    rows: data || [],
    error: null,
  }
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <article className="analytics-card">
      <div className="analytics-card-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </article>
  )
}

export default async function VernissageAnalysePage() {
  const { rows, error } = await getInvitationRows()
  const totalEmails = rows.length
  const sentInvitations = rows.filter((row) => row.invitation_envoyee).length
  const pendingInvitations = totalEmails - sentInvitations
  const totalGuests = rows.reduce((sum, row) => sum + (Number(row.nb_invites) || 2), 0)
  const todayEmails = rows.filter((row) => isToday(row.created_at)).length
  const latestRows = rows.slice(0, 12)

  return (
    <main className="analytics-page">
      <header className="analytics-hero">
        <div>
          <p className="analytics-kicker">Liberty Art · Vernissage 2026</p>
          <h1>Analyse des invitations</h1>
          <p>
            Suivi des emails reçus, des invitations envoyées et du nombre de places
            réservées pour le vernissage.
          </p>
        </div>
        <nav aria-label="Navigation analyse">
          <Link href="/vernissage">Page vernissage</Link>
          <Link href="/vernissage/analyse">Actualiser</Link>
        </nav>
      </header>

      {error && (
        <section className="analytics-warning" role="alert">
          <strong>Action nécessaire</strong>
          <p>{error}</p>
          <p>
            Lance le script <code>app/vernissage/SUPABASE_SETUP.sql</code> dans le SQL Editor
            de Supabase pour activer le suivi.
          </p>
        </section>
      )}

      <section className="analytics-grid" aria-label="Statistiques invitations">
        <StatCard
          icon={Mail}
          label="Emails reçus"
          value={totalEmails}
          helper="Adresses enregistrées dans Supabase"
        />
        <StatCard
          icon={Ticket}
          label="Invitations envoyées"
          value={sentInvitations}
          helper="Emails confirmés avec PDF envoyé"
        />
        <StatCard
          icon={UsersRound}
          label="Places prévues"
          value={totalGuests}
          helper="Calculé avec 2 invités par inscription"
        />
        <StatCard
          icon={Clock3}
          label="Aujourd’hui"
          value={todayEmails}
          helper="Nouvelles inscriptions du jour"
        />
      </section>

      <section className="analytics-split">
        <article className="analytics-panel">
          <div className="panel-head">
            <BarChart3 size={22} aria-hidden="true" />
            <h2>Résumé</h2>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Taux d’envoi</dt>
              <dd>{totalEmails ? Math.round((sentInvitations / totalEmails) * 100) : 0}%</dd>
            </div>
            <div>
              <dt>En attente</dt>
              <dd>{pendingInvitations}</dd>
            </div>
            <div>
              <dt>Invités par email</dt>
              <dd>2</dd>
            </div>
          </dl>
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <CheckCircle2 size={22} aria-hidden="true" />
            <h2>État</h2>
          </div>
          <p className="status-copy">
            {error
              ? 'La page est prête, mais la table Supabase doit encore être créée pour afficher les données.'
              : 'Le suivi Supabase est actif. Les prochaines inscriptions apparaîtront ici automatiquement.'}
          </p>
        </article>
      </section>

      <section className="analytics-table-section">
        <header>
          <h2>Derniers emails reçus</h2>
          <span>{latestRows.length} affiché(s)</span>
        </header>

        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Date</th>
                <th>Invitation</th>
                <th>Invités</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.length ? (
                latestRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.email}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <span className={row.invitation_envoyee ? 'pill sent' : 'pill pending'}>
                        {row.invitation_envoyee ? 'Envoyée' : 'En attente'}
                      </span>
                    </td>
                    <td>{row.nb_invites || 2}</td>
                    <td className="token-cell">{row.token_invitation || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    Aucune inscription enregistrée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
