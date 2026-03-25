/**
 * Utilitaires de coaching partagés
 */

export function isInCoaching(student) {
  // Si coaching annulé manuellement
  if (student.coaching_cancelled) return false

  if (!student.date_debut_coaching) {
    // Fallback sur created_at si pas de date de coaching
    const createdDate = new Date(student.created_at)
    const sixMonthsLater = new Date(createdDate)
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)
    return new Date() <= sixMonthsLater
  }
  const now = new Date()
  const debut = new Date(student.date_debut_coaching)
  const fin = student.date_fin_coaching
    ? new Date(student.date_fin_coaching)
    : (() => { const d = new Date(student.date_debut_coaching); d.setMonth(d.getMonth() + 6); return d })()
  return now >= debut && now <= fin
}

export function isNew(createdAt) {
  const createdDate = new Date(createdAt)
  const twoWeeksLater = new Date(createdDate)
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)
  return new Date() <= twoWeeksLater
}

export function getCoachingProgress(student) {
  if (!student.date_debut_coaching) {
    return { percent: 0, currentMonth: 0, daysLeft: 0, daysTotal: 0, daysElapsed: 0, isNearEnd: false, isComplete: false, hasData: false }
  }

  const now = new Date()
  const debut = new Date(student.date_debut_coaching)
  const fin = student.date_fin_coaching
    ? new Date(student.date_fin_coaching)
    : (() => { const d = new Date(student.date_debut_coaching); d.setMonth(d.getMonth() + 6); return d })()

  const totalDays = Math.max(1, (fin - debut) / (1000 * 60 * 60 * 24))
  const elapsedDays = (now - debut) / (1000 * 60 * 60 * 24)
  const daysLeft = Math.max(0, (fin - now) / (1000 * 60 * 60 * 24))
  const percent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
  const currentMonth = Math.min(6, Math.max(1, Math.ceil((elapsedDays / totalDays) * 6)))

  return {
    percent,
    currentMonth,
    daysLeft: Math.ceil(daysLeft),
    daysTotal: Math.ceil(totalDays),
    daysElapsed: Math.ceil(Math.max(0, elapsedDays)),
    isNearEnd: daysLeft <= 30 && daysLeft > 0,
    isComplete: now > fin,
    hasData: true,
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
