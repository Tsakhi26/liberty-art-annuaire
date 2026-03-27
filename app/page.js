'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StudentCard from '@/components/StudentCard'
import Image from 'next/image'

export default function Home() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('admin_logged_in'))
    fetchStudents()
  }, [])

  async function fetchStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching students:', error)
    } else {
      setStudents(data)
    }
    setLoading(false)
  }

  const openEditModal = (student) => {
    setEditingStudent(student)
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
    const finStr = fin.toISOString().split('T')[0]
    setEditFormData({ ...editFormData, date_debut_coaching: value, date_fin_coaching: finStr })
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
      let photoUrl = editingStudent.photo_url

      if (editPhoto) {
        const fileExt = editPhoto.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, editPhoto)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName)
        photoUrl = publicUrl

        const oldFileName = editingStudent.photo_url.split('/').pop()
        await supabase.storage.from('student-photos').remove([oldFileName])
      }

      const { error } = await supabase
        .from('students')
        .update({
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
        })
        .eq('id', editingStudent.id)

      if (error) throw error

      alert('Profil modifié avec succès !')
      setShowEditModal(false)
      fetchStudents()
    } catch (err) {
      console.error('Error:', err)
      alert('Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Nos Artistes <span className="text-liberty-orange">Liberty Art</span>
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Suivons nous les uns les autres et donnons nous de la force 💪🏻
        </p>

        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un élève par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-liberty-orange focus:border-transparent shadow-sm text-gray-700 placeholder-gray-400"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-liberty-orange"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {students
              .filter((student) =>
                (student.name || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  isAdmin={isAdmin}
                  onEdit={openEditModal}
                />
              ))}
          </div>
        )}
      </div>
    </div>

    {/* Modal de modification - Admin uniquement */}
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
              Modifier le profil de <span className="text-liberty-orange">{editingStudent?.name}</span>
            </h2>

            <form onSubmit={handleEditSubmit}>
              {editPhotoPreview && (
                <div className="mb-6 flex justify-center">
                  <div className="relative w-24 h-24">
                    <Image
                      src={editPhotoPreview}
                      alt="Preview"
                      fill
                      className="rounded-full object-cover border-4 border-liberty-orange"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoChange}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Prénom *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Biographie</label>
                <textarea
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Instagram</label>
                <input
                  type="url"
                  value={editFormData.insta_url}
                  onChange={(e) => setEditFormData({ ...editFormData, insta_url: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Facebook</label>
                <input
                  type="url"
                  value={editFormData.fb_url}
                  onChange={(e) => setEditFormData({ ...editFormData, fb_url: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">TikTok</label>
                <input
                  type="url"
                  value={editFormData.tiktok_url}
                  onChange={(e) => setEditFormData({ ...editFormData, tiktok_url: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-bold mb-2">Google Drive</label>
                <input
                  type="url"
                  value={editFormData.google_drive_url}
                  onChange={(e) => setEditFormData({ ...editFormData, google_drive_url: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                />
              </div>

              {/* Dates de coaching */}
              <div className="border-t-2 border-gray-100 pt-4 mt-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Dates de coaching</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-900 font-bold mb-2">Début coaching</label>
                    <input
                      type="date"
                      value={editFormData.date_debut_coaching}
                      onChange={(e) => handleDebutCoachingChange(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-900 font-bold mb-2">Fin coaching</label>
                    <input
                      type="date"
                      value={editFormData.date_fin_coaching}
                      onChange={(e) => setEditFormData({ ...editFormData, date_fin_coaching: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-calculé (6 mois), modifiable</p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-red-50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editFormData.coaching_cancelled || false}
                        onChange={(e) => setEditFormData({ ...editFormData, coaching_cancelled: e.target.checked })}
                        className="sr-only peer"
                      />
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
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-liberty-orange text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition"
                >
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
