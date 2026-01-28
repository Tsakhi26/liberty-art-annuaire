'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StudentCard from '@/components/StudentCard'

export default function IframePage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Nos Artistes <span className="text-liberty-orange">Liberty Art</span>
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Suivons nous les uns les autres et donnons nous de la force 💪🏻
        </p>

        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-liberty-orange"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
