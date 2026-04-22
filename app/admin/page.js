'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trash2, Edit, Search, Grid, List, GripVertical, Eye } from 'lucide-react'
import { isInCoaching as checkCoaching, isNew as checkNew, getCoachingProgress, formatDate } from '@/lib/coaching'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SortableRow from '@/components/SortableRow'

export default function AdminDashboard() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [editingStudent, setEditingStudent] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)

  async function syncNotion(force = false) {
    // Vérifier si on a déjà sync aujourd'hui
    const lastSync = localStorage.getItem('notion_last_sync')
    const now = new Date()
    if (!force && lastSync) {
      const lastSyncDate = new Date(lastSync)
      const diffHours = (now - lastSyncDate) / (1000 * 60 * 60)
      if (diffHours < 24) {
        return // Déjà sync dans les 24h
      }
    }

    setSyncing(true)
    try {
      const res = await fetch('/api/sync-notion', {
        headers: { 'x-admin-auth': 'liberty-art-sync' },
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('notion_last_sync', now.toISOString())
        setSyncStatus(data)
        if (data.new_inserted > 0) {
          fetchStudents() // Recharger si nouveaux élèves
        }
      }
    } catch (err) {
      console.error('Sync Notion error:', err)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in')
    if (!isLoggedIn) {
      router.push('/admin/login')
    } else {
      fetchStudents()
      syncNotion() // Sync auto au chargement (1x/jour)
    }
  }, [])

  async function fetchStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) {
      setStudents(data)
      setFilteredStudents(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredStudents(students)
    } else {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.bio && student.bio.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredStudents(filtered)
    }
  }, [searchTerm, students])

  const isInCoachingFn = (student) => checkCoaching(student)
  const isNewFn = (student) => checkNew(student.created_at)

  const handleDebutCoachingChange = (value) => {
    const debut = new Date(value)
    const fin = new Date(debut)
    fin.setMonth(fin.getMonth() + 6)
    const finStr = fin.toISOString().split('T')[0]
    setEditFormData({ ...editFormData, date_debut_coaching: value, date_fin_coaching: finStr })
  }

  const getStats = () => {
    const total = students.length
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const newThisWeek = students.filter(s => new Date(s.created_at) >= twoWeeksAgo).length
    const inCoaching = students.filter(s => checkCoaching(s)).length
    const nearEnd = students.filter(s => getCoachingProgress(s).isNearEnd).length
    return { total, newThisWeek, inCoaching, nearEnd }
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

  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditPhotoPreview(reader.result)
      }
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
          photo_url: photoUrl
        })
        .eq('id', editingStudent.id)

      if (error) throw error

      alert('Profil modifié avec succès !')
      setShowEditModal(false)
      fetchStudents()
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  async function deleteStudent(id, photoUrl) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) return

    try {
      const fileName = photoUrl.split('/').pop()
      await supabase.storage.from('student-photos').remove([fileName])

      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error

      setStudents(students.filter((s) => s.id !== id))
      alert('Élève supprimé avec succès')
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_logged_in')
    router.push('/admin/login')
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = filteredStudents.findIndex((s) => s.id === active.id)
      const newIndex = filteredStudents.findIndex((s) => s.id === over.id)

      const newOrder = arrayMove(filteredStudents, oldIndex, newIndex)
      
      setFilteredStudents(newOrder)
      
      try {
        for (let i = 0; i < newOrder.length; i++) {
          const student = newOrder[i]
          await supabase
            .from('students')
            .update({ display_order: i + 1 })
            .eq('id', student.id)
        }
        fetchStudents()
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'ordre:', error)
        alert('Erreur lors de la sauvegarde de l\'ordre')
      }
    }
  }

  const stats = getStats()

  if (loading) return <div className="text-center p-12">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Dashboard <span className="text-liberty-orange">Admin</span>
          </h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => syncNotion(true)}
              disabled={syncing}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 flex items-center gap-2 text-sm"
              title="Synchroniser avec Notion"
            >
              {syncing ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Sync...</>
              ) : (
                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Sync Notion</>
              )}
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm"
            >
              📊 Analytics
            </button>
            <button
              onClick={() => router.push('/admin/banner')}
              className="bg-liberty-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
            >
              Gérer la Bannière
            </button>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Notification sync Notion */}
        {syncStatus && syncStatus.new_inserted > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <div>
                <p className="font-bold text-green-800">
                  {syncStatus.new_inserted} nouveau{syncStatus.new_inserted > 1 ? 'x' : ''} élève{syncStatus.new_inserted > 1 ? 's' : ''} importé{syncStatus.new_inserted > 1 ? 's' : ''} depuis Notion
                </p>
                <p className="text-sm text-green-600">{syncStatus.new_students.join(', ')}</p>
              </div>
            </div>
            <button onClick={() => setSyncStatus(null)} className="text-green-400 hover:text-green-600">✕</button>
          </div>
        )}

        {/* Notification changements de date de fin de coaching */}
        {syncStatus && syncStatus.changed_dates && syncStatus.changed_dates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl">🔔</span>
              <div>
                <p className="font-bold text-amber-800">
                  {syncStatus.changed_dates.length} élève{syncStatus.changed_dates.length > 1 ? 's ont' : ' a'} une nouvelle date de fin de coaching
                </p>
                <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
                  {syncStatus.changed_dates.map((c, i) => (
                    <li key={i}>
                      <strong>{c.name}</strong> : {formatDate(c.oldDate)} → {formatDate(c.newDate)}
                      {c.diffMonths !== 0 && (
                        <span className="ml-1 font-semibold">
                          ({c.diffMonths > 0 ? '+' : ''}{c.diffMonths} mois)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setSyncStatus({ ...syncStatus, changed_dates: [] })}
              className="text-amber-400 hover:text-amber-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Élèves</h3>
            <p className="text-3xl font-bold text-liberty-orange">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Nouveaux (14 jours)</h3>
            <p className="text-3xl font-bold text-green-600">{stats.newThisWeek}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">En Coaching</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.inCoaching}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Fin proche (30j)</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.nearEnd}</p>
          </div>
        </div>

        {/* Barre de recherche et vue */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-liberty-orange text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-liberty-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              title="Vue Tableau"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-liberty-orange text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              title="Vue Grille"
            >
              <Grid size={20} />
            </button>
          </div>
        </div>

        {/* Vue Tableau */}
        {viewMode === 'table' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-white rounded-lg shadow-lg overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-900 w-12"></th>
                    <th className="px-6 py-3 text-left text-gray-900">Photo</th>
                    <th className="px-6 py-3 text-left text-gray-900">Prénom</th>
                    <th className="px-6 py-3 text-left text-gray-900">Biographie</th>
                    <th className="px-6 py-3 text-left text-gray-900">Statut</th>
                    <th className="px-6 py-3 text-left text-gray-900">Réseaux</th>
                    <th className="px-6 py-3 text-left text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext
                    items={filteredStudents.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredStudents.map((student) => (
                      <SortableRow
                        key={student.id}
                        student={student}
                        isInCoachingFn={isInCoachingFn}
                        isNewFn={isNewFn}
                        onEdit={openEditModal}
                        onDelete={deleteStudent}
                        onView={(s) => router.push(`/artist/${s.id}`)}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          </DndContext>
        )}

        {/* Vue Grille */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <div key={student.id} className="relative bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition">
                {isNewFn(student) && (
                  <span className="absolute top-3 left-3 bg-liberty-orange text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    Nouveau
                  </span>
                )}
                {getCoachingProgress(student).isNearEnd && (
                  <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    ⚠ Fin proche
                  </span>
                )}
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-liberty-orange"
                  />
                  {isInCoachingFn(student) && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" title="En coaching">
                      ✓
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{student.name}</h3>
                {student.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{student.bio}</p>
                )}
                <div className="flex justify-center gap-3 mb-4">
                  {student.insta_url && <span className="text-pink-600 text-xl">📷</span>}
                  {student.fb_url && <span className="text-blue-600 text-xl">👍</span>}
                  {student.tiktok_url && <span className="text-xl">🎵</span>}
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => router.push(`/artist/${student.id}`)}
                    className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition text-sm"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => openEditModal(student)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteStudent(student.id, student.photo_url)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Modal de modification */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

                    {/* Toggle annulation coaching */}
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
      </div>
    </div>
  )
}
