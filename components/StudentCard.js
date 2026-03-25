import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Facebook } from 'lucide-react'
import { SiTiktok } from 'react-icons/si'
import { isInCoaching, isNew, getCoachingProgress } from '@/lib/coaching'

export default function StudentCard({ student }) {
  const coaching = isInCoaching(student)
  const nouveau = isNew(student.created_at)
  const progress = getCoachingProgress(student)

  return (
    <Link href={`/artist/${student.id}`} className="block h-full">
      <div className="relative bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full flex flex-col">
        {nouveau && (
          <span className="absolute top-3 left-3 bg-liberty-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
            Nouveau
          </span>
        )}
        {progress.isNearEnd && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse z-10">
            ⚠ {progress.daysLeft}j
          </span>
        )}

        {/* Photo */}
        <div className="relative w-32 h-32 mx-auto mb-4 shrink-0">
          <Image
            src={student.photo_url}
            alt={student.name}
            fill
            className="rounded-full object-cover border-4 border-liberty-orange shadow-md"
            unoptimized
          />
          {coaching && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg" title="En coaching">
              ✓
            </div>
          )}
        </div>

        {/* Nom */}
        <h3 className="text-xl font-bold text-gray-800 mb-2 shrink-0">{student.name}</h3>

        {/* Bio - zone flexible */}
        <div className="flex-1 min-h-[3.5rem] mb-3">
          {student.bio && (
            <p className="text-sm text-gray-600 line-clamp-3 px-2">
              {student.bio}
            </p>
          )}
        </div>

        {/* Mini barre de progression coaching */}
        <div className="shrink-0 mb-3">
          {progress.hasData ? (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mx-auto max-w-[80%]">
              <div
                className={`h-1.5 rounded-full transition-all ${progress.isComplete ? 'bg-red-400' : progress.isNearEnd ? 'bg-amber-400' : 'bg-liberty-orange'}`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          ) : (
            <div className="h-1.5" />
          )}
        </div>

        {/* Icônes réseaux - toujours en bas */}
        <div className="flex justify-center items-center gap-4 shrink-0 min-h-[2.5rem]" onClick={(e) => e.preventDefault()}>
          {student.insta_url && (
            <a href={student.insta_url} target="_blank" rel="noopener noreferrer"
               className="text-pink-600 hover:text-pink-700 transition transform hover:scale-110"
               title="Instagram"
               onClick={(e) => e.stopPropagation()}>
              <Instagram size={32} />
            </a>
          )}
          {student.fb_url && (
            <a href={student.fb_url} target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:text-blue-700 transition transform hover:scale-110"
               title="Facebook"
               onClick={(e) => e.stopPropagation()}>
              <Facebook size={32} />
            </a>
          )}
          {student.tiktok_url && (
            <a href={student.tiktok_url} target="_blank" rel="noopener noreferrer"
               className="text-black hover:text-gray-700 transition transform hover:scale-110"
               title="TikTok"
               onClick={(e) => e.stopPropagation()}>
              <SiTiktok size={32} />
            </a>
          )}
          {student.google_drive_url && (
            <a href={student.google_drive_url} target="_blank" rel="noopener noreferrer"
               className="transition transform hover:scale-110"
               title="Google Drive"
               onClick={(e) => e.stopPropagation()}>
              <img
                src="https://logos-marques.com/wp-content/uploads/2023/09/Google-Drive-logo-thmb-150x150.png"
                alt="Google Drive"
                width="32"
                height="32"
                className="inline-block"
              />
            </a>
          )}
        </div>
      </div>
    </Link>
  )
}
