// src/utils/format.js
// Formatage : montants €, pourcentages, dates.

const fmtEUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

const fmtEUR2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const fmtNum = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2
});

export function formatEuros(n, decimales = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return decimales >= 2 ? fmtEUR2.format(n) : fmtEUR.format(n);
}

export function formatPourcent(n, decimales = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(decimales).replace('.', ',') + ' %';
}

export function formatNombre(n, decimales = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(n);
}

export function formatDateFR(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

/** Couleur (classes Tailwind) selon score /10. */
export function couleurScore(score) {
  if (score == null || isNaN(score)) return 'bg-slate-300 text-slate-700';
  if (score < 3) return 'bg-red-600 text-white';
  if (score < 5) return 'bg-orange-500 text-white';
  if (score < 7) return 'bg-yellow-400 text-slate-900';
  if (score < 8.5) return 'bg-lime-500 text-white';
  return 'bg-green-600 text-white';
}

export function libelleScore(score) {
  if (score == null || isNaN(score)) return '—';
  if (score < 3) return 'Très faible';
  if (score < 5) return 'Faible';
  if (score < 7) return 'Moyen';
  if (score < 8.5) return 'Bon';
  return 'Excellent';
}
