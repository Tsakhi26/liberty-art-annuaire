'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isInCoaching, isNew, getCoachingProgress } from '@/lib/coaching'
import Image from 'next/image'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, TrendingUp, Euro, CheckCircle, Clock, AlertTriangle,
  XCircle, ArrowLeft, RefreshCcw, Award, Target, Zap,
  ChevronRight, Calendar, BarChart2,
} from 'lucide-react'

// ── Calcul paiement local (sans appel API) ──
function computePayment(student) {
  const prixTotal = student.prix_total || 0
  const nbFois = student.nb_paiements || 1
  const dateCreation = student.date_creation_notion
  const paiementManuel = student.paiement_manuel || false
  const paiementsManuelsJson = student.paiements_manuels_json || {}
  const rembourse = student.rembourse || false
  const coachingCancelled = student.coaching_cancelled || false

  if (rembourse) return { totalPaye: 0, resteAPayer: 0, prixTotal: 0, mensualite: 0, valide: true }
  if (!prixTotal || !dateCreation) return { totalPaye: 0, resteAPayer: 0, prixTotal: 0, mensualite: 0, valide: false }

  const mensualite = Math.round(prixTotal / nbFois)
  const now = new Date()
  let nbPayees = 0

  if (paiementManuel) {
    for (let i = 0; i < nbFois; i++) {
      if (paiementsManuelsJson[String(i + 1)]) nbPayees++
    }
  } else {
    for (let i = 0; i < nbFois; i++) {
      const d = new Date(dateCreation)
      d.setMonth(d.getMonth() + i)
      if (now >= d) nbPayees++
    }
  }

  const totalPaye = nbPayees * mensualite
  const resteAPayer = coachingCancelled ? 0 : prixTotal - totalPaye
  const prixTotalDisplay = coachingCancelled ? totalPaye : prixTotal

  return { totalPaye, resteAPayer, prixTotal: prixTotalDisplay, mensualite, valide: true }
}

