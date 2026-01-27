import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
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
    </header>
  )
}
