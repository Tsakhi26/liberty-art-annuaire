'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Mail, MapPin, Ticket, Wine } from 'lucide-react'
import './vernissage.css'

const ARTWORKS = [
  {
    src: '/vernissage/images/PHOTO-2026-04-29-19-16-32.jpg',
    alt: "Peinture contemporaine d'un artiste Liberty Art",
    tone: 'Bleu profond',
  },
  {
    src: '/vernissage/images/PHOTO-2026-04-30-17-29-29.jpg',
    alt: "Oeuvre abstraite exposée au vernissage Liberty Art",
    tone: 'Matière',
  },
  {
    src: '/vernissage/images/PHOTO-2026-05-03-18-59-24.jpg',
    alt: "Peinture colorée issue du vernissage Liberty Art",
    tone: 'Contraste',
  },
  {
    src: '/vernissage/images/WhatsApp Image 2026-04-30 at 17.30.16.jpeg',
    alt: "Portrait peint par un artiste Liberty Art",
    tone: 'Figure',
  },
  {
    src: '/vernissage/images/PHOTO-2026-04-30-17-29-58.jpg',
    alt: "Grand format abstrait pour Liberty Art Exposition",
    tone: 'Format',
  },
]

const PROGRAM_EVENTS = [
  {
    section: 'Shows du vendredi',
    day: 'Vendredi 19 juin',
    time: '19h30',
    title: 'Live painting Borealis',
    artist: 'Axelle',
    duration: '20 minutes',
    description:
      'Une performance picturale en direct pour ouvrir la soirée du vernissage, entre geste spontané, matière et immersion dans l’univers Borealis.',
    image: '/vernissage/images/axelle.jpg',
    imageAlt: 'Portrait d’Axelle pour la performance Live painting Borealis',
  },
  {
    section: 'Shows du vendredi',
    day: 'Vendredi 19 juin',
    time: '20h00',
    title: 'Show Tableaux Paillettes',
    artist: 'Isaac',
    duration: '20 minutes',
    description:
      'Un live painting rythmé autour de l’énergie Tableaux Paillettes, pensé comme un moment spectaculaire et accessible au coeur de l’exposition.',
    image: '/vernissage/images/Grand-logo-tableaux-paillettes.jpg',
    imageAlt: 'Logo Tableaux Paillettes',
    imageMode: 'contain',
  },
  {
    section: 'Animations du samedi',
    day: 'Samedi 20 juin',
    time: '14h00',
    title: 'Comment gagner en visibilité grâce aux réseaux sociaux',
    artist: 'Conférence',
    duration: 'Temps d’échange',
    description:
      'Une conférence pensée pour les artistes qui veulent faire connaître leur travail avec plus de clarté : comprendre l’intérêt d’une présence professionnelle sur Instagram, transformer son profil en véritable vitrine artistique, structurer son contenu et créer une visibilité régulière pour attirer un public, des collectionneurs et de nouvelles opportunités.',
    image: '/vernissage/images/conference.png',
    imageAlt: 'Visuel de la conférence sur la visibilité grâce aux réseaux sociaux',
    imageMode: 'contain',
  },
  {
    section: 'Animations du samedi',
    day: 'Samedi 20 juin',
    time: '15h30',
    title: 'Peinture Natalya',
    artist: 'Natalya',
    duration: 'Performance artistique',
    description:
      'Un temps de peinture en direct pour découvrir le processus créatif de Natalya et prolonger la visite par une rencontre vivante avec l’oeuvre en train de naître.',
    image: '/vernissage/images/PHOTO-2026-05-03-18-59-24.jpg',
    imageAlt: 'Oeuvre présentée pour la performance peinture Natalya',
  },
]

const PROGRAM_SECTIONS = ['Shows du vendredi', 'Animations du samedi']

function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const elements = document.querySelectorAll('[data-reveal]')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

