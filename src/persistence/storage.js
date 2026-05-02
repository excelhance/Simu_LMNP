// src/persistence/storage.js
// Persistance localStorage : seul module autorisé à toucher window.localStorage.
import {
  STORAGE_KEY,
  VERSION,
  FISCAL,
  PONDERATIONS_FAMILLES,
  PONDERATIONS_F1,
  PONDERATIONS_F2,
  PONDERATIONS_F3,
  PONDERATIONS_F4
} from '../core/constants.js';

const PONDERATIONS_KEY = STORAGE_KEY + ':ponderations';
const FISCAL_KEY = STORAGE_KEY + ':fiscal';

const initialState = () => ({
  version: VERSION,
  constantesFiscales: { ...FISCAL },
  biens: []
});

/** Valeurs par défaut, recopiées depuis constants.js. */
const ponderationsDefauts = () => ({
  inter: JSON.parse(JSON.stringify(PONDERATIONS_FAMILLES)),
  F1: { ...PONDERATIONS_F1 },
  F2: { ...PONDERATIONS_F2 },
  F3: JSON.parse(JSON.stringify(PONDERATIONS_F3)),
  F4: JSON.parse(JSON.stringify(PONDERATIONS_F4))
});

function genId() {
  // crypto.randomUUID quand disponible, sinon fallback simple.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'b_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.biens)) {
      return initialState();
    }
    return parsed;
  } catch {
    return initialState();
  }
}

export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listBiens() {
  return load().biens;
}

export function getBien(id) {
  return load().biens.find((b) => b.id === id) || null;
}

/**
 * Crée ou met à jour un bien. Retourne le bien (avec son id).
 * - Si `bien.id` est absent, génère un id et ajoute en fin de liste.
 * - Sinon remplace l'entrée existante.
 */
export function upsertBien(bien) {
  const state = load();
  const now = new Date().toISOString();
  if (!bien.id) {
    const nouveau = { ...bien, id: genId(), createdAt: now, updatedAt: now };
    state.biens.push(nouveau);
    save(state);
    return nouveau;
  }
  const idx = state.biens.findIndex((b) => b.id === bien.id);
  const maj = { ...bien, updatedAt: now };
  if (idx === -1) {
    maj.createdAt = maj.createdAt || now;
    state.biens.push(maj);
  } else {
    maj.createdAt = state.biens[idx].createdAt || now;
    state.biens[idx] = maj;
  }
  save(state);
  return maj;
}

export function deleteBien(id) {
  const state = load();
  const before = state.biens.length;
  state.biens = state.biens.filter((b) => b.id !== id);
  save(state);
  return state.biens.length !== before;
}

// ─── Pondérations modifiables (Lot 2) ──────────────────────────────────

/**
 * Charge les pondérations utilisateur (ou les défauts si rien en localStorage).
 * Fusionne avec les défauts pour combler d'éventuels champs manquants
 * (utile lors d'une évolution future de constants.js).
 */
export function loadPonderations() {
  const defauts = ponderationsDefauts();
  try {
    const raw = localStorage.getItem(PONDERATIONS_KEY);
    if (!raw) return defauts;
    const stored = JSON.parse(raw);
    return {
      inter: { ...defauts.inter, ...(stored.inter || {}) },
      F1: { ...defauts.F1, ...(stored.F1 || {}) },
      F2: { ...defauts.F2, ...(stored.F2 || {}) },
      F3: { ...defauts.F3, ...(stored.F3 || {}) },
      F4: { ...defauts.F4, ...(stored.F4 || {}) }
    };
  } catch {
    return defauts;
  }
}

export function savePonderations(p) {
  localStorage.setItem(PONDERATIONS_KEY, JSON.stringify(p));
}

export function resetPonderations() {
  localStorage.removeItem(PONDERATIONS_KEY);
}

// ─── Constantes fiscales modifiables (Lot 5) ───────────────────────────

/**
 * Charge les constantes fiscales effectives = défauts de constants.js
 * fusionnés avec les éventuelles surcharges utilisateur stockées en localStorage.
 */
export function loadFiscal() {
  const defauts = { ...FISCAL };
  try {
    const raw = localStorage.getItem(FISCAL_KEY);
    if (!raw) return defauts;
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== 'object') return defauts;
    return { ...defauts, ...stored };
  } catch {
    return defauts;
  }
}

export function saveFiscal(overrides) {
  // On ne stocke que les overrides (clés dont la valeur diffère du défaut).
  const defauts = FISCAL;
  const diff = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (defauts[k] !== v) diff[k] = v;
  }
  if (Object.keys(diff).length === 0) {
    localStorage.removeItem(FISCAL_KEY);
  } else {
    localStorage.setItem(FISCAL_KEY, JSON.stringify(diff));
  }
}

export function resetFiscal() {
  localStorage.removeItem(FISCAL_KEY);
}
