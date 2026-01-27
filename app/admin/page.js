'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in')
    if (!isLoggedIn) {
      router.push('/admin/login')
    } else {
      fetchStudents()
    }
  }, [])

  async function fetchStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setStudents(data)
    setLoading(false)
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

  if (loading) return <div className="text-center p-12">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Dashboard <span className="text-liberty-orange">Admin</span>
          </h1>
          <div className="flex gap-4">
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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Photo</th>
                <th className="px-6 py-3 text-left">Prénom</th>
                <th className="px-6 py-3 text-left">Biographie</th>
                <th className="px-6 py-3 text-left">Instagram</th>
                <th className="px-6 py-3 text-left">Facebook</th>
                <th className="px-6 py-3 text-left">TikTok</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-liberty-orange"
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{student.name}</td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-gray-600 truncate" title={student.bio}>
                      {student.bio || '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {student.insta_url && (
                      <a href={student.insta_url} target="_blank" className="text-pink-600 hover:underline">
                        Voir
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {student.fb_url && (
                      <a href={student.fb_url} target="_blank" className="text-blue-600 hover:underline">
                        Voir
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {student.tiktok_url && (
                      <a href={student.tiktok_url} target="_blank" className="text-gray-800 hover:underline">
                        Voir
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deleteStudent(student.id, student.photo_url)}
                      className="text-red-600 hover:text-red-800 transition transform hover:scale-110"
                      title="Supprimer"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
