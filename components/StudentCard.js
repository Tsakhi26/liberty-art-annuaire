import Image from 'next/image'
import { Instagram, Facebook } from 'lucide-react'
import { SiTiktok } from 'react-icons/si'

export default function StudentCard({ student }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <Image
          src={student.photo_url}
          alt={student.name}
          fill
          className="rounded-full object-cover border-4 border-liberty-orange"
          unoptimized
        />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">{student.name}</h3>
      <div className="flex justify-center gap-4">
        {student.insta_url && (
          <a href={student.insta_url} target="_blank" rel="noopener noreferrer" 
             className="text-pink-600 hover:text-pink-700 transition">
            <Instagram size={24} />
          </a>
        )}
        {student.fb_url && (
          <a href={student.fb_url} target="_blank" rel="noopener noreferrer"
             className="text-blue-600 hover:text-blue-700 transition">
            <Facebook size={24} />
          </a>
        )}
        {student.tiktok_url && (
          <a href={student.tiktok_url} target="_blank" rel="noopener noreferrer"
             className="text-black hover:text-gray-700 transition">
            <SiTiktok size={24} />
          </a>
        )}
      </div>
    </div>
  )
}