// ── Formatage monétaire ──
function fmtEuro(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k€`
  return `${n}€`
}

// ── Nom du mois ──
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// ── KPI Card ──
function KpiCard({ icon: Icon, label, value, sub, color, bg, trend }) {
  return (
    <div className={`${bg} rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-white/80`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800 mb-0.5">{value}</p>
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Tooltip personnalisé ──
function CustomTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {prefix}{p.value?.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('apercu')

  useEffect(() => {
    if (!localStorage.getItem('admin_logged_in')) {
      router.push('/admin/login')
      return
    }
    fetchAll()
  }, [])

  async function fetchAll() {
    const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: true })
    if (!error) setStudents(data || [])
    setLoading(false)
  }

  // ── Métriques calculées ──
  const stats = useMemo(() => {
    if (!students.length) return null

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    // Statuts de base
    const actifs = students.filter(s => isInCoaching(s))
    const nouveauxCeMois = students.filter(s => {
      const d = new Date(s.created_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const annules = students.filter(s => s.coaching_cancelled)
    const rembourses = students.filter(s => s.rembourse)
    const termines = students.filter(s => {
      const prog = getCoachingProgress(s)
      return prog.isComplete && !s.coaching_cancelled
    })
    const finProche = students.filter(s => {
      const prog = getCoachingProgress(s)
      return prog.isNearEnd && !prog.isComplete
    })

    // Financier
    let totalCAPrev = 0, totalEncaisse = 0, totalReste = 0
    const paymentsByStudent = students.map(s => {
      const p = computePayment(s)
      totalCAPrev += p.prixTotal
      totalEncaisse += p.totalPaye
      totalReste += p.resteAPayer
      return { student: s, payment: p }
    })

    const tauxRecouvrement = totalCAPrev > 0 ? Math.round((totalEncaisse / totalCAPrev) * 100) : 0
    const valeurMoyenne = actifs.length > 0
      ? Math.round(paymentsByStudent.filter(p => isInCoaching(p.student)).reduce((a, p) => a + p.payment.prixTotal, 0) / actifs.length)
      : 0

    // Graphique : nouveaux élèves par mois (12 derniers mois)
    const last12 = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const count = students.filter(s => {
        const sd = new Date(s.created_at)
        return sd.getMonth() === m && sd.getFullYear() === y
      }).length
      // CA de ce mois (somme des mensualités dues ce mois-là)
      let caMois = 0
      students.forEach(s => {
        if (!s.prix_total || !s.date_creation_notion) return
        const nbFois = s.nb_paiements || 1
        const mensualite = Math.round(s.prix_total / nbFois)
        for (let j = 0; j < nbFois; j++) {
          const dEch = new Date(s.date_creation_notion)
          dEch.setMonth(dEch.getMonth() + j)
          if (dEch.getMonth() === m && dEch.getFullYear() === y) {
            caMois += mensualite
          }
        }
      })
      last12.push({
        mois: `${MOIS[m]} ${y !== thisYear ? y : ''}`.trim(),
        eleves: count,
        ca: caMois,
      })
    }

    // Graphique : encaissé vs prévu par mois (12 derniers mois)
    const caComparaison = last12.map(m => ({
      ...m,
      encaisse: Math.round(m.ca * tauxRecouvrement / 100), // approximation visuelle
    }))

    // Pie : répartition statuts
    const pieData = [
      { name: 'Actifs', value: actifs.length, color: '#22c55e' },
      { name: 'Terminés', value: termines.length, color: '#f97316' },
      { name: 'Annulés', value: annules.length, color: '#ef4444' },
      { name: 'Remboursés', value: rembourses.length, color: '#a855f7' },
    ].filter(d => d.value > 0)

    // Top CA
    const topCA = [...paymentsByStudent]
      .sort((a, b) => b.payment.prixTotal - a.payment.prixTotal)
      .slice(0, 5)

    // Élèves avec retard de paiement (reste > 0 et pas actif)
    const enRetard = paymentsByStudent.filter(p =>
      p.payment.resteAPayer > 0 && !p.student.coaching_cancelled && !p.student.rembourse
    ).sort((a, b) => b.payment.resteAPayer - a.payment.resteAPayer)

    // Prochains paiements ce mois (mensualités dues dans les 30 prochains jours)
    const prochainsP = []
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    students.forEach(s => {
      if (!s.prix_total || !s.date_creation_notion || s.coaching_cancelled || s.rembourse) return
      const nbFois = s.nb_paiements || 1
      const mensualite = Math.round(s.prix_total / nbFois)
      for (let j = 0; j < nbFois; j++) {
        const d = new Date(s.date_creation_notion)
        d.setMonth(d.getMonth() + j)
        if (d >= now && d <= in30) {
          const paye = s.paiement_manuel
            ? !!(s.paiements_manuels_json || {})[String(j + 1)]
            : false
          if (!paye) {
            prochainsP.push({ student: s, date: d, montant: mensualite, num: j + 1 })
          }
        }
      }
    })
    prochainsP.sort((a, b) => a.date - b.date)

    return {
      total: students.length,
      actifs: actifs.length,
      nouveauxCeMois: nouveauxCeMois.length,
      annules: annules.length,
      rembourses: rembourses.length,
      termines: termines.length,
      finProche: finProche.length,
      totalCAPrev,
      totalEncaisse,
      totalReste,
      tauxRecouvrement,
      valeurMoyenne,
      last12,
      caComparaison,
      pieData,
      topCA,
      enRetard,
      prochainsP,
      finProcheList: students.filter(s => {
        const p = getCoachingProgress(s)
        return p.isNearEnd && !p.isComplete
      }).map(s => ({ student: s, progress: getCoachingProgress(s) }))
        .sort((a, b) => a.progress.daysLeft - b.progress.daysLeft),
    }
  }, [students])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const tabs = [
    { id: 'apercu', label: '📊 Aperçu' },
    { id: 'financier', label: '💰 Financier' },
    { id: 'coaching', label: '🎯 Coaching' },
    { id: 'alertes', label: `🔔 Alertes ${stats.finProche + stats.prochainsP.length > 0 ? `(${stats.finProche + stats.prochainsP.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
            >
              <ArrowLeft size={16} />
              Admin
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2">
              <BarChart2 size={20} className="text-orange-400" />
              <h1 className="text-lg font-bold text-white">Analytics Paiements</h1>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition border border-gray-700 rounded-lg px-3 py-1.5 hover:border-gray-500"
          >
            <RefreshCcw size={13} />
            Actualiser
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === t.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ════════════════ ONGLET APERÇU ════════════════ */}
        {activeTab === 'apercu' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard icon={Users} label="Total élèves" value={stats.total} bg="bg-gray-800" color="text-gray-400" />
              <KpiCard icon={Zap} label="Actifs coaching" value={stats.actifs} sub="en cours" bg="bg-green-950" color="text-green-400" />
              <KpiCard icon={TrendingUp} label="Nouveaux ce mois" value={stats.nouveauxCeMois} bg="bg-blue-950" color="text-blue-400" />
              <KpiCard icon={Target} label="CA total prévu" value={fmtEuro(stats.totalCAPrev)} bg="bg-orange-950" color="text-orange-400" />
              <KpiCard icon={CheckCircle} label="Total encaissé" value={fmtEuro(stats.totalEncaisse)} bg="bg-emerald-950" color="text-emerald-400" />
              <KpiCard icon={Award} label="Taux recouvrement" value={`${stats.tauxRecouvrement}%`} sub={`${fmtEuro(stats.totalReste)} restant`} bg="bg-purple-950" color="text-purple-400" />
            </div>

            {/* Graphique élèves par mois */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-base font-bold text-white mb-1">Nouveaux élèves par mois</h2>
              <p className="text-xs text-gray-500 mb-5">12 derniers mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.last12} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEleves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="mois" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" élève(s)" />} />
                  <Area type="monotone" dataKey="eleves" name="Élèves" stroke="#f97316" strokeWidth={2.5} fill="url(#gradEleves)" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique CA par mois */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-base font-bold text-white mb-1">Chiffre d'affaires mensuel prévu</h2>
              <p className="text-xs text-gray-500 mb-5">Mensualités dues par mois (12 derniers mois)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.last12} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="mois" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip content={<CustomTooltip suffix="€" />} />
                  <Bar dataKey="ca" name="CA prévu" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition statuts + Top CA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie statuts */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-5">Répartition des élèves</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {stats.pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-gray-400">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{d.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-sm font-bold text-white">{stats.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 CA */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-base font-bold text-white mb-5">🏆 Top 5 — Plus grand CA</h2>
                <div className="space-y-3">
                  {stats.topCA.map(({ student: s, payment: p }, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600 w-4">#{i + 1}</span>
                      <div className="relative w-8 h-8 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full bg-orange-500"
                            style={{ width: `${p.prixTotal > 0 ? Math.min(100, Math.round(p.totalPaye / p.prixTotal * 100)) : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-400 shrink-0">{fmtEuro(p.prixTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════ ONGLET FINANCIER ════════════════ */}
        {activeTab === 'financier' && (
          <>
            {/* KPI financier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-orange-950 rounded-2xl p-6 border border-orange-900">
                <p className="text-xs text-orange-400 font-medium mb-2">CA total prévu</p>
                <p className="text-3xl font-bold text-orange-300">{fmtEuro(stats.totalCAPrev)}</p>
                <p className="text-xs text-orange-500 mt-1">Somme de toutes les formations</p>
              </div>
              <div className="bg-emerald-950 rounded-2xl p-6 border border-emerald-900">
                <p className="text-xs text-emerald-400 font-medium mb-2">Total encaissé</p>
                <p className="text-3xl font-bold text-emerald-300">{fmtEuro(stats.totalEncaisse)}</p>
                <p className="text-xs text-emerald-500 mt-1">{stats.tauxRecouvrement}% du CA prévu</p>
              </div>
              <div className="bg-amber-950 rounded-2xl p-6 border border-amber-900">
                <p className="text-xs text-amber-400 font-medium mb-2">Reste à percevoir</p>
                <p className="text-3xl font-bold text-amber-300">{fmtEuro(stats.totalReste)}</p>
                <p className="text-xs text-amber-500 mt-1">À collecter sur les prochains mois</p>
              </div>
              <div className="bg-blue-950 rounded-2xl p-6 border border-blue-900">
                <p className="text-xs text-blue-400 font-medium mb-2">Valeur moy. / coaching actif</p>
                <p className="text-3xl font-bold text-blue-300">{fmtEuro(stats.valeurMoyenne)}</p>
                <p className="text-xs text-blue-500 mt-1">Sur {stats.actifs} élèves actifs</p>
              </div>
            </div>

            {/* Barre de progression globale */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-white">Progression globale de recouvrement</h2>
                <span className="text-2xl font-bold text-orange-400">{stats.tauxRecouvrement}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000 flex items-center justify-end pr-3"
                  style={{ width: `${stats.tauxRecouvrement}%` }}
                >
                  {stats.tauxRecouvrement > 15 && <span className="text-xs font-bold text-white">{stats.tauxRecouvrement}%</span>}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0€</span>
                <span>{fmtEuro(stats.totalCAPrev)}</span>
              </div>
            </div>

            {/* Tableau détaillé par élève */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-base font-bold text-white mb-5">Détail financier par élève</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Élève</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Total prévu</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Encaissé</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Reste</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium hidden md:table-cell">Progression</th>
                      <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const p = computePayment(s)
                      if (!p.valide && !s.coaching_cancelled && !s.rembourse) return null
                      const pct = p.prixTotal > 0 ? Math.min(100, Math.round(p.totalPaye / p.prixTotal * 100)) : 0
                      const coaching = isInCoaching(s)
                      return (
                        <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="relative w-7 h-7 shrink-0">
                                <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                              </div>
                              <span className="font-medium text-white">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-300">{fmtEuro(p.prixTotal)}</td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-semibold">{fmtEuro(p.totalPaye)}</td>
                          <td className="py-3 px-3 text-right font-semibold" style={{ color: p.resteAPayer > 0 ? '#fbbf24' : '#34d399' }}>{fmtEuro(p.resteAPayer)}</td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {s.rembourse ? <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">Remb.</span>
                              : s.coaching_cancelled ? <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Annulé</span>
                              : coaching ? <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Actif</span>
                              : <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Terminé</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Élèves avec reste à payer */}
            {stats.enRetard.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-amber-900/50">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Élèves avec solde restant
                </h2>
                <p className="text-xs text-gray-500 mb-4">Paiements non encore perçus</p>
                <div className="space-y-2">
                  {stats.enRetard.slice(0, 8).map(({ student: s, payment: p }) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                          <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{s.name}</p>
                          <p className="text-xs text-gray-500">Encaissé : {fmtEuro(p.totalPaye)} / {fmtEuro(p.prixTotal)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{fmtEuro(p.resteAPayer)} restant</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════ ONGLET COACHING ════════════════ */}
        {activeTab === 'coaching' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Zap} label="Actifs" value={stats.actifs} bg="bg-green-950" color="text-green-400" />
              <KpiCard icon={CheckCircle} label="Terminés" value={stats.termines} bg="bg-gray-800" color="text-gray-400" />
              <KpiCard icon={XCircle} label="Annulés" value={stats.annules} bg="bg-red-950" color="text-red-400" />
              <KpiCard icon={Clock} label="Fin prochaine" value={stats.finProche} sub="< 30 jours" bg="bg-amber-950" color="text-amber-400" />
            </div>

            {/* Courbe élèves actifs */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-base font-bold text-white mb-1">Inscriptions par mois</h2>
              <p className="text-xs text-gray-500 mb-5">Historique des 12 derniers mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.last12} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="mois" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" élève(s)" />} />
                  <Line type="monotone" dataKey="eleves" name="Inscriptions" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Liste élèves actifs */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-base font-bold text-white mb-5">Élèves actuellement en coaching ({stats.actifs})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.filter(s => isInCoaching(s)).map(s => {
                  const prog = getCoachingProgress(s)
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${prog.isNearEnd ? 'bg-amber-400' : 'bg-orange-500'}`}
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{prog.daysLeft}j</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 shrink-0" />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ════════════════ ONGLET ALERTES ════════════════ */}
        {activeTab === 'alertes' && (
          <>
            {/* Fins de coaching imminentes */}
            {stats.finProcheList.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-amber-800/50">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  Fins de coaching imminentes ({stats.finProcheList.length})
                </h2>
                <p className="text-xs text-gray-500 mb-4">Élèves dont le coaching se termine dans moins de 30 jours</p>
                <div className="space-y-2">
                  {stats.finProcheList.map(({ student: s, progress: p }) => (
                    <div key={s.id} className="flex items-center gap-3 p-4 bg-amber-950/40 rounded-xl border border-amber-800/30 hover:bg-amber-950/60 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-amber-400 mt-0.5">⏱ Termine dans {p.daysLeft} jour{p.daysLeft > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Progression</p>
                        <p className="text-sm font-bold text-amber-400">{Math.round(p.percent)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prochains paiements */}
            {stats.prochainsP.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-blue-800/50">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-400" />
                  Paiements attendus dans les 30 prochains jours ({stats.prochainsP.length})
                </h2>
                <p className="text-xs text-gray-500 mb-4">Mensualités à venir non encore encaissées (mode manuel uniquement)</p>
                <div className="space-y-2">
                  {stats.prochainsP.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-blue-950/30 rounded-xl border border-blue-800/30 hover:bg-blue-950/50 transition cursor-pointer" onClick={() => router.push(`/artist/${item.student.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={item.student.photo_url} alt={item.student.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.student.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Mensualité {item.num} — {item.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{item.montant}€</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-sm">
                  <span className="text-gray-500">Total attendu</span>
                  <span className="font-bold text-blue-400">{fmtEuro(stats.prochainsP.reduce((a, p) => a + p.montant, 0))}</span>
                </div>
              </div>
            )}

            {/* Aucune alerte */}
            {stats.finProcheList.length === 0 && stats.prochainsP.length === 0 && (
              <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                <p className="text-white font-bold text-lg">Tout est en ordre !</p>
                <p className="text-gray-500 text-sm mt-1">Aucune alerte urgente pour le moment.</p>
              </div>
            )}

            {/* Élèves annulés */}
            {stats.annules > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-900/40">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <XCircle size={16} className="text-red-400" />
                  Coaching annulés ({stats.annules})
                </h2>
                <div className="space-y-2">
                  {students.filter(s => s.coaching_cancelled).map(s => {
                    const p = computePayment(s)
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 bg-red-950/30 rounded-xl hover:bg-red-950/50 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                        <div className="relative w-8 h-8 shrink-0">
                          <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{s.name}</p>
                          <p className="text-xs text-red-400 mt-0.5">Encaissé : {fmtEuro(p.totalPaye)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
