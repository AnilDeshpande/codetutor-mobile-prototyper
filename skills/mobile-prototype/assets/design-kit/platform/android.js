/* Android platform: device chrome, Material 3 component markup and Android behaviour.
   - System back (button, browser back, Esc) closes a sheet or dialog first, then goes up the
     stack; back at the start destination leaves the app (launcher).
   - Runtime permissions: optional rationale → system prompt; a second denial is permanent
     ("don't ask again"), after which only the app's system settings can change it.
   Look: platform/android.css with tokens/android.css. Behaviour rules:
   references/platforms/android/conventions.md in the skill. */
(function () {
  'use strict';
  const SYS = {
    back: 'M17 4v16L5 12z',
    home: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z',
    recent: 'M5 5h14v14H5z',
    wifi: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8 3 3 3-3a4.24 4.24 0 0 0-6 0zm-4-4 2 2a7.07 7.07 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
    signal: 'M2 22h20V2z',
    battery: 'M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z',
  };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

  App.registerPlatform('android', {
    label: 'Android',
    minTarget: 48,          // dp
    rootBack: 'exit',

    chrome: ({ appName, esc, icon }) => `
      <div class="status-bar" aria-hidden="true">
        <span>9:41</span>
        <span class="status-icons">${svg(SYS.wifi)}${svg(SYS.signal)}${svg(SYS.battery)}</span>
      </div>

      <nav class="nav" id="nav" aria-label="Main"></nav>

      <div class="pane">
        <header class="top-app-bar" id="top-app-bar">
          <button type="button" class="icon-button" id="up-button" aria-label="Navigate up" data-testid="up" hidden>${icon('back')}</button>
          <h1 id="screen-title"></h1>
          <div class="top-actions" id="top-actions"></div>
        </header>
        <div class="banner" id="banner" role="status" hidden></div>
        <main id="screen" tabindex="-1" data-screen="" data-state=""></main>
        <button type="button" class="fab" id="fab" hidden></button>
        <div class="snackbar" id="snackbar" role="status" aria-live="polite" data-testid="snackbar" hidden></div>
      </div>

      <div class="system-nav" role="toolbar" aria-label="System navigation" data-system-ui>
        <button type="button" id="system-back" aria-label="System back" data-testid="system-back">${svg(SYS.back)}</button>
        <button type="button" id="system-home" aria-label="System home" data-testid="system-home">${svg(SYS.home)}</button>
        <button type="button" aria-label="Recent apps" disabled>${svg(SYS.recent)}</button>
      </div>

      <!-- Overlays live inside the app frame (not the browser's top layer) so the simulated
           system navigation bar stays usable while a dialog or sheet is open, as on Android. -->
      <div class="scrim" id="scrim" hidden></div>
      <dialog id="dialog" class="app-dialog"></dialog>
      <dialog id="sheet" class="bottom-sheet"></dialog>

      <div class="launcher" id="launcher" hidden>
        <button type="button" data-testid="launcher-open"><span class="app-icon" aria-hidden="true">◆</span><span>Open ${esc(appName)}</span></button>
      </div>`,

    navItem: (d, { esc, icon }) =>
      `<button type="button" class="nav-item" data-nav="${esc(d.id)}" data-testid="nav-${esc(d.id)}"><span class="indicator">${icon(d.icon || 'home')}</span><span>${esc(d.label)}</span></button>`,

    /** Top app bar: up arrow below the top level, icon actions on the right; primary action as a FAB. */
    renderBar(bar, els) {
      els.up.hidden = bar.top;
      els.bar.classList.toggle('has-up', !bar.top);
      els.bar.hidden = bar.hidden;
      els.title.textContent = bar.title;
      els.actions.innerHTML = bar.actions.map((a) => App.UI.iconButton(a.icon, a.label, a)).join('');
      els.fab.hidden = !bar.fab;
      if (bar.fab) {
        const f = bar.fab;
        els.fab.innerHTML = `${App.icon(f.icon || 'add')}${f.extended === false ? '' : `<span>${App.esc(f.label)}</span>`}`;
        els.fab.setAttribute('aria-label', f.label);
        els.fab.dataset.action = f.action || '';
        els.fab.dataset.testid = f.testid || 'fab';
      }
    },

    snackbar: ({ message, action, testid }, { esc }) =>
      `<span class="msg">${esc(message)}</span>${action ? `<button type="button" class="btn text" data-testid="${esc(testid)}-action">${esc(action)}</button>` : ''}`,

    /** M3 dialog: optional icon, title, body, text buttons at the end (dismiss, then confirm). */
    dialog: (o, { esc, icon, markup }) => ({
      className: `app-dialog${o.system ? ' system' : ''}`,
      content: `
        ${o.icon ? `<div class="dialog-icon">${icon(o.icon)}</div>` : ''}
        <h2 id="dialog-title">${esc(o.title)}</h2>
        ${o.body ? `<div class="dialog-body">${markup(o.body)}</div>` : ''}
        <div class="dialog-actions">
          ${o.dismiss ? `<button type="button" class="btn text" data-testid="${esc(o.testid)}-dismiss" data-value="false">${esc(o.dismiss)}</button>` : ''}
          <button type="button" class="btn text${o.destructive ? ' destructive' : ''}" data-testid="${esc(o.testid)}-confirm" data-value="true">${esc(o.confirm)}</button>
        </div>`,
    }),

    /** Modal bottom sheet with a drag handle; options become list items. */
    sheet: (o, { esc, markup, UI }) => ({
      className: 'bottom-sheet',
      content: `<div class="handle" aria-hidden="true"></div>
        ${o.title ? `<h2 id="sheet-title">${esc(o.title)}</h2>` : ''}
        ${o.body ? `<div class="sheet-body">${markup(o.body)}</div>` : ''}
        ${o.options.length ? `<ul class="list">${o.options.map((x) => UI.listItem({ headline: x.label, supporting: x.supporting, leadingIcon: x.icon, value: x.value, testid: `${o.testid}-${x.value}` })).join('')}</ul>` : ''}`,
    }),

    /**
     * Android runtime permission: rationale (when given and after a denial, or always if
     * rationale.always) → system prompt. The second denial becomes 'blocked'.
     * prompt: the system dialog's wording, as a string or { android, ios }.
     */
    async requestPermission(name, { prompt, rationale } = {}, { permissions, dialog, appName }) {
      if (prompt && typeof prompt === 'object') prompt = prompt.android;
      const state = permissions[name] || 'ask';
      if (state === 'granted' || state === 'blocked') return state;
      if (rationale && (state === 'denied' || rationale.always)) {
        const go = await dialog({ title: rationale.title, body: rationale.body, confirm: rationale.confirm || 'Continue', dismiss: 'Not now', icon: rationale.icon, testid: 'rationale' });
        if (!go) return 'denied';
      }
      const allowed = await dialog({
        title: prompt || `Allow ${appName} to use ${name}?`,
        confirm: 'Allow', dismiss: 'Don’t allow', system: true, testid: `permission-${name}`,
      });
      permissions[name] = allowed ? 'granted' : state === 'denied' ? 'blocked' : 'denied';
      return permissions[name];
    },
  });
})();
