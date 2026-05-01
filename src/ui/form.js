// src/ui/form.js
// Écran « Saisie » : formulaire LD nue / micro-foncier (Lot 1).

import { upsertBien, getBien } from '../persistence/storage.js';
import { validerBien } from '../utils/validators.js';
import { calculerLot1 } from '../core/calcul.js';
import { formatEuros, formatNombre } from '../utils/format.js';
import { FISCAL } from '../core/constants.js';
import { navigate } from '../utils/router.js';

/** Valeurs par défaut pour un nouveau bien. */
function defaultBien() {
  return {
    nom: '',
    adresse: '',
    typeLocation: 'LD_nue',
    regimeFiscal: 'micro-foncier',
    surface: null,
    nbPieces: 2,
    etage: 0,
    ascenseur: false,
    exterieur: 'aucun',
    dpe: 'D',
    etatGeneral: 3,
    travauxAPrevoir: 0,
    chargesCopro: null,
    etatCopro: 3,
    prix: null,
    fraisNotaire: null,
    fraisNotaireTauxAuto: true,
    apport: 0,
    dureeCredit: 20,
    tauxNominal: 0.0326,
    tauxAssurance: 0.0020,
    loyerMensuelHC: null,
    vacanceMois: 0.5,
    taxeFonciere: null,
    assurancePNO: 0,
    fraisGestionTaux: 0,
    tmi: FISCAL.TMI
  };
}

/**
 * Convertit la valeur d'un input en nombre (renvoie null si vide / invalide).
 */
function toNumber(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function field({ id, label, type = 'number', step, value, suffix, hint, readonly = false, options = null }) {
  const valStr = value === null || value === undefined ? '' : value;
  if (options) {
    const opts = options.map(([v, l]) => `<option value="${v}" ${String(v) === String(valStr) ? 'selected' : ''}>${l}</option>`).join('');
    return `
      <div class="field">
        <label for="${id}">${label}</label>
        <select id="${id}" name="${id}">${opts}</select>
        ${hint ? `<span class="text-xs text-slate-500">${hint}</span>` : ''}
      </div>`;
  }
  if (type === 'checkbox') {
    return `
      <div class="field">
        <label for="${id}" class="flex items-center gap-2">
          <input type="checkbox" id="${id}" name="${id}" ${value ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300" />
          <span>${label}</span>
        </label>
      </div>`;
  }
  return `
    <div class="field">
      <label for="${id}">${label}${suffix ? ` <span class="text-slate-500 text-xs">(${suffix})</span>` : ''}</label>
      <input type="${type}" id="${id}" name="${id}" ${step ? `step="${step}"` : ''} value="${valStr}" ${readonly ? 'readonly' : ''} />
      <span class="error-msg hidden" data-error-for="${id}"></span>
      ${hint ? `<span class="text-xs text-slate-500">${hint}</span>` : ''}
    </div>`;
}

function section(id, titre, content, ouvert = true) {
  return `
    <details class="card" ${ouvert ? 'open' : ''}>
      <summary class="accordion-summary"><span>${titre}</span><span class="text-slate-400">▾</span></summary>
      <div id="${id}" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">${content}</div>
    </details>`;
}

/** Récupère les valeurs du formulaire et reconstruit l'objet bien. */
function lireFormulaire(form, bienBase) {
  const data = { ...bienBase };
  data.nom = form.nom.value.trim();
  data.adresse = form.adresse.value.trim();
  data.typeLocation = form.typeLocation.value;
  data.regimeFiscal = form.regimeFiscal.value;
  data.surface = toNumber(form.surface.value);
  data.nbPieces = toNumber(form.nbPieces.value) || 0;
  data.etage = toNumber(form.etage.value) || 0;
  data.ascenseur = form.ascenseur.checked;
  data.exterieur = form.exterieur.value;
  data.dpe = form.dpe.value;
  data.etatGeneral = toNumber(form.etatGeneral.value) || 3;
  data.travauxAPrevoir = toNumber(form.travauxAPrevoir.value) || 0;
  data.chargesCopro = toNumber(form.chargesCopro.value);
  data.etatCopro = toNumber(form.etatCopro.value) || 3;
  data.prix = toNumber(form.prix.value);
  // Frais notaire : auto si la case est cochée → 8 % du prix.
  data.fraisNotaireTauxAuto = form.fraisNotaireTauxAuto.checked;
  if (data.fraisNotaireTauxAuto) {
    data.fraisNotaire = (data.prix || 0) * FISCAL.fraisNotaireAncienTaux;
  } else {
    data.fraisNotaire = toNumber(form.fraisNotaire.value);
  }
  data.apport = toNumber(form.apport.value) || 0;
  data.dureeCredit = toNumber(form.dureeCredit.value) || 0;
  // Taux saisis en % humain → conversion en décimal.
  data.tauxNominal = (toNumber(form.tauxNominal.value) || 0) / 100;
  data.tauxAssurance = (toNumber(form.tauxAssurance.value) || 0) / 100;
  data.loyerMensuelHC = toNumber(form.loyerMensuelHC.value);
  data.vacanceMois = toNumber(form.vacanceMois.value) ?? 0;
  data.taxeFonciere = toNumber(form.taxeFonciere.value);
  data.assurancePNO = toNumber(form.assurancePNO.value) || 0;
  data.fraisGestionTaux = (toNumber(form.fraisGestionTaux.value) || 0) / 100;
  data.tmi = (toNumber(form.tmi.value) || 30) / 100;
  return data;
}

/** Met à jour les champs « capital emprunté » et « mensualité » en lecture seule. */
function rafraichirCalculsLive(form) {
  const bien = lireFormulaire(form, {});
  if ((bien.prix || 0) > 0 && (bien.dureeCredit || 0) > 0) {
    const r = calculerLot1(bien);
    form.querySelector('#capitalEmprunteAffiche').value = formatNombre(r.capitalEmprunte, 0);
    form.querySelector('#mensualiteCreditAffiche').value = formatNombre(r.mensualiteCredit, 2);
    form.querySelector('#mensualiteAssuranceAffiche').value = formatNombre(r.mensualiteAssurance, 2);
    form.querySelector('#mensualiteTotaleAffiche').value = formatNombre(r.mensualiteTotale, 2);
  }
  // Rafraîchir le frais notaire auto si coché.
  if (form.fraisNotaireTauxAuto.checked) {
    form.fraisNotaire.value = Math.round((toNumber(form.prix.value) || 0) * FISCAL.fraisNotaireAncienTaux);
    form.fraisNotaire.readOnly = true;
  } else {
    form.fraisNotaire.readOnly = false;
  }
}

function afficherErreurs(form, errors) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    el.classList.add('hidden');
    el.textContent = '';
  });
  for (const [k, msg] of Object.entries(errors)) {
    const el = form.querySelector(`[data-error-for="${k}"]`);
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
    }
  }
}

