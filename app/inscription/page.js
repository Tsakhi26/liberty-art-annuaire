'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Inscription() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    insta_url: '',
    fb_url: '',
    tiktok_url: '',
  })
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)

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

      const { error: dbError } = await supabase
        .from('students')
        .insert([
          {
            name: formData.name,
            insta_url: formData.insta_url || null,
            fb_url: formData.fb_url || null,
            tiktok_url: formData.tiktok_url || null,
            photo_url: publicUrl,
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
      <div className="container mx-auto px-4 max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">
          Inscription <span className="text-liberty-orange">Liberty Art</span>
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Prénom *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Photo *
            </label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Instagram
            </label>
            <input
              type="url"
              value={formData.insta_url}
              onChange={(e) => setFormData({ ...formData, insta_url: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Facebook
            </label>
            <input
              type="url"
              value={formData.fb_url}
              onChange={(e) => setFormData({ ...formData, fb_url: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              TikTok
            </label>
            <input
              type="url"
              value={formData.tiktok_url}
              onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
              placeholder="https://tiktok.com/@..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-liberty-orange text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? 'Inscription en cours...' : 'S\'inscrire'}
          </button>
        </form>
      </div>
    </div>
  )
}
