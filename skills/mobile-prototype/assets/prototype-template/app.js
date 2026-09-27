/* Prototype runtime: Android-style navigation, back stack, screen states, mock API, overlays.
   Screens are defined in screens.js with App.start({...}); data lives in mock-data.js.
   You normally don't need to edit this file.

   URL parameters
     scenario=<id>      mock scenario from mock-data.js (default: "default")
     latency=<fast|normal|slow|ms>
     screen=<id>&state=<state>&params=<json>   open a screen directly, optionally forcing a state
     theme=<light|dark> force a theme (otherwise follows the browser / browser_emulate_media)
     fontScale=<n>      text size multiplier, e.g. 2 for 200 %
     chrome=off         hide the simulated status and navigation bars
     debug=1            show the debug panel
*/
(function () {
  'use strict';

  // ---------- configuration from the URL ----------
  const query = new URLSearchParams(location.search);
  const LATENCY = { fast: 50, normal: 700, slow: 3000 };
  const cfg = {
    scenario: query.get('scenario') || 'default',
    latency: LATENCY[query.get('latency')] ?? (Number(query.get('latency')) || LATENCY.normal),
    theme: query.get('theme'),
    fontScale: Number(query.get('fontScale')) || 1,
    chrome: query.get('chrome') !== 'off',
    debug: query.get('debug') === '1',
    screen: query.get('screen'),
    state: query.get('state'),
    params: safeJson(query.get('params')) || {},
  };
  if (cfg.theme) document.documentElement.dataset.theme = cfg.theme;
  if (cfg.fontScale !== 1) document.documentElement.style.fontSize = `${16 * cfg.fontScale}px`;

  // ---------- small helpers ----------
  function safeJson(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(s);
  const fmt = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join('') : esc(v));
  /** Tagged template that escapes interpolated values; nest html`` or raw() for markup. */
  const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? fmt(vals[i]) : ''), ''));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const $ = (sel, root = document) => root.querySelector(sel);

  // Material icon paths (Apache 2.0). Add more as needed: name → SVG path data.
  const ICONS = {
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    chevron: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    offline: 'M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zM3.41 1.31 2 2.72l2.05 2.05C1.91 5.76.59 6.82.36 7L12 21.5l3.91-4.87 3.32 3.32 1.41-1.41L3.41 1.31z',
    empty: 'M19 3H4.99C3.88 3 3 3.9 3 5v14c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z',
    bluetooth: 'M17.71 7.71 12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z',
    sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
    delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    notifications: 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    sys_back: 'M17 4v16L5 12z',
    sys_home: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z',
    sys_recent: 'M5 5h14v14H5z',
  };
  const icon = (name, cls = '') => raw(`<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}><path d="${ICONS[name] || name}"/></svg>`);

  // ---------- UI building blocks for screens ----------
  const params = (p = {}) => raw(Object.entries(p).map(([k, v]) => ` data-param-${esc(k)}="${esc(v)}"`).join(''));
  const target = ({ action, nav, navParams, testid }) =>
    raw(`${action ? ` data-action="${esc(action)}"` : ''}${nav ? ` data-nav="${esc(nav)}"` : ''}${params(navParams)}${testid ? ` data-testid="${esc(testid)}"` : ''}`);

  const UI = {
    icon, html, raw, esc,
    button(label, { variant = 'filled', action, nav, navParams, testid, type = 'button', icon: ic, disabled, block } = {}) {
      return html`<button type="${type}" class="btn ${variant}${block ? ' block' : ''}"${target({ action, nav, navParams, testid })}${disabled ? raw(' disabled') : ''}>${ic ? icon(ic) : ''}${label}</button>`;
    },
    iconButton(ic, label, { action, nav, navParams, testid } = {}) {
      return html`<button type="button" class="icon-button" aria-label="${label}"${target({ action, nav, navParams, testid })}>${icon(ic)}</button>`;
    },
    listItem({ headline, supporting, trailing, leading, leadingIcon, action, nav, navParams, testid, lines, value } = {}) {
      const tag = action || nav || value != null ? 'button' : 'div';
      const cls = lines === 3 ? ' three-line' : supporting ? ' two-line' : '';
      return html`<li>${raw(`<${tag}${tag === 'button' ? ' type="button"' : ''} class="list-item${cls}"`)}${target({ action, nav, navParams, testid })}${value != null ? html` data-value="${value}"` : ''}>
        ${leading || leadingIcon ? html`<span class="leading" aria-hidden="true">${leadingIcon ? icon(leadingIcon) : leading}</span>` : ''}
        <span class="text"><span class="headline">${headline}</span>${supporting ? html`<span class="supporting">${supporting}</span>` : ''}</span>
        ${trailing != null ? html`<span class="trailing">${trailing}</span>` : nav ? html`<span class="trailing">${icon('chevron')}</span>` : ''}
      ${raw(`</${tag}>`)}</li>`;
    },
    textField({ name, label, value = '', helper, error, type = 'text', required, testid, multiline } = {}) {
      const id = `f-${name}`;
      const control = multiline
        ? html`<textarea id="${id}" name="${name}" data-testid="${testid || id}" ${raw(required ? 'required' : '')} aria-describedby="${id}-h">${value}</textarea>`
        : html`<input id="${id}" name="${name}" type="${type}" value="${value}" data-testid="${testid || id}" ${raw(required ? 'required' : '')} aria-describedby="${id}-h" ${raw(error ? 'aria-invalid="true"' : '')}>`;
      return html`<div class="field${error ? ' invalid' : ''}"><label for="${id}">${label}</label>${control}<span class="helper" id="${id}-h">${error || helper || ''}</span></div>`;
    },
    switchRow({ name, label, supporting, checked, action, testid } = {}) {
      return html`<label class="switch-row"><span class="text"><span class="headline">${label}</span>${supporting ? html`<br><span class="muted">${supporting}</span>` : ''}</span>
        <input type="checkbox" role="switch" class="switch" name="${name}" ${raw(checked ? 'checked' : '')}${target({ action, testid: testid || `switch-${name}` })}></label>`;
    },
    loading(label = 'Loading…') {
      return html`<div class="state" data-testid="state-loading"><div class="progress-circular" role="progressbar" aria-label="${label}"></div><p>${label}</p></div>`;
    },
    skeletonList(rows = 5) {
      return html`<ul class="list" aria-busy="true" aria-label="Loading" data-testid="state-loading">${Array.from({ length: rows }, () => html`<li class="list-item two-line"><span class="leading skeleton"></span><span class="text" style="gap:8px"><span class="skeleton" style="height:14px;width:60%"></span><span class="skeleton" style="height:12px;width:40%"></span></span></li>`)}</ul>`;
    },
    empty({ title, body, icon: ic = 'empty', action } = {}) {
      return html`<div class="state" data-testid="state-empty">${icon(ic, 'state-icon')}<h2>${title}</h2>${body ? html`<p>${body}</p>` : ''}${action ? UI.button(action.label, action) : ''}</div>`;
    },
    error({ title = 'Something went wrong', body = 'Please try again.', retry = true, icon: ic = 'error', testid = 'state-error' } = {}) {
      return html`<div class="state error" role="alert" data-testid="${testid}">${icon(ic, 'state-icon')}<h2>${title}</h2><p>${body}</p>${retry ? UI.button('Try again', { variant: 'tonal', action: '__retry', testid: 'retry' }) : ''}</div>`;
    },
    offline({ title = 'You’re offline', body = 'Check your connection and try again.', retry = true } = {}) {
      return UI.error({ title, body, retry, icon: 'offline', testid: 'state-offline' });
    },
  };

  // ---------- mock API ----------
  const MOCK = window.MOCK || { base: {}, scenarios: { default: {} }, api: {} };
  const scenario = MOCK.scenarios[cfg.scenario] || MOCK.scenarios.default || {};
  if (!MOCK.scenarios[cfg.scenario]) console.warn(`Unknown scenario "${cfg.scenario}", using default.`);
  const db = Object.assign(clone(MOCK.base || {}), clone(scenario.data || {}));
  const permissions = Object.assign({}, scenario.permissions || {});

  async function api(name, args) {
    const handler = MOCK.api[name];
    if (!handler) throw new Error(`mock-data.js has no api.${name}`);
    await sleep(cfg.latency + (MOCK.delays?.[name] || 0) * (cfg.latency / LATENCY.normal));
    const failure = scenario.offline ? 'offline' : scenario.fail?.[name];
    if (failure) {
      const err = new Error(failure === 'offline' ? 'No connection' : `${name} failed`);
      err.type = failure;
      throw err;
    }
    return clone(handler(db, clone(args)));
  }

  // ---------- app state ----------
  let def = null;              // the App.start() configuration
  let stack = [];              // [{ id, params }]
  let current = null;          // the live screen context
  let renderToken = 0;
  const els = {};

  function start(definition) {
    def = definition;
    document.title = `${def.appName || 'App'} — prototype`;
    Object.assign(els, {
      app: $('#app'), nav: $('#nav'), title: $('#screen-title'), up: $('#up-button'), actions: $('#top-actions'),
      bar: $('#top-app-bar'), banner: $('#banner'), main: $('#screen'), fab: $('#fab'), snackbar: $('#snackbar'),
      dialog: $('#dialog'), sheet: $('#sheet'), scrim: $('#scrim'), launcher: $('#launcher'),
    });
    els.app.dataset.chrome = cfg.chrome ? 'on' : 'off';
    document.body.dataset.scenario = cfg.scenario;
    buildNav();
    wireEvents();
    if (cfg.debug) buildDebugPanel();

    // Browser back (and Playwright's browser_navigate_back) acts as Android system back.
    history.replaceState({ app: 'base' }, '');
    history.pushState({ app: 'trap' }, '');
    addEventListener('popstate', () => { back(); history.pushState({ app: 'trap' }, ''); });

    const first = cfg.screen && def.screens[cfg.screen] ? cfg.screen : def.start;
    stack = rootStackFor(first);
    if (first !== stack[stack.length - 1].id) stack.push({ id: first, params: cfg.params });
    else stack[stack.length - 1].params = cfg.params;
    show({ forcedState: cfg.screen ? cfg.state : null });
  }

  const isDestination = (id) => (def.destinations || []).some((d) => d.id === id);
  function rootStackFor(id) {
    const home = { id: def.start, params: {} };
    if (id === def.start) return [home];
    if (isDestination(id)) return [home, { id, params: {} }];
    const parent = def.screens[id]?.parent;
    return parent ? rootStackFor(parent) : [home];
  }

  // ---------- navigation ----------
  function navigate(id, p = {}, { replace = false } = {}) {
    if (!def.screens[id]) { console.error(`No screen "${id}"`); return; }
    if (isDestination(id)) stack = rootStackFor(id);
    else if (replace) stack[stack.length - 1] = { id, params: p };
    else stack.push({ id, params: p });
    if (isDestination(id)) stack[stack.length - 1].params = p;
    show({ animate: true });
  }

  /** Android system back: overlays first, then the screen's own handler, then the stack. */
  async function back() {
    if (!els.launcher.hidden) return;
    if (els.sheet.open) { closeOverlay(els.sheet, null); return; }
    if (els.dialog.open) { if (els.dialog.dataset.dismissible !== 'false') closeOverlay(els.dialog, false); return; }
    const screen = def.screens[current?.id];
    if (screen?.onBack && (await screen.onBack(current)) === true) return;
    popScreen();
  }

  function popScreen() {
    if (stack.length > 1) { stack.pop(); show({ animate: true }); return; }
    if (current?.id !== def.start) { stack = rootStackFor(def.start); show({ animate: true }); return; }
    exitApp();
  }

  function exitApp() {
    els.launcher.hidden = false;
    els.main.dataset.screen = 'launcher';
    els.main.dataset.state = 'exited';
    $('button', els.launcher).focus();
  }

  function relaunch() {
    els.launcher.hidden = true;
    stack = rootStackFor(def.start);
    show({ animate: true });
  }

  // ---------- rendering ----------
  async function show({ forcedState = null, animate = false } = {}) {
    const entry = stack[stack.length - 1];
    const screen = def.screens[entry.id];
    const token = ++renderToken;
    current = makeContext(entry, token);

    const top = isDestination(entry.id) || stack.length === 1;
    els.app.dataset.nav = top && !screen.focused ? 'visible' : 'hidden';
    els.app.dataset.focused = screen.focused ? 'true' : 'false';
    els.up.hidden = top;
    els.bar.classList.toggle('has-up', !top);
    els.bar.hidden = screen.appBar === false;
    const activeDest = [...stack].reverse().find((s) => isDestination(s.id))?.id || def.start;
    els.nav.querySelectorAll('.nav-item').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === activeDest ? 'page' : 'false'));
    banner(null);

    if (forcedState) {
      if (forcedState !== 'loading' && screen.load) {
        try { current.data = await screen.load({ ...current, api: (n, a) => clone(MOCK.api[n](db, clone(a))) }); }
        catch (e) { current.error = e; }
      }
      setState(forcedState, token);
    } else if (screen.load) {
      setState('loading', token);
      try {
        const data = await screen.load(current);
        if (token !== renderToken) return;
        current.data = data;
        setState(screen.stateFor ? screen.stateFor(data, current) : Array.isArray(data) && data.length === 0 ? 'empty' : 'content', token);
      } catch (e) {
        if (token !== renderToken) return;
        current.error = e;
        setState(e.type === 'offline' ? 'offline' : 'error', token);
      }
    } else {
      setState(screen.initialState || 'content', token);
    }

    if (animate) { els.main.classList.remove('enter'); void els.main.offsetWidth; els.main.classList.add('enter'); }
    els.main.scrollTop = 0;
    els.main.focus({ preventScroll: true });
  }

  function setState(state, token = renderToken) {
    if (token !== renderToken) return;
    const ctx = current;
    const screen = def.screens[ctx.id];
    ctx.state = state;
    els.main.dataset.screen = ctx.id;
    els.main.dataset.state = state;
    const title = typeof screen.title === 'function' ? screen.title(ctx) : screen.title;
    els.title.textContent = title || '';
    els.actions.innerHTML = (screen.topActions ? screen.topActions(ctx) : []).map((a) => UI.iconButton(a.icon, a.label, a)).join('');
    const fab = screen.fab && (typeof screen.fab === 'function' ? screen.fab(ctx) : screen.fab);
    els.fab.hidden = !fab || state !== 'content' && !fab.always;
    if (fab) {
      els.fab.innerHTML = `${icon(fab.icon || 'add')}${fab.extended === false ? '' : `<span>${esc(fab.label)}</span>`}`;
      els.fab.setAttribute('aria-label', fab.label);
      els.fab.dataset.action = fab.action || '';
      els.fab.dataset.testid = fab.testid || 'fab';
    }
    els.main.innerHTML = String(defaultStateView(screen, ctx, state));
    screen.afterRender?.(ctx, els.main);
  }

  function defaultStateView(screen, ctx, state) {
    const custom = screen.render?.(ctx);
    if (custom != null) return custom;
    if (state === 'loading') return UI.loading();
    if (state === 'error') return UI.error();
    if (state === 'offline') return UI.offline();
    if (state === 'empty') return UI.empty({ title: 'Nothing here yet' });
    return html`<div class="content"><p class="muted">Screen “${ctx.id}” has no content for state “${state}”.</p></div>`;
  }

  function makeContext(entry, token) {
    const ctx = {
      id: entry.id, params: entry.params || {}, state: null, data: null, error: null, dirty: false,
      scenario: cfg.scenario, token,
      api, navigate, back, replace: (id, p) => navigate(id, p, { replace: true }),
      popScreen, setState: (s) => setState(s, token), rerender: () => setState(ctx.state, token), reload: () => show(),
      snackbar, dialog, sheet, banner, requestPermission, html, raw, esc, icon, UI,
      form: () => Object.fromEntries(new FormData(els.main.querySelector('form') || undefined)),
    };
    return ctx;
  }

  // ---------- overlays ----------
  let snackTimer = null;
  function snackbar(message, { action, duration = 4000, testid = 'snackbar' } = {}) {
    return new Promise((resolve) => {
      clearTimeout(snackTimer);
      els.snackbar.innerHTML = `<span class="msg">${esc(message)}</span>${action ? `<button type="button" class="btn text" data-testid="${esc(testid)}-action">${esc(action)}</button>` : ''}`;
      els.snackbar.hidden = false;
      const btn = els.snackbar.querySelector('button');
      if (btn) btn.onclick = () => { hideSnackbar(); resolve(true); };
      snackTimer = setTimeout(() => { hideSnackbar(); resolve(false); }, duration);
    });
  }
  function hideSnackbar() { clearTimeout(snackTimer); els.snackbar.hidden = true; }

  function banner(message, { tone = 'info', icon: ic } = {}) {
    if (!message) { els.banner.hidden = true; return; }
    els.banner.className = `banner ${tone}`;
    els.banner.innerHTML = `${icon(ic || (tone === 'error' ? 'error' : 'info'))}<span>${esc(message)}</span>`;
    els.banner.hidden = false;
  }

  let overlayResolve = new Map();
  function openOverlay(el, markup, resolve) {
    el.innerHTML = markup;
    overlayResolve.set(el, resolve);
    el.show();
    els.scrim.hidden = false;
    el.querySelector('button')?.focus();
  }
  function closeOverlay(el, value) {
    if (!el.open) return;
    el.close();
    els.scrim.hidden = !els.dialog.open && !els.sheet.open;
    const r = overlayResolve.get(el);
    overlayResolve.delete(el);
    r?.(value);
  }

  /** App dialog. Resolves true (confirm) or false (dismiss / back). */
  function dialog({ title, body, confirm = 'OK', dismiss = 'Cancel', icon: ic, destructive = false, system = false, dismissible = true, testid = 'dialog' }) {
    return new Promise((resolve) => {
      els.dialog.className = `app-dialog${system ? ' system' : ''}`;
      els.dialog.dataset.dismissible = String(dismissible);
      els.dialog.dataset.testid = testid;
      openOverlay(els.dialog, `
        ${ic ? `<div class="dialog-icon">${icon(ic)}</div>` : ''}
        <h2 id="dialog-title">${esc(title)}</h2>
        ${body ? `<div class="dialog-body">${body instanceof Raw ? body.s : esc(body)}</div>` : ''}
        <div class="dialog-actions">
          ${dismiss ? `<button type="button" class="btn text" data-testid="${esc(testid)}-dismiss" data-value="false">${esc(dismiss)}</button>` : ''}
          <button type="button" class="btn text" data-testid="${esc(testid)}-confirm" data-value="true"${destructive ? ' style="color:var(--md-error)"' : ''}>${esc(confirm)}</button>
        </div>`, resolve);
      els.dialog.setAttribute('aria-labelledby', 'dialog-title');
    });
  }

  /** Modal bottom sheet. options: [{ label, value, icon, supporting }]. Resolves the chosen value or null. */
  function sheet({ title, body, options = [], testid = 'sheet' }) {
    return new Promise((resolve) => {
      els.sheet.dataset.testid = testid;
      openOverlay(els.sheet, `<div class="handle" aria-hidden="true"></div>
        ${title ? `<h2 id="sheet-title">${esc(title)}</h2>` : ''}
        ${body ? `<div class="sheet-body">${body instanceof Raw ? body.s : esc(body)}</div>` : ''}
        ${options.length ? `<ul class="list">${options.map((o) => UI.listItem({ headline: o.label, supporting: o.supporting, leadingIcon: o.icon, value: o.value, testid: `${testid}-${o.value}` })).join('')}</ul>` : ''}`, resolve);
      if (title) els.sheet.setAttribute('aria-labelledby', 'sheet-title');
    });
  }

  /**
   * Simulated Android runtime permission. Returns 'granted' | 'denied' | 'blocked'.
   * Scenario mock data can preset permissions: { bluetooth: 'granted' | 'denied' | 'blocked' }.
   * A second denial becomes 'blocked' (Android's "don't ask again").
   */
  async function requestPermission(name, { prompt, rationale } = {}) {
    const state = permissions[name] || 'ask';
    if (state === 'granted' || state === 'blocked') return state;
    if (rationale && (state === 'denied' || rationale.always)) {
      const go = await dialog({ title: rationale.title, body: rationale.body, confirm: rationale.confirm || 'Continue', dismiss: 'Not now', icon: rationale.icon, testid: 'rationale' });
      if (!go) return 'denied';
    }
    const allowed = await dialog({
      title: prompt || `Allow ${def.appName || 'this app'} to use ${name}?`,
      confirm: 'Allow', dismiss: 'Don’t allow', system: true, testid: `permission-${name}`,
    });
    permissions[name] = allowed ? 'granted' : state === 'denied' ? 'blocked' : 'denied';
    return permissions[name];
  }

  // ---------- events ----------
  function wireEvents() {
    els.up.innerHTML = String(icon('back'));
    els.up.addEventListener('click', () => back());
    $('#system-back').addEventListener('click', () => back());
    $('#system-home').addEventListener('click', exitApp);
    $('button', els.launcher).addEventListener('click', relaunch);

    addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); back(); } });   // Esc = back
    els.scrim.addEventListener('click', () => {                                                     // tap outside
      if (els.sheet.open) closeOverlay(els.sheet, null);
      else if (els.dialog.open && els.dialog.dataset.dismissible !== 'false') closeOverlay(els.dialog, false);
    });
    for (const d of [els.dialog, els.sheet]) {
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-value]');
        if (b) closeOverlay(d, b.dataset.value === 'true' ? true : b.dataset.value === 'false' ? false : b.dataset.value);
      });
    }

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nav], [data-action]');
      if (!el || el.closest('dialog') || !current) return;
      if (el.dataset.nav) {
        const p = {};
        for (const [k, v] of Object.entries(el.dataset)) if (k.startsWith('param')) p[k.slice(5, 6).toLowerCase() + k.slice(6)] = v;
        navigate(el.dataset.nav, p);
      } else if (el.dataset.action) {
        runAction(el.dataset.action, el, e);
      }
    });
    els.main.addEventListener('submit', (e) => {
      e.preventDefault();
      const action = e.target.dataset.submit;
      if (action) runAction(action, e.target, e);
    });
    els.main.addEventListener('input', () => { if (current) current.dirty = true; });
    els.main.addEventListener('scroll', () => els.bar.classList.toggle('scrolled', els.main.scrollTop > 0));
  }

  function runAction(name, el, event) {
    if (name === '__retry') return show();
    if (name === '__back') return back();
    const fn = def.screens[current.id]?.actions?.[name] || def.actions?.[name];
    if (!fn) { console.error(`Screen "${current.id}" has no action "${name}"`); return; }
    return fn(current, el, event);
  }

  function buildNav() {
    els.nav.innerHTML = (def.destinations || []).map((d) =>
      `<button type="button" class="nav-item" data-nav="${esc(d.id)}" data-testid="nav-${esc(d.id)}"><span class="indicator">${icon(d.icon || 'home')}</span><span>${esc(d.label)}</span></button>`).join('');
    if ((def.destinations || []).length < 2) els.nav.hidden = true;
  }

  function buildDebugPanel() {
    const toggle = document.createElement('button');
    toggle.className = 'debug-toggle'; toggle.textContent = '⚙'; toggle.setAttribute('aria-label', 'Prototype debug panel');
    const panel = document.createElement('aside');
    panel.className = 'debug-panel'; panel.hidden = true;
    const opts = (list, sel) => list.map((v) => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
    const latencyName = Object.keys(LATENCY).find((k) => LATENCY[k] === cfg.latency) || String(cfg.latency);
    panel.innerHTML = `
      <label>Scenario<select name="scenario">${opts(Object.keys(MOCK.scenarios), cfg.scenario)}</select></label>
      <label>Latency<select name="latency">${opts(['fast', 'normal', 'slow'], latencyName)}</select></label>
      <label>Screen<select name="screen"><option value="">(start)</option>${opts(Object.keys(def.screens), cfg.screen)}</select></label>
      <label>State<select name="state"><option value="">(natural)</option>${opts(['loading', 'content', 'empty', 'error', 'offline', 'partial', 'success'], cfg.state)}</select></label>
      <label>Theme<select name="theme"><option value="">(system)</option>${opts(['light', 'dark'], cfg.theme)}</select></label>
      <label>Font scale<select name="fontScale">${opts(['1', '1.3', '2'], String(cfg.fontScale))}</select></label>
      <button type="button">Apply</button>`;
    panel.querySelector('button').onclick = () => {
      const q = new URLSearchParams({ debug: '1' });
      panel.querySelectorAll('select').forEach((s) => { if (s.value && !(s.name === 'fontScale' && s.value === '1')) q.set(s.name, s.value); });
      location.search = q.toString();
    };
    toggle.onclick = () => { panel.hidden = !panel.hidden; };
    document.body.append(toggle, panel);
  }

  // ---------- audit for Playwright MCP: browser_evaluate(() => window.__prototypeAudit()) ----------
  window.__prototypeAudit = function () {
    const describe = (el) => {
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.dataset.testid ? `[data-testid=${el.dataset.testid}]` : ''} "${name}" ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const scope = [document.getElementById('app'), ...document.querySelectorAll('dialog[open]')];
    const interactive = scope.flatMap((root) => [...root.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=switch], [role=tab], [tabindex]:not([tabindex="-1"])')])
      .filter((el) => visible(el) && !el.disabled && !el.closest('[hidden]') && !(el.tagName === 'A' && el.closest('p')));

    const smallTargets = interactive.filter((el) => {
      const r = el.getBoundingClientRect();
      const a = getComputedStyle(el, '::after');
      let w = r.width, h = r.height;
      if (a.content !== 'none' && a.position === 'absolute') {
        h += Math.max(0, -parseFloat(a.top) || 0) + Math.max(0, -parseFloat(a.bottom) || 0);
        w += Math.max(0, -parseFloat(a.left) || 0) + Math.max(0, -parseFloat(a.right) || 0);
      }
      if (el.type === 'checkbox' || el.type === 'radio') { const l = el.closest('label'); if (l) { const lr = l.getBoundingClientRect(); w = Math.max(w, lr.width); h = Math.max(h, lr.height); } }
      return w < 47.5 || h < 47.5;
    }).map(describe);

    const unnamedControls = interactive.filter((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title) return false;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return !(el.labels && el.labels.length);
      return !el.textContent.trim();
    }).map(describe);

    const vw = document.documentElement.clientWidth;
    const overflow = [];
    if (document.documentElement.scrollWidth > vw + 1) overflow.push(`page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);
    document.querySelectorAll('#app *').forEach((el) => {
      if (!visible(el) || el.closest('[hidden]')) return;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) overflow.push(describe(el));
    });

    const clippedText = [...document.querySelectorAll('#screen *')].filter((el) => {
      if (!visible(el) || el.classList.contains('allow-clip') || !el.textContent.trim()) return false;
      const s = getComputedStyle(el);
      const clips = ['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflowY) || s.textOverflow === 'ellipsis';
      return clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    }).map(describe);

    const main = document.getElementById('screen');
    const missingState = [];
    if (!main.dataset.screen) missingState.push('main[data-screen] is empty');
    if (!main.dataset.state) missingState.push('main[data-state] is empty');

    return { screen: main.dataset.screen, state: main.dataset.state, smallTargets, unnamedControls, overflow: overflow.slice(0, 20), clippedText, missingState };
  };

  window.App = { start, navigate, back, snackbar, dialog, sheet, banner, requestPermission, api, UI, html, raw, esc, icon, ICONS, config: cfg };
})();
