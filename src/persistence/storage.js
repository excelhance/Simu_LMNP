// src/persistence/storage.js
// Persistance localStorage : seul module autorisé à toucher window.localStorage.
import { STORAGE_KEY, VERSION, FISCAL } from '../core/constants.js';

const initialState = () => ({
  version: VERSION,
  constantesFiscales: { ...FISCAL },
  biens: []
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
