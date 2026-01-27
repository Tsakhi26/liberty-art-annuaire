'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function BannerAdmin() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState({
    title: '',
    subtitle: '',
    photo_url: ''
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in')
    if (!isLoggedIn) {
      router.push('/admin/login')
    } else {
      fetchBanner()
    }
  }, [])

  async function fetchBanner() {
    const { data } = await supabase
      .from('banner_config')
      .select('*')
      .single()
    
    if (data) {
      setBanner(data)
      setPhotoPreview(data.photo_url)
    }
    setLoading(false)
  }

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
    setSaving(true)

    try {
      let photoUrl = banner.photo_url

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `banner-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName)

        photoUrl = publicUrl
      }

      const { data: existingBanner } = await supabase
        .from('banner_config')
        .select('id')
        .single()

      if (existingBanner) {
        const { error } = await supabase
          .from('banner_config')
          .update({
            title: banner.title,
            subtitle: banner.subtitle,
            photo_url: photoUrl
          })
          .eq('id', existingBanner.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('banner_config')
          .insert([{
            title: banner.title,
            subtitle: banner.subtitle,
            photo_url: photoUrl
          }])

        if (error) throw error
      }

      alert('Bannière mise à jour avec succès !')
      router.push('/admin')
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center p-12">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Gérer la <span className="text-liberty-orange">Bannière</span>
          </h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Retour
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8">
          
          {photoPreview && (
            <div className="mb-8 flex justify-center">
              <div className="relative w-24 h-24">
                <Image
                  src={photoPreview}
                  alt="Preview"
                  fill
                  className="rounded-full object-cover border-4 border-liberty-orange shadow-lg"
                  unoptimized
                />
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Photo du Formateur *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-liberty-orange file:text-white hover:file:bg-orange-600 file:cursor-pointer"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Titre *
            </label>
            <input
              type="text"
              required
              value={banner.title}
              onChange={(e) => setBanner({ ...banner, title: e.target.value })}
              placeholder="Ex: Isaac Tabrichi"
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange focus:bg-white transition"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
              Sous-titre *
            </label>
            <input
              type="text"
              required
              value={banner.subtitle}
              onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })}
              placeholder="Ex: Formateur Principal"
              className="w-full px-4 py-3 text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-liberty-orange text-white font-bold py-4 rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer la Bannière'}
          </button>
        </form>
      </div>
    </div>
  )
}