export default function VernissagePage() {
  useReveal()

  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const scrollToForm = () => {
    document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToProgram = () => {
    document.getElementById('programme')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch('/api/vernissage/inscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setErrorMsg(
          data?.error === 'invalid_email'
            ? 'Cette adresse email ne semble pas valide.'
            : data?.message || 'Impossible de finaliser votre inscription pour le moment.'
        )
        return
      }

      setStatus(data.alreadyRegistered ? 'already' : 'success')
    } catch {
      setStatus('error')
      setErrorMsg('Connexion impossible. Vérifiez votre réseau puis réessayez.')
    }
  }

  return (
    <main className="vernissage-page">
      <section className="hero-section" aria-labelledby="vernissage-title">
        <div className="hero-copy" data-reveal>
          <Image
            className="hero-logo"
            src="/logo-liberty-art.png"
            alt="Liberty Art"
            width={360}
            height={112}
            priority
          />
          <h1 id="vernissage-title">
            <span>EXPOSITION</span>
            <span className="hero-date">19/20 JUIN 2026</span>
          </h1>
          <p className="hero-text">
            Venez découvrir des artistes contemporains en plein coeur de Paris,
            dans une exposition vivante mêlant oeuvres, performances et rencontres.
          </p>

          <div className="hero-actions">
            <button className="primary-cta" type="button" onClick={scrollToForm}>
              <Mail size={18} aria-hidden="true" />
              <span>Recevoir mon invitation</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="secondary-cta" type="button" onClick={scrollToProgram}>
              <CalendarDays size={18} aria-hidden="true" />
              <span>Voir le programme</span>
            </button>
          </div>

          <div className="event-facts" aria-label="Informations principales">
            <div>
              <Wine size={20} aria-hidden="true" />
              <span>
                <strong>Vernissage</strong>
                Vendredi 19 juin, de 18h à 22h
              </span>
            </div>
            <div>
              <CalendarDays size={20} aria-hidden="true" />
              <span>
                <strong>Entrée libre</strong>
                Vendredi 14h-16h / Samedi 10h-18h
              </span>
            </div>
          </div>
        </div>

        <div className="poster-panel" data-reveal style={{ '--delay': '120ms' }} aria-label="Aperçu des oeuvres">
          <div className="poster-grid">
            {ARTWORKS.map((artwork, index) => (
              <figure className={`art-tile art-tile-${index + 1}`} key={artwork.src}>
                <Image src={artwork.src} alt={artwork.alt} fill sizes="(max-width: 760px) 50vw, 22vw" />
                <figcaption>{artwork.tone}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="reservation-section" id="reservation" aria-labelledby="reservation-title">
        <div className="reservation-intro" data-reveal>
          <p className="kicker">Vernissage · Vendredi 19 juin · 18h-22h</p>
          <h2 id="reservation-title">Votre invitation pour deux personnes</h2>
          <p>
            Venez partager un moment convivial au coeur de l&apos;exposition : rencontrer les artistes,
            découvrir les performances et les shows en direct, puis profiter d&apos;un apéritif dans une ambiance chaleureuse.
          </p>
        </div>

        <form className="reservation-form" onSubmit={handleSubmit} data-reveal style={{ '--delay': '120ms' }}>
          {status !== 'success' && status !== 'already' ? (
            <>
              <p className="form-intro">
                Pour recevoir votre invitation, renseignez votre adresse email. Elle vous sera envoyée directement par email.
              </p>
              <label htmlFor="email">Adresse email</label>
              <div className="email-row">
                <Mail size={20} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="prenom@exemple.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="hp" aria-hidden="true">
                <label htmlFor="website">Site web</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <button className="submit-btn" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <span className="loading-dot" aria-hidden="true" />
                ) : (
                  <Ticket size={19} aria-hidden="true" />
                )}
                <span>{status === 'loading' ? 'Envoi de l’invitation' : 'Recevoir mon invitation'}</span>
              </button>

              {status === 'error' && (
                <p className="form-message error" role="alert">{errorMsg}</p>
              )}

              <p className="privacy-note">
                Votre email sert uniquement à l&apos;envoi de cette invitation.
              </p>
            </>
          ) : (
            <div className="success-state" role="status">
              <CheckCircle2 size={54} aria-hidden="true" />
              <h3>{status === 'success' ? 'Invitation envoyée' : 'Invitation déjà envoyée'}</h3>
              <p>
                {status === 'success'
                  ? `Le PDF vient d'être envoyé à ${email}.`
                  : `Une invitation existe déjà pour ${email}.`}
              </p>
              <button
                className="reset-btn"
                type="button"
                onClick={() => {
                  setEmail('')
                  setStatus('idle')
                }}
              >
                Inscrire une autre adresse
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="details-band" aria-label="Détails du vernissage">
        <div data-reveal>
          <span>Vernissage</span>
          <strong>
            Vendredi 19 juin 2026,<br />
            de 18h à 22h, sur invitation
          </strong>
        </div>
        <div data-reveal style={{ '--delay': '80ms' }}>
          <span>Entrée libre</span>
          <strong>
            Vendredi 19 juin, 14h-16h<br />
            Samedi 20 juin, 10h-18h
          </strong>
        </div>
        <div data-reveal style={{ '--delay': '160ms' }}>
          <span>Lieu</span>
          <strong className="details-location">
            <MapPin size={28} aria-hidden="true" />
            <span>
              Exposition Liberty Art,<br />
              17 rue Chapon, 75003 Paris
            </span>
          </strong>
        </div>
      </section>

      <section className="program-section" id="programme" aria-labelledby="programme-title">
        <div className="program-intro" data-reveal>
          <p className="kicker">Programme & animations</p>
          <h2 id="programme-title">Planning des shows et événements</h2>
        </div>
        <div className="program-list">
          {PROGRAM_SECTIONS.map((section) => (
            <div className="program-day" key={section}>
              <h3>{section}</h3>
              {PROGRAM_EVENTS.filter((event) => event.section === section).map((event, index) => (
                <article
                  className="program-card"
                  data-reveal
                  style={{ '--delay': `${index * 80}ms` }}
                  key={`${event.day}-${event.time}`}
                >
                  <div className={`program-image ${event.imageMode === 'contain' ? 'program-image-contain' : ''}`}>
                    <Image src={event.image} alt={event.imageAlt} fill sizes="(max-width: 760px) 100vw, 760px" />
                  </div>
                  <div className="program-content">
                    <div className="program-meta">
                      <span>{event.day}</span>
                      <time>{event.time}</time>
                    </div>
                    <h4>{event.title}</h4>
                    <p className="program-host">{event.artist} · {event.duration}</p>
                    <p>{event.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <footer className="vernissage-footer">
        <span>Liberty Art Exposition Paris 2026</span>
        <span>Exposition Liberty Art · Boesner · Paris</span>
      </footer>
    </main>
  )
}