export function renderForm(container, idEdition = null) {
  const bien = idEdition ? (getBien(idEdition) || defaultBien()) : defaultBien();
  const titre = idEdition ? 'Édition du bien' : 'Nouveau bien';

  container.innerHTML = `
    <header class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">${titre}</h1>
        <p class="text-sm text-slate-500">Lot 1 — LD nue / micro-foncier</p>
      </div>
      <button type="button" class="btn-ghost" data-action="back">← Retour</button>
    </header>
    <form id="bienForm" class="space-y-4 pb-24">
      ${section('sec-id', 'A. Identification', `
        ${field({ id: 'nom', label: 'Nom du bien', type: 'text', value: bien.nom })}
        ${field({ id: 'adresse', label: 'Adresse', type: 'text', value: bien.adresse })}
        ${field({ id: 'typeLocation', label: 'Type de location', value: bien.typeLocation, options: [['LD_nue', 'LD nue']] })}
        ${field({ id: 'regimeFiscal', label: 'Régime fiscal', value: bien.regimeFiscal, options: [['micro-foncier', 'Micro-foncier']] })}
      `)}

      ${section('sec-bien', 'B. Bien', `
        ${field({ id: 'surface', label: 'Surface', suffix: 'm²', value: bien.surface, step: '0.01' })}
        ${field({ id: 'nbPieces', label: 'Nombre de pièces', value: bien.nbPieces, step: '1' })}
        ${field({ id: 'etage', label: 'Étage', value: bien.etage, step: '1' })}
        ${field({ id: 'ascenseur', label: 'Ascenseur', type: 'checkbox', value: bien.ascenseur })}
        ${field({ id: 'exterieur', label: 'Extérieur', value: bien.exterieur, options: [['aucun', 'Aucun'], ['balcon', 'Balcon'], ['terrasse', 'Terrasse'], ['jardin', 'Jardin']] })}
        ${field({ id: 'dpe', label: 'DPE', value: bien.dpe, options: ['A','B','C','D','E','F','G'].map(l => [l, l]) })}
        ${field({ id: 'etatGeneral', label: 'État général (1-5)', value: bien.etatGeneral, step: '1' })}
        ${field({ id: 'travauxAPrevoir', label: 'Travaux à prévoir', suffix: '€', value: bien.travauxAPrevoir })}
        ${field({ id: 'chargesCopro', label: 'Charges copro annuelles', suffix: '€', value: bien.chargesCopro })}
        ${field({ id: 'etatCopro', label: 'État copropriété (1-5)', value: bien.etatCopro, step: '1' })}
      `)}

      ${section('sec-fin', 'C. Financier', `
        ${field({ id: 'prix', label: 'Prix d’acquisition', suffix: '€', value: bien.prix })}
        ${field({ id: 'fraisNotaireTauxAuto', label: 'Frais notaire auto (8 %)', type: 'checkbox', value: bien.fraisNotaireTauxAuto })}
        ${field({ id: 'fraisNotaire', label: 'Frais notaire', suffix: '€', value: bien.fraisNotaire ?? Math.round((bien.prix || 0) * FISCAL.fraisNotaireAncienTaux), readonly: bien.fraisNotaireTauxAuto })}
        ${field({ id: 'apport', label: 'Apport', suffix: '€', value: bien.apport })}
        ${field({ id: 'dureeCredit', label: 'Durée du crédit', suffix: 'années', value: bien.dureeCredit })}
        ${field({ id: 'tauxNominal', label: 'Taux nominal', suffix: '%', value: (bien.tauxNominal * 100).toFixed(2), step: '0.01' })}
        ${field({ id: 'tauxAssurance', label: "Taux d'assurance", suffix: '%', value: (bien.tauxAssurance * 100).toFixed(2), step: '0.01' })}
        ${field({ id: 'capitalEmprunteAffiche', label: 'Capital emprunté', suffix: '€ (calculé)', value: '', readonly: true })}
        ${field({ id: 'mensualiteCreditAffiche', label: 'Mensualité crédit', suffix: '€ (calculé)', value: '', readonly: true })}
        ${field({ id: 'mensualiteAssuranceAffiche', label: 'Mensualité assurance', suffix: '€ (calculé)', value: '', readonly: true })}
        ${field({ id: 'mensualiteTotaleAffiche', label: 'Mensualité totale', suffix: '€ (calculé)', value: '', readonly: true })}
      `)}

      ${section('sec-loc', 'D. Hypothèses locatives', `
        ${field({ id: 'loyerMensuelHC', label: 'Loyer mensuel HC', suffix: '€', value: bien.loyerMensuelHC })}
        ${field({ id: 'vacanceMois', label: 'Vacance', suffix: 'mois/an', value: bien.vacanceMois, step: '0.1' })}
      `)}

      ${section('sec-charges', 'E. Charges récurrentes', `
        ${field({ id: 'taxeFonciere', label: 'Taxe foncière', suffix: '€/an', value: bien.taxeFonciere })}
        ${field({ id: 'assurancePNO', label: 'Assurance PNO', suffix: '€/an', value: bien.assurancePNO })}
        ${field({ id: 'fraisGestionTaux', label: 'Frais de gestion', suffix: '% loyer', value: (bien.fraisGestionTaux * 100).toFixed(2), step: '0.01' })}
      `)}

      ${section('sec-fisc', 'F. Fiscalité', `
        ${field({ id: 'tmi', label: 'TMI', suffix: '%', value: (bien.tmi * 100).toFixed(0), readonly: true })}
      `)}

      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between gap-2 z-10">
        <button type="button" class="btn-secondary" data-action="cancel">Annuler</button>
        <button type="submit" class="btn-primary">Calculer et sauvegarder</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#bienForm');
  const back = () => navigate('/');

  container.querySelector('[data-action="back"]').addEventListener('click', back);
  form.querySelector('[data-action="cancel"]').addEventListener('click', back);

  // Recalcul live capital/mensualité dès qu'un champ financier change.
  ['prix', 'fraisNotaire', 'fraisNotaireTauxAuto', 'apport', 'dureeCredit', 'tauxNominal', 'tauxAssurance']
    .forEach((id) => {
      const el = form.querySelector(`#${id}`);
      if (el) el.addEventListener('input', () => rafraichirCalculsLive(form));
    });

  // Premier calcul d'affichage si édition.
  rafraichirCalculsLive(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = lireFormulaire(form, bien);
    const { ok, errors } = validerBien(data);
    afficherErreurs(form, errors);
    if (!ok) return;
    const sauvegarde = upsertBien(data);
    navigate(`/view/${sauvegarde.id}`);
  });
}
