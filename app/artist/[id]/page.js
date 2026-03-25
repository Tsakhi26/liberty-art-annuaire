'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isInCoaching, getCoachingProgress, formatDate } from '@/lib/coaching'
import { Instagram, Facebook, Mail, ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
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
      {/* Badges d'alerte */}
      <div className="flex justify-between items-center mb-4">
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

      {/* Barre de progression 6 mois */}
      <div className="relative">
        <div className="flex gap-1 mb-2">
          {months.map((month) => {
            const monthStart = ((month - 1) / 6) * 100
            const monthEnd = (month / 6) * 100
            let fillClass = 'bg-gray-200'

            if (progress.percent >= monthEnd) {
              fillClass = 'bg-liberty-orange'
            } else if (progress.percent > monthStart) {
              // Mois en cours - remplissage partiel
              const monthProgress = ((progress.percent - monthStart) / (monthEnd - monthStart)) * 100
              return (
                <div key={month} className="flex-1 relative">
                  <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-liberty-orange rounded-l-lg transition-all duration-500"
                      style={{ width: `${monthProgress}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-sm">
                      Mois {month}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div key={month} className="flex-1 relative">
                <div className={`h-8 ${fillClass} rounded-lg`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${progress.percent >= monthEnd ? 'text-white' : 'text-gray-400'}`}>
                    Mois {month}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Indicateur du pourcentage */}
        <div className="text-center mt-3">
          <span className="text-2xl font-bold text-liberty-orange">{Math.round(progress.percent)}%</span>
          <span className="text-gray-500 text-sm ml-2">du coaching complété</span>
        </div>
      </div>
    </div>
  )
}

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchStudent()
    }
  }, [params.id])

  async function fetchStudent() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error:', error)
    } else {
      setStudent(data)
    }
    setLoading(false)
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-liberty-orange via-orange-400 to-amber-300 pt-6 pb-16">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative container mx-auto px-4">
          {/* Retour */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/90 hover:text-white transition mb-4 text-sm"
          >
            <ArrowLeft size={18} />
            Retour
          </button>

          <div className="text-center">
            {/* Photo */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <Image
                src={student.photo_url}
                alt={student.name}
                fill
                className="rounded-full object-cover border-4 border-white shadow-2xl"
                unoptimized
              />
              {coaching && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle size={12} />
                  Coaching actif
                </div>
              )}
            </div>

            {/* Nom */}
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {student.name}
            </h1>

            {/* Badges */}
            <div className="flex justify-center gap-2 mt-3">
              {coaching ? (
                <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full border border-white/30">
                  En coaching actif
                </span>
              ) : (
                <span className="bg-white/20 backdrop-blur-sm text-white/80 text-sm font-semibold px-4 py-1.5 rounded-full border border-white/20">
                  Coaching terminé
                </span>
              )}
              {progress.isNearEnd && (
                <span className="bg-red-500/80 backdrop-blur-sm text-white text-sm font-bold px-4 py-1.5 rounded-full animate-pulse">
                  ⚠ Plus que {progress.daysLeft > 30 ? '1 mois' : `${progress.daysLeft} jours`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 container mx-auto px-4 -mt-12 pb-16">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Carte Bio */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              À propos
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {student.bio || 'Aucune biographie renseignée.'}
            </p>
          </div>

          {/* Carte Contact & Réseaux */}
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
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Instagram</p>
                    <p className="text-sm text-gray-700 font-semibold">Voir le profil</p>
                  </div>
                </a>
              )}

              {student.fb_url && (
                <a href={student.fb_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition group">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                    <Facebook size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Facebook</p>
                    <p className="text-sm text-gray-700 font-semibold">Voir le profil</p>
                  </div>
                </a>
              )}

              {student.tiktok_url && (
                <a href={student.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-gray-300 transition">
                    <SiTiktok size={20} className="text-gray-800" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">TikTok</p>
                    <p className="text-sm text-gray-700 font-semibold">Voir le profil</p>
                  </div>
                </a>
              )}

              {student.google_drive_url && (
                <a href={student.google_drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-green-50 transition group">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                    <img src="https://logos-marques.com/wp-content/uploads/2023/09/Google-Drive-logo-thmb-150x150.png" alt="Drive" width="20" height="20" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Google Drive</p>
                    <p className="text-sm text-gray-700 font-semibold">Voir le dossier</p>
                  </div>
                </a>
              )}
            </div>

            {!student.insta_url && !student.fb_url && !student.tiktok_url && !student.google_drive_url && (
              <p className="text-gray-400 text-center py-4">Aucun contact renseigné</p>
            )}
          </div>

          {/* Carte Suivi Coaching */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              Suivi du coaching
            </h2>
            <CoachingProgressBar student={student} />
          </div>

          {/* Carte Infos complémentaires */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-liberty-orange rounded-full inline-block"></span>
              Informations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">Inscrit le</p>
                <p className="text-sm font-bold text-gray-700">{formatDate(student.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">Début coaching</p>
                <p className="text-sm font-bold text-gray-700">{formatDate(student.date_debut_coaching)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">Fin coaching</p>
                <p className="text-sm font-bold text-gray-700">{formatDate(student.date_fin_coaching)}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
