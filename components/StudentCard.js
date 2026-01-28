import Image from 'next/image'
import { Instagram, Facebook } from 'lucide-react'
import { SiTiktok } from 'react-icons/si'

export default function StudentCard({ student }) {
  const isInCoaching = (createdAt) => {
    const createdDate = new Date(createdAt)
    const sixMonthsLater = new Date(createdDate)
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)
    return new Date() <= sixMonthsLater
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <Image
          src={student.photo_url}
          alt={student.name}
          fill
          className="rounded-full object-cover border-4 border-liberty-orange shadow-md"
          unoptimized
        />
        {isInCoaching(student.created_at) && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg" title="En coaching">
            ✓
          </div>
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{student.name}</h3>
      
      {student.bio && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-3 px-2">
          {student.bio}
        </p>
      )}
      
      <div className="flex justify-center gap-4 mt-4">
        {student.insta_url && (
          <a href={student.insta_url} target="_blank" rel="noopener noreferrer" 
             className="text-pink-600 hover:text-pink-700 transition transform hover:scale-110"
             title="Instagram">
            <Instagram size={32} />
          </a>
        )}
        {student.fb_url && (
          <a href={student.fb_url} target="_blank" rel="noopener noreferrer"
             className="text-blue-600 hover:text-blue-700 transition transform hover:scale-110"
             title="Facebook">
            <Facebook size={32} />
          </a>
        )}
        {student.tiktok_url && (
          <a href={student.tiktok_url} target="_blank" rel="noopener noreferrer"
             className="text-black hover:text-gray-700 transition transform hover:scale-110"
             title="TikTok">
            <SiTiktok size={32} />
          </a>
        )}
        {student.google_drive_url && (
          <a href={student.google_drive_url} target="_blank" rel="noopener noreferrer"
             className="transition transform hover:scale-110"
             title="Google Drive">
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
  )
}
