'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    fetchBanner()
  }, [])

  async function fetchBanner() {
    const { data } = await supabase
      .from('banner_config')
      .select('*')
      .single()
    
    if (data) setBanner(data)
  }

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/">
            <Image
              src="https://tabrichi.com/liberty-art-starter/img/logo-liberty-art.png"
              alt="Liberty Art Logo"
              width={150}
              height={50}
              className="cursor-pointer"
              unoptimized
            />
          </Link>

          {/* Bannière Formateur au centre */}
          {banner && banner.photo_url && (
            <div className="flex items-center gap-4 flex-1 justify-center">
              <div className="relative w-16 h-16">
                <Image
                  src={banner.photo_url}
                  alt={banner.title || 'Formateur'}
                  fill
                  className="rounded-full object-cover border-2 border-liberty-orange"
                  unoptimized
                />
              </div>
              <div className="text-center">
                <h2 className="font-bold text-gray-800 text-lg">{banner.title}</h2>
                <p className="text-sm text-gray-600">{banner.subtitle}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex gap-6">
            <Link href="/" className="text-gray-700 hover:text-liberty-orange transition">
              Galerie
            </Link>
            <Link href="/inscription" className="text-gray-700 hover:text-liberty-orange transition">
              Inscription
            </Link>
            <Link href="/admin" className="text-gray-700 hover:text-liberty-orange transition">
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
