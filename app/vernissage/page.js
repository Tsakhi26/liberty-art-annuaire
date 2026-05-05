'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Mail, MapPin, Ticket } from 'lucide-react'
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
            <span>Exposition Paris 2026</span>
          </h1>
          <p className="hero-text">
            Vendredi soir, le vernissage est accessible uniquement sur invitation
            à partir de 18h. Le samedi, l&apos;exposition est ouverte en entrée libre.
          </p>

          <div className="event-facts" aria-label="Informations principales">
            <div>
              <CalendarDays size={18} aria-hidden="true" />
              <span>Vendredi 19 juin, vernissage sur invitation</span>
            </div>
            <div>
              <Clock3 size={18} aria-hidden="true" />
              <span>Samedi 20 juin, entrée libre</span>
            </div>
          </div>

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
          <p className="kicker">Entrée libre sur inscription</p>
          <h2 id="reservation-title">Votre invitation pour deux personnes</h2>
          <p>
            Un seul champ suffit. Après validation, l&apos;invitation officielle est envoyée par email
            avec le PDF en pièce jointe.
          </p>
        </div>

        <form className="reservation-form" onSubmit={handleSubmit} data-reveal style={{ '--delay': '120ms' }}>
          {status !== 'success' && status !== 'already' ? (
            <>
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
                <span>{status === 'loading' ? 'Envoi de l’invitation' : 'Recevoir le PDF'}</span>
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
          <strong>Vendredi 19 juin 2026, dès 18h, sur invitation</strong>
        </div>
        <div data-reveal style={{ '--delay': '80ms' }}>
          <span>Samedi</span>
          <strong>Entrée libre pour visiter l&apos;exposition</strong>
        </div>
        <div data-reveal style={{ '--delay': '160ms' }}>
          <span>Lieu</span>
          <strong>Galerie Joseph, 17 rue Chapon, 75003 Paris</strong>
        </div>
      </section>

      <section className="program-section" id="programme" aria-labelledby="programme-title">
        <div className="program-intro" data-reveal>
          <p className="kicker">Programme & animations</p>
          <h2 id="programme-title">Deux temps forts à la Galerie Joseph</h2>
        </div>
        <div className="program-list">
          <article data-reveal>
            <span>Vendredi 19 juin · dès 18h</span>
            <h3>Vernissage sur invitation</h3>
            <p>Accueil des invités, rencontre avec les artistes, découverte des oeuvres et moment convivial autour de l&apos;exposition.</p>
          </article>
          <article data-reveal style={{ '--delay': '100ms' }}>
            <span>Samedi 20 juin</span>
            <h3>Exposition en entrée libre</h3>
            <p>Visite ouverte au public, échanges autour des oeuvres et animations artistiques annoncées prochainement.</p>
          </article>
        </div>
      </section>

      <footer className="vernissage-footer">
        <span>Liberty Art Exposition Paris 2026</span>
        <span>Galerie Joseph · Boesner · Liberty Art</span>
      </footer>
    </main>
  )
}
