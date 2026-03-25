'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StudentCard from '@/components/StudentCard'

export default function Home() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching students:', error)
    } else {
      setStudents(data)
    }
    setLoading(false)
  }

  const isInCoaching = (createdAt) => {
    const createdDate = new Date(createdAt)
    const sixMonthsLater = new Date(createdDate)
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)
    return new Date() <= sixMonthsLater
  }

  return (
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
                <StudentCard key={student.id} student={student} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
