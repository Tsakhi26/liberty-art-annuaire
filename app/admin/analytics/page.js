'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isInCoaching, isNew, getCoachingProgress } from '@/lib/coaching'
import Image from 'next/image'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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
  const dateCreation = parseDateCreationNotion(student.date_creation_notion)
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
      const d = new Date(dateCreation.getTime())
      d.setMonth(d.getMonth() + i)
      if (now >= d) nbPayees++
    }
  }

  const totalPaye = nbPayees * mensualite
  const resteAPayer = coachingCancelled ? 0 : prixTotal - totalPaye
  const prixTotalDisplay = coachingCancelled ? totalPaye : prixTotal

  return { totalPaye, resteAPayer, prixTotal: prixTotalDisplay, mensualite, valide: true }
}

function fmtEuro(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k€`
  return `${n}€`
}

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function parseDateCreationNotion(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Garde la date en timezone locale quand Supabase renvoie YYYY-MM-DD.
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, y, m, d] = match
      return new Date(Number(y), Number(m) - 1, Number(d))
    }
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// ── KPI Card — thème clair ──
function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor, valuColor }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className={`text-2xl font-bold mb-0.5 ${valuColor || 'text-gray-900'}`}>{value}</p>
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toLocaleString()}{suffix}
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
  const [caModal, setCaModal] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('admin_logged_in')) {
      router.push('/admin/login')
      return
    }
    fetchAll()
  }, [])

  async function fetchAll() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('date_creation_notion', { ascending: true })
    if (!error) setStudents(data || [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    if (!students.length) return null

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    // ── Nouveaux ce mois basé sur date_creation_notion ──
    const nouveauxCeMois = students.filter(s => {
      const d = parseDateCreationNotion(s.date_creation_notion)
      if (!d) return false
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })

    const actifs = students.filter(s => isInCoaching(s))
    const annules = students.filter(s => s.coaching_cancelled)
    const rembourses = students.filter(s => s.rembourse)
    const termines = students.filter(s => {
      const prog = getCoachingProgress(s)
      return prog.isComplete && !s.coaching_cancelled
    })
    const finProcheList = students.filter(s => {
      const p = getCoachingProgress(s)
      return p.isNearEnd && !p.isComplete
    }).map(s => ({ student: s, progress: getCoachingProgress(s) }))
      .sort((a, b) => a.progress.daysLeft - b.progress.daysLeft)

    // ── Financier ──
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
      ? Math.round(
          paymentsByStudent
            .filter(p => isInCoaching(p.student))
            .reduce((a, p) => a + p.payment.prixTotal, 0) / actifs.length
        )
      : 0

    const caForMonth = (month, year) => {
      let caMois = 0
      students.forEach(s => {
        if (!s.prix_total) return
        const dateCreation = parseDateCreationNotion(s.date_creation_notion)
        if (!dateCreation) return
        const nbFois = s.nb_paiements || 1
        const mensualite = Math.round(s.prix_total / nbFois)
        for (let j = 0; j < nbFois; j++) {
          const dEch = new Date(dateCreation.getTime())
          dEch.setMonth(dEch.getMonth() + j)
          if (dEch.getMonth() === month && dEch.getFullYear() === year) {
            caMois += mensualite
          }
        }
      })
      return caMois
    }

    // ── Graphiques 12 derniers mois — basé sur date_creation_notion ──
    const last12 = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      // Nouveaux élèves via date_creation_notion
      const count = students.filter(s => {
        const sd = parseDateCreationNotion(s.date_creation_notion)
        if (!sd) return false
        return sd.getMonth() === m && sd.getFullYear() === y
      }).length

      const caMois = caForMonth(m, y)

      last12.push({
        mois: `${MOIS[m]}${y !== thisYear ? ` ${y}` : ''}`,
        eleves: count,
        ca: caMois,
      })
    }

    // ── CA glissant 12 mois: 8 mois passé/courant + 4 mois futurs ──
    // Règle simple:
    // - passé + courant => uniquement encaissé
    // - futurs 4 mois   => uniquement à percevoir
    const caProjectionMap = new Map()
    for (let offset = -7; offset <= 4; offset++) {
      const d = new Date(thisYear, thisMonth + offset, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const key = `${y}-${m}`
      const isPastOrCurrent = offset <= 0
      caProjectionMap.set(key, {
        key,
        date: d,
        mois: `${MOIS[m]}${y !== thisYear ? ` ${y}` : ''}`,
        type: isPastOrCurrent ? 'encaisse' : 'a_percevoir',
        montant: 0,
        details: [],
      })
    }

    students.forEach(s => {
      if (!s.prix_total || s.rembourse) return
      const dateCreation = parseDateCreationNotion(s.date_creation_notion)
      if (!dateCreation) return

      const nbFois = s.nb_paiements || 1
      const mensualite = Math.round(s.prix_total / nbFois)
      const paiementManuel = s.paiement_manuel || false
      const paiementsManuelsJson = s.paiements_manuels_json || {}

      for (let j = 0; j < nbFois; j++) {
        const dEch = new Date(dateCreation.getTime())
        dEch.setMonth(dEch.getMonth() + j)
        const key = `${dEch.getFullYear()}-${dEch.getMonth()}`
        const monthBucket = caProjectionMap.get(key)
        if (!monthBucket) continue

        const isPaid = paiementManuel ? !!paiementsManuelsJson[String(j + 1)] : now >= dEch
        const detail = {
          id: s.id,
          name: s.name,
          photo_url: s.photo_url,
          montant: mensualite,
          echeance: j + 1,
          date: dEch,
        }

        if (monthBucket.type === 'encaisse') {
          if (!isPaid) continue
          monthBucket.montant += mensualite
          monthBucket.details.push(detail)
        } else {
          if (isPaid) continue
          monthBucket.montant += mensualite
          monthBucket.details.push(detail)
        }
      }
    })

    const caProjection12 = Array.from(caProjectionMap.values())
      .sort((a, b) => a.date - b.date)

    // ── Pie statuts ──
    const pieData = [
      { name: 'Actifs', value: actifs.length, color: '#22c55e' },
      { name: 'Terminés', value: termines.length, color: '#f97316' },
      { name: 'Annulés', value: annules.length, color: '#ef4444' },
      { name: 'Remboursés', value: rembourses.length, color: '#a855f7' },
    ].filter(d => d.value > 0)

    const topCA = [...paymentsByStudent]
      .sort((a, b) => b.payment.prixTotal - a.payment.prixTotal)
      .slice(0, 5)

    const enRetard = paymentsByStudent
      .filter(p => p.payment.resteAPayer > 0 && !p.student.coaching_cancelled && !p.student.rembourse)
      .sort((a, b) => b.payment.resteAPayer - a.payment.resteAPayer)

    // ── Prochains paiements 30j ──
    const prochainsP = []
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    students.forEach(s => {
      if (!s.prix_total || s.coaching_cancelled || s.rembourse) return
      const dateCreation = parseDateCreationNotion(s.date_creation_notion)
      if (!dateCreation) return
      const nbFois = s.nb_paiements || 1
      const mensualite = Math.round(s.prix_total / nbFois)
      for (let j = 0; j < nbFois; j++) {
        const d = new Date(dateCreation.getTime())
        d.setMonth(d.getMonth() + j)
        if (d >= now && d <= in30) {
          const paye = s.paiement_manuel ? !!(s.paiements_manuels_json || {})[String(j + 1)] : false
          if (!paye) prochainsP.push({ student: s, date: d, montant: mensualite, num: j + 1 })
        }
      }
    })
    prochainsP.sort((a, b) => a.date - b.date)

    const paiementsManuelsList = students
      .filter(s => !!s.paiement_manuel)
      .sort((a, b) => {
        const da = parseDateCreationNotion(a.date_creation_notion)
        const db = parseDateCreationNotion(b.date_creation_notion)
        if (da && db) return db - da
        if (db) return 1
        if (da) return -1
        return (a.name || '').localeCompare(b.name || '', 'fr')
      })

    return {
      total: students.length,
      actifs: actifs.length,
      nouveauxCeMois: nouveauxCeMois.length,
      annules: annules.length,
      rembourses: rembourses.length,
      termines: termines.length,
      finProche: finProcheList.length,
      totalCAPrev,
      totalEncaisse,
      totalReste,
      tauxRecouvrement,
      valeurMoyenne,
      last12,
      caProjection12,
      pieData,
      topCA,
      enRetard,
      prochainsP,
      paiementsManuelsList,
      finProcheList,
      paymentsByStudent,
    }
  }, [students])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des analytics...</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const tabs = [
    { id: 'apercu', label: '📊 Aperçu' },
    { id: 'financier', label: '💰 Financier' },
    { id: 'coaching', label: '🎯 Coaching' },
    { id: 'alertes', label: `🔔 Alertes${stats.finProche + stats.prochainsP.length + stats.paiementsManuelsList.length > 0 ? ` (${stats.finProche + stats.prochainsP.length + stats.paiementsManuelsList.length})` : ''}` },
  ]

  function openCaModal(barEvent) {
    const payload = barEvent?.payload
    if (!payload) return
    const details = payload.details || []
    if (!details.length) return

    setCaModal({
      mois: payload.mois,
      type: payload.type,
      total: payload.montant || 0,
      details: [...details].sort((a, b) => b.montant - a.montant || (a.name || '').localeCompare(b.name || '', 'fr')),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Admin
            </button>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <BarChart2 size={20} className="text-orange-500" />
              <h1 className="text-lg font-bold text-gray-900">Analytics Paiements</h1>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition border border-gray-300 rounded-lg px-3 py-1.5 hover:border-gray-400 bg-white"
          >
            <RefreshCcw size={13} />
            Actualiser
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === t.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ════════════════ APERÇU ════════════════ */}
        {activeTab === 'apercu' && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard icon={Users}       label="Total élèves"      value={stats.total}                    iconBg="bg-gray-100"    iconColor="text-gray-500"   />
              <KpiCard icon={Zap}         label="Actifs coaching"   value={stats.actifs}   sub="en cours"  iconBg="bg-green-100"   iconColor="text-green-600"  valuColor="text-green-700" />
              <KpiCard icon={TrendingUp}  label="Nouveaux ce mois"  value={stats.nouveauxCeMois}           iconBg="bg-blue-100"    iconColor="text-blue-600"   valuColor="text-blue-700" />
              <KpiCard icon={Target}      label="CA total prévu"    value={fmtEuro(stats.totalCAPrev)}     iconBg="bg-orange-100"  iconColor="text-orange-600" valuColor="text-orange-600" />
              <KpiCard icon={CheckCircle} label="Total encaissé"    value={fmtEuro(stats.totalEncaisse)}   iconBg="bg-emerald-100" iconColor="text-emerald-600" valuColor="text-emerald-700" />
              <KpiCard icon={Award}       label="Taux recouvrement" value={`${stats.tauxRecouvrement}%`}  sub={`${fmtEuro(stats.totalReste)} restant`} iconBg="bg-purple-100" iconColor="text-purple-600" valuColor="text-purple-700" />
            </div>

            {/* Graphique nouveaux élèves */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Nouveaux élèves par mois</h2>
              <p className="text-xs text-gray-400 mb-5">Basé sur la date de création Notion — 12 derniers mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.last12} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEleves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="mois" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" élève(s)" />} />
                  <Area type="monotone" dataKey="eleves" name="Élèves" stroke="#f97316" strokeWidth={2.5} fill="url(#gradEleves)" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique CA */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Chiffre d'affaires mensuel prévu</h2>
              <p className="text-xs text-gray-400 mb-5">Passé + mois courant: encaissé (orange). 4 mois futurs: à percevoir (vert).</p>
              <div className="flex items-center gap-4 text-xs mb-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Encaisse
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  A percevoir
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.caProjection12} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="mois" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip content={<CustomTooltip suffix="€" />} />
                  <Bar dataKey="montant" name="Montant" radius={[8, 8, 0, 0]} onClick={openCaModal} cursor="pointer">
                    {stats.caProjection12.map((item, i) => (
                      <Cell key={i} fill={item.type === 'encaisse' ? '#f97316' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie + Top CA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-5">Répartition des élèves</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {stats.pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-gray-600">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                      <span className="text-xs text-gray-400">Total</span>
                      <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-5">🏆 Top 5 — Plus grand CA</h2>
                <div className="space-y-3">
                  {stats.topCA.map(({ student: s, payment: p }, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <div className="relative w-8 h-8 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${p.prixTotal > 0 ? Math.min(100, Math.round(p.totalPaye / p.prixTotal * 100)) : 0}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-600 shrink-0">{fmtEuro(p.prixTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════ FINANCIER ════════════════ */}
        {activeTab === 'financier' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'CA total prévu', val: fmtEuro(stats.totalCAPrev), sub: 'Somme de toutes les formations', bg: 'bg-orange-50', border: 'border-orange-200', tc: 'text-orange-600', sc: 'text-orange-400' },
                { label: 'Total encaissé', val: fmtEuro(stats.totalEncaisse), sub: `${stats.tauxRecouvrement}% du CA prévu`, bg: 'bg-emerald-50', border: 'border-emerald-200', tc: 'text-emerald-700', sc: 'text-emerald-500' },
                { label: 'Reste à percevoir', val: fmtEuro(stats.totalReste), sub: 'À collecter sur les prochains mois', bg: 'bg-amber-50', border: 'border-amber-200', tc: 'text-amber-700', sc: 'text-amber-500' },
                { label: 'Valeur moy. / coaching', val: fmtEuro(stats.valeurMoyenne), sub: `Sur ${stats.actifs} élèves actifs`, bg: 'bg-blue-50', border: 'border-blue-200', tc: 'text-blue-700', sc: 'text-blue-400' },
              ].map((c, i) => (
                <div key={i} className={`${c.bg} rounded-2xl p-6 border ${c.border}`}>
                  <p className={`text-xs font-medium mb-2 ${c.sc}`}>{c.label}</p>
                  <p className={`text-3xl font-bold ${c.tc}`}>{c.val}</p>
                  <p className={`text-xs mt-1 ${c.sc}`}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Barre progression globale */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-gray-900">Progression globale de recouvrement</h2>
                <span className="text-2xl font-bold text-orange-500">{stats.tauxRecouvrement}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000 flex items-center justify-end pr-3"
                  style={{ width: `${stats.tauxRecouvrement}%` }}
                >
                  {stats.tauxRecouvrement > 15 && <span className="text-xs font-bold text-white">{stats.tauxRecouvrement}%</span>}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>0€</span>
                <span>{fmtEuro(stats.totalCAPrev)}</span>
              </div>
            </div>

            {/* Tableau détaillé */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-5">Détail financier par élève</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Élève</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Total prévu</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Encaissé</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Reste</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium hidden md:table-cell">Progression</th>
                      <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.paymentsByStudent.map(({ student: s, payment: p }) => {
                      const pct = p.prixTotal > 0 ? Math.min(100, Math.round(p.totalPaye / p.prixTotal * 100)) : 0
                      const coaching = isInCoaching(s)
                      return (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="relative w-7 h-7 shrink-0">
                                <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                              </div>
                              <span className="font-medium text-gray-800">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700">{fmtEuro(p.prixTotal)}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{fmtEuro(p.totalPaye)}</td>
                          <td className="py-3 px-3 text-right font-semibold" style={{ color: p.resteAPayer > 0 ? '#d97706' : '#16a34a' }}>{fmtEuro(p.resteAPayer)}</td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {s.rembourse ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Remb.</span>
                              : s.coaching_cancelled ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Annulé</span>
                              : coaching ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>
                              : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Terminé</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Soldes restants */}
            {stats.enRetard.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Élèves avec solde restant
                </h2>
                <p className="text-xs text-gray-400 mb-4">Paiements non encore perçus</p>
                <div className="space-y-2">
                  {stats.enRetard.slice(0, 8).map(({ student: s, payment: p }) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition cursor-pointer border border-amber-100" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                          <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-500">Encaissé : {fmtEuro(p.totalPaye)} / {fmtEuro(p.prixTotal)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-600">{fmtEuro(p.resteAPayer)} restant</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════ COACHING ════════════════ */}
        {activeTab === 'coaching' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Zap}         label="Actifs"       value={stats.actifs}   iconBg="bg-green-100"  iconColor="text-green-600"  valuColor="text-green-700" />
              <KpiCard icon={CheckCircle} label="Terminés"     value={stats.termines} iconBg="bg-gray-100"   iconColor="text-gray-500" />
              <KpiCard icon={XCircle}     label="Annulés"      value={stats.annules}  iconBg="bg-red-100"    iconColor="text-red-600"    valuColor="text-red-700" />
              <KpiCard icon={Clock}       label="Fin prochaine" value={stats.finProche} sub="< 30 jours" iconBg="bg-amber-100" iconColor="text-amber-600" valuColor="text-amber-700" />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Inscriptions par mois</h2>
              <p className="text-xs text-gray-400 mb-5">Basé sur date_creation_notion — 12 derniers mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.last12} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="mois" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip suffix=" élève(s)" />} />
                  <Line type="monotone" dataKey="eleves" name="Inscriptions" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-5">Élèves en coaching ({stats.actifs})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.filter(s => isInCoaching(s)).map(s => {
                  const prog = getCoachingProgress(s)
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer border border-gray-100" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${prog.isNearEnd ? 'bg-amber-400' : 'bg-orange-500'}`} style={{ width: `${prog.percent}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{prog.daysLeft}j</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ════════════════ ALERTES ════════════════ */}
        {activeTab === 'alertes' && (
          <>
            {stats.finProcheList.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  Fins de coaching imminentes ({stats.finProcheList.length})
                </h2>
                <p className="text-xs text-gray-400 mb-4">Élèves dont le coaching se termine dans moins de 30 jours</p>
                <div className="space-y-2">
                  {stats.finProcheList.map(({ student: s, progress: p }) => (
                    <div key={s.id} className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-amber-600 mt-0.5">⏱ Termine dans {p.daysLeft} jour{p.daysLeft > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Progression</p>
                        <p className="text-sm font-bold text-amber-600">{Math.round(p.percent)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.prochainsP.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  Paiements attendus — 30 prochains jours ({stats.prochainsP.length})
                </h2>
                <p className="text-xs text-gray-400 mb-4">Mensualités à venir non encore encaissées (mode manuel)</p>
                <div className="space-y-2">
                  {stats.prochainsP.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition cursor-pointer" onClick={() => router.push(`/artist/${item.student.id}`)}>
                      <div className="relative w-10 h-10 shrink-0">
                        <Image src={item.student.photo_url} alt={item.student.name} fill className="rounded-full object-cover" unoptimized />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{item.student.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Mensualité {item.num} — {item.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{item.montant}€</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">Total attendu</span>
                  <span className="font-bold text-blue-600">{fmtEuro(stats.prochainsP.reduce((a, p) => a + p.montant, 0))}</span>
                </div>
              </div>
            )}

            {stats.paiementsManuelsList.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-indigo-500" />
                  Paiements en mode manuel ({stats.paiementsManuelsList.length})
                </h2>
                <p className="text-xs text-gray-400 mb-4">Élèves dont le suivi de paiement est passé en manuel</p>
                <div className="space-y-2">
                  {stats.paiementsManuelsList.map(s => {
                    const p = computePayment(s)
                    const nbFois = s.nb_paiements || 1
                    const nbPayees = p.mensualite > 0 ? Math.min(nbFois, Math.round(p.totalPaye / p.mensualite)) : 0
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition cursor-pointer" onClick={() => router.push(`/artist/${s.id}`)}>
                        <div className="relative w-10 h-10 shrink-0">
                          <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Échéances validées : {nbPayees}/{nbFois}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Reste</p>
                          <p className="text-sm font-bold text-indigo-600">{fmtEuro(p.resteAPayer)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {stats.finProcheList.length === 0 && stats.prochainsP.length === 0 && stats.paiementsManuelsList.length === 0 && (
              <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                <p className="text-gray-800 font-bold text-lg">Tout est en ordre !</p>
                <p className="text-gray-400 text-sm mt-1">Aucune alerte urgente pour le moment.</p>
              </div>
            )}

            {stats.annules > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <XCircle size={16} className="text-red-500" />
                  Coaching annulés ({stats.annules})
                </h2>
                <div className="space-y-2">
                  {students.filter(s => s.coaching_cancelled).map(s => {
                    const p = computePayment(s)
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl hover:bg-red-100 transition cursor-pointer border border-red-100" onClick={() => router.push(`/artist/${s.id}`)}>
                        <div className="relative w-8 h-8 shrink-0">
                          <Image src={s.photo_url} alt={s.name} fill className="rounded-full object-cover" unoptimized />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-red-500 mt-0.5">Encaissé : {fmtEuro(p.totalPaye)}</p>
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

      {caModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCaModal(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {caModal.type === 'encaisse' ? 'Encaissements' : 'A percevoir'} — {caModal.mois}
                </h3>
                <p className="text-sm text-gray-500">
                  Total: <span className={`font-semibold ${caModal.type === 'encaisse' ? 'text-orange-600' : 'text-green-600'}`}>{caModal.total.toLocaleString('fr-FR')}€</span>
                </p>
              </div>
              <button
                onClick={() => setCaModal(null)}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5"
              >
                Fermer
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto max-h-[58vh]">
              {caModal.details.map((item, i) => (
                <div
                  key={`${item.id}-${item.echeance}-${i}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setCaModal(null)
                    router.push(`/artist/${item.id}`)
                  }}
                >
                  <div className="relative w-9 h-9 shrink-0">
                    <Image src={item.photo_url} alt={item.name} fill className="rounded-full object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Echeance {item.echeance} — {item.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${caModal.type === 'encaisse' ? 'text-orange-600' : 'text-green-600'}`}>
                    {item.montant.toLocaleString('fr-FR')}€
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
