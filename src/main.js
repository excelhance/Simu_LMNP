// src/main.js — bootstrap + routing.
import './style.css';
import { route, startRouter } from './utils/router.js';
import { renderList } from './ui/list.js';
import { renderForm } from './ui/form.js';
import { renderResults } from './ui/results.js';

const app = document.getElementById('app');

function shell(child) {
  app.innerHTML = `
    <div class="max-w-5xl mx-auto p-3 md:p-6">
      <div id="view"></div>
    </div>`;
  return app.querySelector('#view');
}

route(/^\/$/, () => {
  const view = shell();
  renderList(view);
});

route(/^\/new$/, () => {
  const view = shell();
  renderForm(view, null);
});

route(/^\/edit\/([^/]+)$/, ([id]) => {
  const view = shell();
  renderForm(view, id);
});

route(/^\/view\/([^/]+)$/, ([id]) => {
  const view = shell();
  renderResults(view, id);
});

startRouter();
