// src/persistence/exporter.js
// Lot 4 — export et import JSON.
// On centralise les accès localStorage via storage.js (règle d'architecture).
import {
  load,
  save,
  loadPonderations,
  savePonderations,
  resetPonderations
} from './storage.js';
import { VERSION } from '../core/constants.js';

/**
 * Construit l'objet d'export complet : biens + pondérations personnalisées.
 * @returns {object}
 */
export function buildExport() {
  const state = load();
  return {
    schemaVersion: VERSION,
    exportedAt: new Date().toISOString(),
    biens: state.biens || [],
    ponderations: loadPonderations()
  };
}

/** Sérialise l'export en JSON formaté. */
export function exportJSON() {
  return JSON.stringify(buildExport(), null, 2);
}

/**
 * Déclenche le téléchargement d'un fichier JSON dans le navigateur.
 * @param {string} [nomFichier]
 */
export function telechargerExport(nomFichier) {
  const json = exportJSON();
  const date = new Date().toISOString().slice(0, 10);
  const filename = nomFichier || `simu-lmnp-${date}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse + valide une chaîne JSON exportée.
 * @returns {{ok:boolean, data?:object, erreur?:string}}
 */
export function parseImport(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return { ok: false, erreur: 'JSON invalide.' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, erreur: 'Format inattendu.' };
  }
  if (!Array.isArray(data.biens)) {
    return { ok: false, erreur: 'Champ "biens" manquant ou invalide.' };
  }
  return { ok: true, data };
}

/**
 * Applique l'import au localStorage.
 * @param {object} data - sortie de parseImport
 * @param {'replace'|'merge'} mode
 *   - 'replace' : écrase tout (biens + pondérations)
 *   - 'merge'   : ajoute les biens (nouveaux ids générés en cas de collision),
 *                 garde les pondérations existantes
 * @returns {{ajoutes:number, remplaces:number}}
 */
export function appliquerImport(data, mode = 'replace') {
  if (mode === 'replace') {
    const state = load();
    state.biens = data.biens || [];
    save(state);
    if (data.ponderations) {
      savePonderations(data.ponderations);
    } else {
      resetPonderations();
    }
    return { ajoutes: data.biens.length, remplaces: 0 };
  }
  // mode = 'merge'
  const state = load();
  const idsExistants = new Set(state.biens.map((b) => b.id));
  let ajoutes = 0;
  let remplaces = 0;
  for (const bien of data.biens || []) {
    if (idsExistants.has(bien.id)) {
      // Collision : on ré-attribue un id (préserve les deux entrées)
      const copie = {
        ...bien,
        id: undefined,
        nom: (bien.nom || 'Bien') + ' (importé)'
      };
      delete copie.id;
      // upsert sans id régénère un id (cf. storage.upsertBien)
      // Mais on évite l'import direct de storage pour rester en interne.
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'b_' + Math.random().toString(36).slice(2);
      state.biens.push({ ...copie, id: newId });
      remplaces++;
    } else {
      state.biens.push(bien);
      ajoutes++;
    }
  }
  save(state);
  return { ajoutes, remplaces };
}
