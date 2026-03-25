'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Inscription() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    insta_url: '',
    fb_url: '',
    tiktok_url: '',
    google_drive_url: '',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(fileName, photo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(fileName)

      const { data: existingStudents } = await supabase
        .from('students')
        .select('display_order')
        .order('display_order', { ascending: true })
        .limit(1)

      let newDisplayOrder = 1
      if (existingStudents && existingStudents.length > 0 && existingStudents[0].display_order !== null) {
        newDisplayOrder = existingStudents[0].display_order - 1
      }

      const { error: dbError } = await supabase
        .from('students')
        .insert([
          {
            name: formData.name,
            email: formData.email || null,
            bio: formData.bio || null,
            insta_url: formData.insta_url || null,
            fb_url: formData.fb_url || null,
            tiktok_url: formData.tiktok_url || null,
            google_drive_url: formData.google_drive_url || null,
            photo_url: publicUrl,
            display_order: newDisplayOrder,
            date_debut_coaching: new Date().toISOString().split('T')[0],
            date_fin_coaching: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0] })(),
          },
        ])

      if (dbError) throw dbError

      alert('Inscription réussie !')
      router.push('/')
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-3">
          Inscription <span className="text-liberty-orange">Liberty Art</span>
        </h1>
        <p className="text-center text-gray-600 mb-8">Rejoignez notre communauté d'artistes</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8">
          
          {/* Preview Photo */}
          {photoPreview && (
            <div className="mb-8 flex justify-center">
              <div className="relative w-32 h-32">
                <Image
                  src={photoPreview}
                  alt="Preview"
                  fill
                  className="rounded-full object-cover border-4 border-liberty-orange shadow-lg"
                />
              </div>
            </div>
          )}

          {/* Prénom */}
          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Prénom *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Votre prénom"
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange focus:bg-white transition"
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange focus:bg-white transition"
            />
          </div>

          {/* Biographie */}
          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Biographie
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Parlez-nous de vous, votre parcours artistique..."
              rows="4"
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange focus:bg-white transition resize-none"
            />
          </div>

          {/* Photo */}
          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Photo de profil *
            </label>
            <div className="relative">
              <input
                type="file"
                required
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-liberty-orange file:text-white hover:file:bg-orange-600 file:cursor-pointer"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Format accepté : JPG, PNG, GIF (max 5MB)</p>
          </div>

          {/* Réseaux sociaux */}
          <div className="border-t-2 border-gray-100 pt-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Réseaux sociaux</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Instagram
              </label>
              <input
                type="url"
                value={formData.insta_url}
                onChange={(e) => setFormData({ ...formData, insta_url: e.target.value })}
                placeholder="https://instagram.com/votre_compte"
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 focus:bg-white transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Facebook
              </label>
              <input
                type="url"
                value={formData.fb_url}
                onChange={(e) => setFormData({ ...formData, fb_url: e.target.value })}
                placeholder="https://facebook.com/votre_compte"
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                TikTok
              </label>
              <input
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                placeholder="https://tiktok.com/@votre_compte"
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-800 focus:bg-white transition"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                Google Drive
              </label>
              <input
                type="url"
                value={formData.google_drive_url}
                onChange={(e) => setFormData({ ...formData, google_drive_url: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-600 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-liberty-orange text-white font-bold py-4 rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inscription en cours...
              </span>
            ) : (
              "S'inscrire à Liberty Art"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
