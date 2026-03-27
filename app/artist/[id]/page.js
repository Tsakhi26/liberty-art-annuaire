'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isInCoaching, getCoachingProgress, formatDate } from '@/lib/coaching'
import {
  Instagram, Facebook, ArrowLeft, Calendar, Clock, AlertTriangle,
  CheckCircle, LogOut, CreditCard, Euro, Edit, Pencil, StickyNote,
  XCircle, RefreshCcw,
} from 'lucide-react'
import { SiTiktok } from 'react-icons/si'
import Image from 'next/image'

function CoachingProgressBar({ student }) {
  const progress = getCoachingProgress(student)

  if (!progress.hasData) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-gray-500">Dates de coaching non définies</p>
      </div>
    )
  }

  const months = [1, 2, 3, 4, 5, 6]

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>{formatDate(student.date_debut_coaching)}</span>
          <span className="text-gray-400 mx-1">→</span>
          <span>{formatDate(student.date_fin_coaching)}</span>
        </div>
        {progress.isComplete ? (
          <span className="flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-bold px-4 py-1.5 rounded-full">
            <CheckCircle size={14} />
            Coaching terminé
          </span>
        ) : progress.isNearEnd ? (
          <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-bold px-4 py-1.5 rounded-full animate-pulse">
            <AlertTriangle size={14} />
            Plus que {progress.daysLeft} jour{progress.daysLeft > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
            <Clock size={14} />
            {progress.daysLeft} jour{progress.daysLeft > 1 ? 's' : ''} restant{progress.daysLeft > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-1 mb-2">
          {months.map((month) => {
            const monthStart = ((month - 1) / 6) * 100
            const monthEnd = (month / 6) * 100

            if (progress.percent >= monthEnd) {
              return (
                <div key={month} className="flex-1 relative">
                  <div className="h-8 bg-liberty-orange rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">Mois {month}</span>
                  </div>
                </div>
              )
            } else if (progress.percent > monthStart) {
              const monthProgress = ((progress.percent - monthStart) / (monthEnd - monthStart)) * 100
              return (
                <div key={month} className="flex-1 relative">
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div className="h-full bg-liberty-orange rounded-l-lg transition-all duration-500" style={{ width: `${monthProgress}%` }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-sm">Mois {month}</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={month} className="flex-1 relative">
                <div className="h-8 bg-gray-200 rounded-lg" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">Mois {month}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-3">
          <span className="text-2xl font-bold text-liberty-orange">{Math.round(progress.percent)}%</span>
          <span className="text-gray-500 text-sm ml-2">du coaching complété</span>
        </div>
      </div>
    </div>
  )
}

function PaymentSection({
  payment,
  isAdmin,
  // Manuel mode
  onToggleManuel,
  togglingManuel,
  manuelChecks,
  onToggleEcheance,
  manuelNote,
  onNoteChange,
  savingNote,
  // Annulation coaching
  onToggleCancelCoaching,
  togglingCancel,
  // Remboursement
  onToggleRembourse,
  togglingRembourse,
}) {
  const [noteEditing, setNoteEditing] = useState(false)
  const [localNote, setLocalNote] = useState(manuelNote || '')
  const [confirmRembourse, setConfirmRembourse] = useState(false)

  useEffect(() => {
    setLocalNote(manuelNote || '')
  }, [manuelNote])

  if (!payment || !payment.found) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <Euro className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-gray-500">Informations de paiement non disponibles</p>
      </div>
    )
  }

  const isManuel = payment.paiement_manuel
  const isCancelled = payment.coaching_cancelled
  const isRembourse = payment.rembourse

  // Recalcul totaux en mode manuel (local, instantané)
  const echeancesDisplay = payment.echeances.map((e) => ({
    ...e,
    paye: isManuel ? !!manuelChecks[String(e.numero)] : e.paye,
  }))

  const nbPayees = isManuel ? echeancesDisplay.filter((e) => e.paye).length : payment.nb_mensualites_payees
  const totalPaye = isRembourse ? 0 : (isManuel ? nbPayees * payment.mensualite : payment.total_paye)
  const resteAPayer = isRembourse ? 0 : (isCancelled ? 0 : (isManuel ? payment.prix_total - totalPaye : payment.reste_a_payer))
  // Coaching annulé → prix total = ce qui a été encaissé
  const prixTotalDisplay = isRembourse ? 0 : (isCancelled ? totalPaye : payment.prix_total)
  const soldeOK = isRembourse || isCancelled || resteAPayer <= 0
  const progressPercent = isRembourse ? 0
    : isCancelled ? (totalPaye > 0 ? 100 : 0)
    : payment.prix_total > 0 ? Math.min(100, Math.round((totalPaye / payment.prix_total) * 100))
    : 0

  return (
    <div>
      {/* ── Bannière REMBOURSÉ ── */}
      {isRembourse && (
        <div className="mb-5 p-4 rounded-xl bg-purple-50 border-2 border-purple-300 flex items-center gap-3">
          <RefreshCcw size={20} className="text-purple-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-purple-800 text-sm">Remboursement effectué</p>
            <p className="text-xs text-purple-600 mt-0.5">Tous les montants ont été remis à zéro</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => onToggleRembourse()}
              disabled={togglingRembourse}
              className="text-xs text-purple-600 underline hover:text-purple-800 transition disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      )}

      {/* ── Bannière COACHING ANNULÉ ── */}
      {isCancelled && !isRembourse && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-3">
          <XCircle size={20} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-700 text-sm">Coaching annulé — Reste à payer remis à 0</p>
          </div>
        </div>
      )}

      {/* ── Toggle mode manuel ── */}
      {isAdmin && !isRembourse && (
        <div className={`mb-4 p-4 rounded-xl border-2 flex items-center justify-between gap-3 ${isManuel ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
          <div>
            <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Pencil size={14} className={isManuel ? 'text-blue-600' : 'text-gray-400'} />
              Suivi manuel des paiements
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isManuel ? '✏️ Mode manuel actif — vous cochez les mensualités vous-même' : '🤖 Mode auto — calcul selon la date'}
            </p>
          </div>
          <button
            onClick={onToggleManuel}
            disabled={togglingManuel}
            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${isManuel ? 'bg-blue-500' : 'bg-gray-300'} disabled:opacity-50`}
          >
            <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${isManuel ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      )}

      {/* ── Résumé financier ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-medium mb-1">Total encaissé</p>
          <p className="text-2xl font-bold text-green-700">{totalPaye}€</p>
        </div>
        <div className={`rounded-xl p-4 text-center ${resteAPayer === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
          <p className={`text-xs font-medium mb-1 ${resteAPayer === 0 ? 'text-green-600' : 'text-amber-600'}`}>Reste à payer</p>
          <p className={`text-2xl font-bold ${resteAPayer === 0 ? 'text-green-700' : 'text-amber-700'}`}>{resteAPayer}€</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-medium mb-1">Prix total</p>
          <p className="text-2xl font-bold text-blue-700">{prixTotalDisplay}€</p>
        </div>
      </div>

      {/* ── Barre de progression ── */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 font-medium">Progression des paiements</span>
          <span className="text-sm font-bold text-gray-800">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${soldeOK ? 'bg-green-500' : 'bg-liberty-orange'}`}
            style={{ width: `${isRembourse ? 0 : progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Solde OK badge ── */}
      {soldeOK && !isRembourse && !isCancelled && (
        <div className="bg-green-100 border border-green-200 rounded-xl p-3 mb-6 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          <span className="text-green-700 font-bold text-sm">Solde réglé en totalité</span>
        </div>
      )}

      {/* ── Échéancier ── */}
      {!isRembourse && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <CreditCard size={16} />
            Échéancier ({payment.nb_fois} paiement{payment.nb_fois > 1 ? 's' : ''} de {payment.mensualite}€)
            {isManuel && <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">Manuel</span>}
          </h3>
          <div className="space-y-2">
            {echeancesDisplay.map((e) => (
              <div
                key={e.numero}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  e.paye ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                } ${isManuel && isAdmin ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50' : ''}`}
                onClick={() => isManuel && isAdmin && onToggleEcheance(e.numero)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isManuel && isAdmin
                      ? (e.paye ? 'bg-green-500 border-2 border-green-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-400')
                      : (e.paye ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600')
                  }`}>
                    {e.paye ? '✓' : e.numero}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {payment.nb_fois === 1 ? 'Paiement unique' : `Mensualité ${e.numero}`}
                    </p>
                    <p className="text-xs text-gray-400">{e.date ? formatDate(e.date) : '-'}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className={`font-bold ${e.paye ? 'text-green-600' : 'text-gray-700'}`}>{e.montant}€</p>
                    <p className={`text-xs ${e.paye ? 'text-green-500' : 'text-gray-400'}`}>{e.paye ? 'Payé' : 'En attente'}</p>
                  </div>
                  {isManuel && isAdmin && (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${e.paye ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                      {e.paye && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mensualités restantes (mode auto) ── */}
      {!isManuel && !soldeOK && !isRembourse && !isCancelled && (
        <div className="mt-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <span className="text-amber-700 text-sm font-medium">
            {payment.nb_mensualites_restantes} mensualité{payment.nb_mensualites_restantes > 1 ? 's' : ''} restante{payment.nb_mensualites_restantes > 1 ? 's' : ''} ({resteAPayer}€)
          </span>
        </div>
      )}

      {/* ── Note (mode manuel) ── */}
      {isManuel && isAdmin && (
        <div className="mt-4 p-4 rounded-xl border-2 border-blue-100 bg-blue-50">
          <label className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
            <StickyNote size={14} />
            Note de règlement personnalisé
          </label>
          <textarea
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            onFocus={() => setNoteEditing(true)}
            placeholder="Ex : Paiement en 3x par virement, arrangement particulier..."
            rows={3}
            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white text-sm text-gray-800 resize-none"
          />
          {noteEditing && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { onNoteChange(localNote); setNoteEditing(false) }}
                disabled={savingNote}
                className="flex-1 bg-blue-500 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                {savingNote ? 'Enregistrement...' : 'Enregistrer la note'}
              </button>
              <button
                onClick={() => { setLocalNote(manuelNote || ''); setNoteEditing(false) }}
                className="px-4 bg-gray-200 text-gray-700 text-sm font-bold py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Boutons admin : Annuler coaching + Remboursé ── */}
      {isAdmin && (
        <div className="mt-5 pt-5 border-t-2 border-gray-100 space-y-3">

          {/* Toggle Annuler le coaching */}
          <div className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 ${isCancelled ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className="font-bold text-sm flex items-center gap-2" style={{ color: isCancelled ? '#b91c1c' : '#374151' }}>
                <XCircle size={14} className={isCancelled ? 'text-red-600' : 'text-gray-400'} />
                Annuler le coaching
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCancelled
                  ? 'Coaching annulé — le reste à payer est à 0'
                  : 'Retire la pastille verte et remet le reste à payer à 0'}
              </p>
            </div>
            <button
              onClick={onToggleCancelCoaching}
              disabled={togglingCancel}
              className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${isCancelled ? 'bg-red-500' : 'bg-gray-300'} disabled:opacity-50`}
            >
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${isCancelled ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Bouton Remboursé */}
          {!confirmRembourse ? (
            <button
              onClick={() => setConfirmRembourse(true)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition border-2 ${
                isRembourse
                  ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                  : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50'
              }`}
            >
              <RefreshCcw size={16} />
              {isRembourse ? 'Annuler le remboursement' : 'Marquer comme remboursé'}
            </button>
          ) : (
            <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50">
              <p className="text-sm font-bold text-purple-800 mb-3 text-center">
                {isRembourse
                  ? 'Annuler le remboursement et restaurer les montants ?'
                  : '⚠️ Remettre tous les montants à 0 (encaissé, reste, total) ?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onToggleRembourse(); setConfirmRembourse(false) }}
                  disabled={togglingRembourse}
                  className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {togglingRembourse ? '...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setConfirmRembourse(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [payment, setPayment] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  // Manuel mode
  const [togglingManuel, setTogglingManuel] = useState(false)
  const [manuelChecks, setManuelChecks] = useState({})
  const [manuelNote, setManuelNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Cancel coaching
  const [togglingCancel, setTogglingCancel] = useState(false)

  // Remboursement
  const [togglingRembourse, setTogglingRembourse] = useState(false)

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('admin_logged_in'))
  }, [])

  useEffect(() => {
    if (params.id) fetchStudent()
  }, [params.id])

  useEffect(() => {
    if (student && isAdmin) fetchPayment(student.id)
  }, [student, isAdmin])

  useEffect(() => {
    if (payment) {
      setManuelChecks(payment.paiements_manuels_json || {})
      setManuelNote(payment.note_paiement || '')
    }
  }, [payment])

  async function fetchStudent() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) console.error('Error:', error)
    else setStudent(data)
    setLoading(false)
  }

  async function fetchPayment(id) {
    setLoadingPayment(true)
    try {
      const res = await fetch(`/api/student-payment?id=${encodeURIComponent(id)}`, {
        headers: { 'x-admin-auth': 'liberty-art-sync' },
      })
      const data = await res.json()
      setPayment(data)
    } catch (err) {
      console.error('Payment fetch error:', err)
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleToggleManuel = async () => {
    if (!payment || !student) return
    setTogglingManuel(true)
    try {
      const { error } = await supabase.from('students').update({ paiement_manuel: !payment.paiement_manuel }).eq('id', student.id)
      if (error) throw error
      await fetchPayment(student.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du changement de mode')
    } finally {
      setTogglingManuel(false)
    }
  }

  const handleToggleEcheance = async (numero) => {
    if (!student || !payment?.paiement_manuel) return
    const key = String(numero)
    const newChecks = { ...manuelChecks, [key]: !manuelChecks[key] }
    setManuelChecks(newChecks)
    try {
      const { error } = await supabase.from('students').update({ paiements_manuels_json: newChecks }).eq('id', student.id)
      if (error) throw error
    } catch (err) {
      console.error(err)
      setManuelChecks(manuelChecks)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleNoteChange = async (note) => {
    if (!student) return
    setSavingNote(true)
    try {
      const { error } = await supabase.from('students').update({ note_paiement: note }).eq('id', student.id)
      if (error) throw error
      setManuelNote(note)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la sauvegarde de la note')
    } finally {
      setSavingNote(false)
    }
  }

  const handleToggleCancelCoaching = async () => {
    if (!student) return
    setTogglingCancel(true)
    const newValue = !student.coaching_cancelled
    try {
      const { error } = await supabase.from('students').update({ coaching_cancelled: newValue }).eq('id', student.id)
      if (error) throw error
      // Refresh student (for badge) AND payment (for reste à payer)
      await fetchStudent()
      await fetchPayment(student.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'annulation du coaching')
    } finally {
      setTogglingCancel(false)
    }
  }

  const handleToggleRembourse = async () => {
    if (!student || !payment) return
    setTogglingRembourse(true)
    const newValue = !payment.rembourse
    try {
      const { error } = await supabase.from('students').update({ rembourse: newValue }).eq('id', student.id)
      if (error) throw error
      await fetchPayment(student.id)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du remboursement')
    } finally {
      setTogglingRembourse(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    setIsAdmin(false)
  }

  const handleLogin = () => {
    router.push('/admin/login')
  }

  const openEditModal = () => {
    setEditFormData({
      name: student.name,
      email: student.email || '',
      bio: student.bio || '',
      insta_url: student.insta_url || '',
      fb_url: student.fb_url || '',
      tiktok_url: student.tiktok_url || '',
      google_drive_url: student.google_drive_url || '',
      date_debut_coaching: student.date_debut_coaching || '',
      date_fin_coaching: student.date_fin_coaching || '',
      coaching_cancelled: student.coaching_cancelled || false,
    })
    setEditPhotoPreview(student.photo_url)
    setEditPhoto(null)
    setShowEditModal(true)
  }

  const handleDebutCoachingChange = (value) => {
    const debut = new Date(value)
    const fin = new Date(debut)
    fin.setMonth(fin.getMonth() + 6)
    setEditFormData({ ...editFormData, date_debut_coaching: value, date_fin_coaching: fin.toISOString().split('T')[0] })
  }

  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => setEditPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let photoUrl = student.photo_url
      if (editPhoto) {
        const fileExt = editPhoto.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, editPhoto)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(fileName)
        photoUrl = publicUrl
        const oldFileName = student.photo_url.split('/').pop()
        await supabase.storage.from('student-photos').remove([oldFileName])
      }

      const { error } = await supabase.from('students').update({
        name: editFormData.name,
        email: editFormData.email || null,
        bio: editFormData.bio || null,
        insta_url: editFormData.insta_url || null,
        fb_url: editFormData.fb_url || null,
        tiktok_url: editFormData.tiktok_url || null,
        google_drive_url: editFormData.google_drive_url || null,
        date_debut_coaching: editFormData.date_debut_coaching || null,
        date_fin_coaching: editFormData.date_fin_coaching || null,
        coaching_cancelled: editFormData.coaching_cancelled || false,
        photo_url: photoUrl,
      }).eq('id', student.id)

      if (error) throw error
      alert('Profil modifié avec succès !')
      setShowEditModal(false)
      fetchStudent()
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liberty-orange"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 text-lg">Artiste non trouvé</p>
        <button onClick={() => router.push('/')} className="text-liberty-orange hover:underline flex items-center gap-2">
          <ArrowLeft size={18} /> Retour à la galerie
        </button>
      </div>
    )
  }

  const coaching = isInCoaching(student)
  const progress = getCoachingProgress(student)

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="relative pt-6 pb-16" style={{ background: 'linear-gradient(135deg, #ff751f 0%, #dc4a0f 40%, #1a1a1a 100%)' }}>
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative container mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/90 hover:text-white transition text-sm">
              <ArrowLeft size={18} />
              Retour
            </button>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 bg-white text-liberty-orange text-xs font-bold px-3 py-1.5 rounded-full hover:bg-orange-50 transition border border-white shadow-sm"
                  >
                    <Edit size={14} />
                    Modifier la fiche
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white/25 transition border border-white/20"
                  >
                    <LogOut size={14} />
                    Déconnexion admin
                  </button>
                </>
              ) : (
                <button onClick={handleLogin} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-white/25 transition border border-white/20">
                  Connexion admin
                </button>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <Image src={student.photo_url} alt={student.name} fill className="rounded-full object-cover border-4 border-white shadow-2xl" unoptimized />
              {coaching ? (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle size={12} />
                  Coaching actif
                </div>
              ) : progress.isComplete && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                  Coaching terminé
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{student.name}</h1>
            {progress.isNearEnd && (
              <div className="flex justify-center mt-3">
                <span className="bg-red-500/80 backdrop-blur-sm text-white text-sm font-bold px-4 py-1.5 rounded-full animate-pulse">
                  ⚠ Plus que {progress.daysLeft > 30 ? '1 mois' : `${progress.daysLeft} jours`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 -mt-12 pb-16">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              À propos
            </h2>
            <p className="text-gray-600 leading-relaxed">{student.bio || 'Aucune biographie renseignée.'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              Contact & Réseaux sociaux
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {student.insta_url && (
                <a href={student.insta_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-pink-50 transition group">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-pink-200 transition">
                    <Instagram size={20} className="text-pink-600" />
                  </div>
                  <div><p className="text-xs text-gray-400 font-medium">Instagram</p><p className="text-sm text-gray-700 font-semibold">Voir le profil</p></div>
                </a>
              )}
              {student.fb_url && (
                <a href={student.fb_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition group">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                    <Facebook size={20} className="text-blue-600" />
                  </div>
                  <div><p className="text-xs text-gray-400 font-medium">Facebook</p><p className="text-sm text-gray-700 font-semibold">Voir le profil</p></div>
                </a>
              )}
              {student.tiktok_url && (
                <a href={student.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-gray-300 transition">
                    <SiTiktok size={20} className="text-gray-800" />
                  </div>
                  <div><p className="text-xs text-gray-400 font-medium">TikTok</p><p className="text-sm text-gray-700 font-semibold">Voir le profil</p></div>
                </a>
              )}
              {student.google_drive_url && (
                <a href={student.google_drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-green-50 transition group">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                    <img src="https://logos-marques.com/wp-content/uploads/2023/09/Google-Drive-logo-thmb-150x150.png" alt="Drive" width="20" height="20" />
                  </div>
                  <div><p className="text-xs text-gray-400 font-medium">Google Drive</p><p className="text-sm text-gray-700 font-semibold">Voir le dossier</p></div>
                </a>
              )}
            </div>
            {!student.insta_url && !student.fb_url && !student.tiktok_url && !student.google_drive_url && (
              <p className="text-gray-400 text-center py-4">Aucun contact renseigné</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              Suivi du coaching
            </h2>
            <CoachingProgressBar student={student} />
          </div>

          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-dashed border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-6 bg-green-500 rounded-full inline-block"></span>
                  <Euro size={20} className="text-green-600" />
                  Suivi financier
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full ml-2">Admin</span>
                </h2>
              </div>
              {loadingPayment ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <p className="text-gray-400 text-sm mt-2">Chargement des données...</p>
                </div>
              ) : (
                <PaymentSection
                  payment={payment}
                  isAdmin={isAdmin}
                  onToggleManuel={handleToggleManuel}
                  togglingManuel={togglingManuel}
                  manuelChecks={manuelChecks}
                  onToggleEcheance={handleToggleEcheance}
                  manuelNote={manuelNote}
                  onNoteChange={handleNoteChange}
                  savingNote={savingNote}
                  onToggleCancelCoaching={handleToggleCancelCoaching}
                  togglingCancel={togglingCancel}
                  onToggleRembourse={handleToggleRembourse}
                  togglingRembourse={togglingRembourse}
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>

    {/* Modal modification — ferme en cliquant à l'extérieur */}
    {showEditModal && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowEditModal(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Modifier le profil de <span className="text-liberty-orange">{student?.name}</span>
            </h2>
            <form onSubmit={handleEditSubmit}>
              {editPhotoPreview && (
                <div className="mb-6 flex justify-center">
                  <div className="relative w-24 h-24">
                    <Image src={editPhotoPreview} alt="Preview" fill className="rounded-full object-cover border-4 border-liberty-orange" unoptimized />
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Photo</label>
                <input type="file" accept="image/*" onChange={handleEditPhotoChange} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Prénom *</label>
                <input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Email</label>
                <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} placeholder="votre@email.com" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Biographie</label>
                <textarea value={editFormData.bio} onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })} rows="4" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Instagram</label>
                <input type="url" value={editFormData.insta_url} onChange={(e) => setEditFormData({ ...editFormData, insta_url: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Facebook</label>
                <input type="url" value={editFormData.fb_url} onChange={(e) => setEditFormData({ ...editFormData, fb_url: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">TikTok</label>
                <input type="url" value={editFormData.tiktok_url} onChange={(e) => setEditFormData({ ...editFormData, tiktok_url: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Google Drive</label>
                <input type="url" value={editFormData.google_drive_url} onChange={(e) => setEditFormData({ ...editFormData, google_drive_url: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
              </div>
              <div className="border-t-2 border-gray-100 pt-4 mt-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Dates de coaching</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-900 font-bold mb-2">Début coaching</label>
                    <input type="date" value={editFormData.date_debut_coaching} onChange={(e) => handleDebutCoachingChange(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-gray-900 font-bold mb-2">Fin coaching</label>
                    <input type="date" value={editFormData.date_fin_coaching} onChange={(e) => setEditFormData({ ...editFormData, date_fin_coaching: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900" />
                    <p className="text-xs text-gray-400 mt-1">Auto-calculé (6 mois), modifiable</p>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-red-50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={editFormData.coaching_cancelled || false} onChange={(e) => setEditFormData({ ...editFormData, coaching_cancelled: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 peer-checked:bg-red-500 rounded-full transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <div>
                      <span className="font-bold text-red-700 text-sm">Annuler le coaching</span>
                      <p className="text-xs text-red-500 mt-0.5">Retire la pastille verte et ne compte plus dans les stats coaching</p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={saving} className="flex-1 bg-liberty-orange text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
