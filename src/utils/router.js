// src/utils/router.js
// Routeur hash minimal : déclare des routes (regex) et un dispatcher unique.

const routes = [];

/**
 * Enregistre une route.
 * @param {RegExp} pattern - capture les paramètres dans des groupes.
 * @param {(params:string[]) => void} handler
 */
export function route(pattern, handler) {
  routes.push({ pattern, handler });
}

function dispatch() {
  const hash = location.hash || '#/';
  const path = hash.replace(/^#/, '') || '/';
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      r.handler(m.slice(1));
      return;
    }
  }
  // Aucune route correspondante : retour à la liste.
  navigate('/');
}

export function startRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export function navigate(path) {
  if (location.hash === '#' + path) {
    dispatch();
  } else {
    location.hash = path;
  }
}
