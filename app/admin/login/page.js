'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  const handleLogin = (e) => {
    e.preventDefault()
    if (credentials.username === 'Isaac' && credentials.password === 'Polochon85') {
      localStorage.setItem('admin_logged_in', 'true')
      router.push('/admin')
    } else {
      alert('Identifiants incorrects')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Admin <span className="text-liberty-orange">Liberty Art</span>
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Identifiant</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Mot de passe</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-liberty-orange"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-liberty-orange text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}
