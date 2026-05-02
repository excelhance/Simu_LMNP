// src/main.js — bootstrap + routing.
import './style.css';
import { route, startRouter } from './utils/router.js';
import { renderList } from './ui/list.js';
import { renderForm } from './ui/form.js';
import { renderResults } from './ui/results.js';
import { renderSettings, renderSettingsFiscal } from './ui/settings.js';
import { renderComparison } from './ui/comparison.js';

const app = document.getElementById('app');

function shell(child) {
  app.innerHTML = `
    <div class="max-w-6xl mx-auto p-3 md:p-6">
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

route(/^\/settings$/, () => {
  const view = shell();
  renderSettings(view);
});

route(/^\/settings\/fiscal$/, () => {
  const view = shell();
  renderSettingsFiscal(view);
});

route(/^\/compare\/([^/]+)$/, ([idsParam]) => {
  const view = shell();
  const ids = idsParam.split(',').filter(Boolean);
  renderComparison(view, ids);
});

startRouter();
