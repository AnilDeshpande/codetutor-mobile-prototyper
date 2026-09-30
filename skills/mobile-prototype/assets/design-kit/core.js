/* Design-kit runtime, shared by every platform: it draws one screen state of the flow in the
   platform's look, with its overlays, and runs the audit. The platform look (device chrome, how
   components, dialogs and permission prompts look) comes from platform/<name>.js, which
   registers itself with App.registerPlatform(). Screens come from flow-screens.js, which reads
   the flow spec in flow-data.js. Generated into docs/prototypes/look/ by scripts/screens.mjs; the
   style tile (style-tile.js) uses it too. Don't edit the copies in look/.

   URL parameters
     platform=<android|ios>  which platform to show when the prototype has more than one
     screen=<id>&state=<state>&params=<json>   open a screen directly, optionally forcing a state
     theme=<light|dark> force a theme (otherwise follows the browser)
     fontScale=<n>      text size multiplier, e.g. 2 for 200 %
     chrome=off|on      hide or show the simulated status and system bars (default: shown, except
                        on a touch device such as a real phone, which has its own)

   This file is loaded in <head>, after the platform stylesheets, so it can pick the platform
   before the first paint. Everything else waits for App.start().
*/
(function () {
  'use strict';

  // ---------- configuration from the URL ----------
  const query = new URLSearchParams(location.search);
  const cfg = {
    theme: query.get('theme'),
    fontScale: Number(query.get('fontScale')) || 1,
    chrome: query.has('chrome') ? query.get('chrome') !== 'off' : !matchMedia('(pointer: coarse)').matches,
    screen: query.get('screen'),
    state: query.get('state'),
    params: safeJson(query.get('params')) || {},
  };
  if (cfg.theme) document.documentElement.dataset.theme = cfg.theme;
  if (cfg.fontScale !== 1) document.documentElement.style.fontSize = `${16 * cfg.fontScale}px`;

  // ---------- platform choice (before first paint) ----------
  // index.html links one tokens + one shell stylesheet per platform in scope, marked data-platform.
  const platformLinks = [...document.querySelectorAll('link[data-platform]')];
  const available = [...new Set(platformLinks.map((l) => l.dataset.platform))];
  const platformName = available.includes(query.get('platform')) ? query.get('platform') : available[0] || 'android';
  for (const l of platformLinks) l.disabled = l.dataset.platform !== platformName;
  document.documentElement.dataset.platform = platformName;
  const adapters = {};
  let P = null;                 // the active platform adapter

  // ---------- small helpers ----------
  function safeJson(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(s);
  const fmt = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join('') : esc(v));
  /** Tagged template that escapes interpolated values; nest html`` or raw() for markup. */
  const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? fmt(vals[i]) : ''), ''));
  const $ = (sel, root = document) => root.querySelector(sel);
  /** Markup that may be plain text or html``/raw() output. */
  const markup = (v) => (v instanceof Raw ? v.s : esc(v));

  // Icon paths (Material Symbols, Apache 2.0): name → SVG path data. Platforms may replace or
  // add icons (adapter.icons); screens only use the names.
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
  };
  const icon = (name, cls = '') => raw(`<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}><path d="${ICONS[name] || name}"/></svg>`);

  // ---------- UI building blocks for screens ----------
  // Semantic components: each platform's stylesheet gives them its own look, and an adapter may
  // replace any of them (adapter.ui) when the markup itself has to differ.
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

  // ---------- app state ----------
  let def = null;              // the App.start() configuration
  let stack = [];              // [{ id, params }]
  let current = null;          // the live screen context
  let renderToken = 0;
  const els = {};
  const permissions = {};      // what the simulated permission prompts have answered so far

  function registerPlatform(name, adapter) { adapters[name] = adapter; }

  function start(definition) {
    def = definition;
    P = adapters[platformName];
    if (!P) throw new Error(`No platform adapter for "${platformName}". Is platform/${platformName}.js loaded?`);
    Object.assign(ICONS, P.icons || {});
    Object.assign(UI, P.ui || {});
    document.title = `${def.appName || 'App'} — screens`;

    const app = $('#app');
    app.innerHTML = P.chrome({ appName: def.appName || 'App', esc, icon });
    Object.assign(els, {
      app, nav: $('#nav'), title: $('#screen-title'), up: $('#up-button'), actions: $('#top-actions'),
      bar: $('#top-app-bar'), banner: $('#banner'), main: $('#screen'), fab: $('#fab'), snackbar: $('#snackbar'),
      dialog: $('#dialog'), sheet: $('#sheet'), scrim: $('#scrim'), launcher: $('#launcher'),
    });
    els.app.dataset.chrome = cfg.chrome ? 'on' : 'off';
    buildNav();
    wireEvents();

    // Browser back acts as the platform's back.
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

  /** Back: overlays first, then the screen's own handler, then the stack. */
  async function back() {
    if (!els.launcher.hidden) return;
    if (els.sheet.open) { closeOverlay(els.sheet, null); return; }
    if (els.dialog.open) { if (els.dialog.dataset.dismissible !== 'false') closeOverlay(els.dialog, false); return; }
    const screen = def.screens[current?.id];
    if (screen?.onBack && (await screen.onBack(current)) === true) return;
    popScreen();
  }

  /** One step up the stack. At the root, the platform decides: 'exit' (Android) or 'none'. */
  function popScreen() {
    if (stack.length > 1) { stack.pop(); show({ animate: true }); return; }
    if (current?.id !== def.start) { stack = rootStackFor(def.start); show({ animate: true }); return; }
    if (P.rootBack === 'exit') exitApp();
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
  const titleOf = (entry, ctx) => {
    const t = def.screens[entry.id]?.title;
    return typeof t === 'function' ? t(ctx || { id: entry.id, params: entry.params || {}, data: null, state: null }) : t;
  };

  function show({ forcedState = null, animate = false } = {}) {
    const entry = stack[stack.length - 1];
    const screen = def.screens[entry.id];
    const token = ++renderToken;
    current = makeContext(entry, token);

    const top = isDestination(entry.id) || stack.length === 1;
    els.app.dataset.navState = top && !screen.focused ? 'visible' : 'hidden';
    els.app.dataset.focused = screen.focused ? 'true' : 'false';
    els.app.dataset.top = String(top);
    const activeDest = [...stack].reverse().find((s) => isDestination(s.id))?.id || def.start;
    els.nav.querySelectorAll('[data-nav]').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === activeDest ? 'page' : 'false'));
    banner(null);

    setState(forcedState || screen.initialState || 'content', token);

    if (animate) { els.main.classList.remove('enter'); void els.main.offsetWidth; els.main.classList.add('enter'); }
    els.main.scrollTop = 0;
    els.bar?.classList.remove('scrolled');
    els.main.focus({ preventScroll: true });
  }

  function setState(state, token = renderToken) {
    if (token !== renderToken) return;
    const ctx = current;
    const screen = def.screens[ctx.id];
    ctx.state = state;
    els.main.dataset.screen = ctx.id;
    els.main.dataset.state = state;
    const fab = screen.fab && (typeof screen.fab === 'function' ? screen.fab(ctx) : screen.fab);
    const prev = stack.length > 1 ? stack[stack.length - 2] : null;
    P.renderBar({
      top: els.app.dataset.top === 'true',
      hidden: screen.appBar === false,
      focused: !!screen.focused,
      title: titleOf(stack[stack.length - 1], ctx) || '',
      previousTitle: prev ? titleOf(prev) || '' : '',
      actions: screen.topActions ? screen.topActions(ctx) : [],
      fab: fab && (state === 'content' || fab.always) ? fab : null,
      state,
    }, els);
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
      platform: platformName, token,
      navigate, back, replace: (id, p) => navigate(id, p, { replace: true }),
      popScreen, setState: (s) => setState(s, token), rerender: () => setState(ctx.state, token), reload: () => show(),
      snackbar, dialog, sheet, banner, requestPermission, html, raw, esc, icon, UI,
      form: () => Object.fromEntries(new FormData(els.main.querySelector('form') || undefined)),
    };
    return ctx;
  }

  // ---------- overlays ----------
  let snackTimer = null;
  /** Transient message with an optional action. Resolves true if the action was used. */
  function snackbar(message, { action, duration = 4000, testid = 'snackbar' } = {}) {
    return new Promise((resolve) => {
      clearTimeout(snackTimer);
      els.snackbar.innerHTML = P.snackbar({ message, action, testid }, { esc, icon });
      els.snackbar.hidden = false;
      const btn = els.snackbar.querySelector('button');
      if (btn) btn.onclick = () => { hideSnackbar(); resolve(true); };
      snackTimer = setTimeout(() => { hideSnackbar(); resolve(false); }, duration);
    });
  }
  function hideSnackbar() { clearTimeout(snackTimer); els.snackbar.hidden = true; }

  /** Inline status under the top bar. tone: 'info' | 'error'. */
  function banner(message, { tone = 'info', icon: ic } = {}) {
    if (!message) { els.banner.hidden = true; return; }
    els.banner.className = `banner ${tone}`;
    els.banner.innerHTML = `${icon(ic || (tone === 'error' ? 'error' : 'info'))}<span>${esc(message)}</span>`;
    els.banner.hidden = false;
  }

  const overlayResolve = new Map();
  function openOverlay(el, content, resolve) {
    el.innerHTML = content;
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

  /**
   * App dialog. Resolves true (confirm) or false (dismiss / back).
   * system: true draws it as operating-system UI (permission prompts).
   * Buttons carry data-value="true|false" and data-testid="<testid>-confirm|-dismiss".
   */
  function dialog(opts) {
    const o = { confirm: 'OK', dismiss: 'Cancel', destructive: false, system: false, dismissible: true, testid: 'dialog', ...opts };
    return new Promise((resolve) => {
      const { className, content } = P.dialog(o, { esc, icon, markup });
      els.dialog.className = className;
      els.dialog.dataset.dismissible = String(o.dismissible);
      els.dialog.dataset.testid = o.testid;
      openOverlay(els.dialog, content, resolve);
      els.dialog.setAttribute('aria-labelledby', 'dialog-title');
    });
  }

  /** Modal sheet. options: [{ label, value, icon, supporting }]. Resolves the chosen value or null. */
  function sheet(opts) {
    const o = { options: [], testid: 'sheet', ...opts };
    return new Promise((resolve) => {
      const { className, content } = P.sheet(o, { esc, icon, markup, UI });
      els.sheet.className = className;
      els.sheet.dataset.testid = o.testid;
      openOverlay(els.sheet, content, resolve);
      if (o.title) els.sheet.setAttribute('aria-labelledby', 'sheet-title');
      else els.sheet.removeAttribute('aria-labelledby');
    });
  }

  /**
   * Simulated runtime permission. Returns 'granted' | 'denied' | 'blocked'.
   * How often the system asks, and when a denial becomes 'blocked', is the platform's rule.
   */
  function requestPermission(name, options = {}) {
    return P.requestPermission(name, options, { permissions, dialog, appName: def.appName || 'this app' });
  }

  // ---------- events ----------
  function wireEvents() {
    els.up?.addEventListener('click', () => back());
    $('#system-back')?.addEventListener('click', () => back());
    $('#system-home')?.addEventListener('click', exitApp);
    $('button', els.launcher).addEventListener('click', relaunch);

    addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); back(); } });   // Esc = back
    els.scrim.addEventListener('click', () => {                                                     // tap outside
      if (els.sheet.open) closeOverlay(els.sheet, null);
      else if (els.dialog.open && els.dialog.dataset.dismissible !== 'false') closeOverlay(els.dialog, false);
    });
    for (const d of [els.dialog, els.sheet]) {
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-value]');
        const v = b?.dataset.value;
        if (b) closeOverlay(d, v === 'true' ? true : v === 'false' ? false : v === '__null' ? null : v);
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
    els.main.addEventListener('scroll', () => els.bar?.classList.toggle('scrolled', els.main.scrollTop > 0));
    P.wire?.({ els, back, exitApp });
  }

  function runAction(name, el, event) {
    if (name === '__retry') return show();
    if (name === '__back') return back();
    const fn = def.screens[current.id]?.actions?.[name] || def.actions?.[name];
    if (!fn) { console.error(`Screen "${current.id}" has no action "${name}"`); return; }
    return fn(current, el, event);
  }

  function buildNav() {
    const dests = def.destinations || [];
    els.nav.innerHTML = dests.map((d) => P.navItem(d, { esc, icon })).join('');
    if (dests.length < 2) els.nav.hidden = true;
  }

  // ---------- audit: look/screens.html calls window.__prototypeAudit() on every screen ----------
  // Pass { minContrast: 7 } when the product commits to WCAG AAA (DESIGN.md "contrast: high").
  window.__prototypeAudit = function ({ minContrast = 4.5 } = {}) {
    const minTarget = P?.minTarget || 48;
    // Settle finite animations first, so a screen still sliding in isn't reported as overflow.
    for (const a of document.getAnimations()) {
      if (Number.isFinite(a.effect?.getComputedTiming?.().endTime)) a.finish();
    }
    const describe = (el) => {
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.dataset.testid ? `[data-testid=${el.dataset.testid}]` : ''} "${name}" ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const scope = [document.getElementById('app'), ...document.querySelectorAll('dialog[open]')];
    const interactive = scope.flatMap((root) => [...root.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=switch], [role=tab], [tabindex]:not([tabindex="-1"])')])
      .filter((el) => visible(el) && !el.disabled && !el.closest('[hidden]') && !(el.tagName === 'A' && el.closest('p')));

    // Simulated OS chrome (marked data-system-ui) isn't app UI, so its sizes aren't the app's to fix.
    const smallTargets = interactive.filter((el) => !el.closest('[data-system-ui]')).filter((el) => {
      const r = el.getBoundingClientRect();
      const a = getComputedStyle(el, '::after');
      let w = r.width, h = r.height;
      if (a.content !== 'none' && a.position === 'absolute') {
        h += Math.max(0, -parseFloat(a.top) || 0) + Math.max(0, -parseFloat(a.bottom) || 0);
        w += Math.max(0, -parseFloat(a.left) || 0) + Math.max(0, -parseFloat(a.right) || 0);
      }
      if (el.type === 'checkbox' || el.type === 'radio') { const l = el.closest('label'); if (l) { const lr = l.getBoundingClientRect(); w = Math.max(w, lr.width); h = Math.max(h, lr.height); } }
      return w < minTarget - 0.5 || h < minTarget - 0.5;
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

    // Content that spills out of its own box (and so is drawn over its neighbours), typically a
    // flex row whose text column was squeezed at a large font scale.
    const overlapping = [...document.querySelectorAll('#screen *')].filter((el) => {
      if (!visible(el) || el.classList.contains('allow-overlap') || el.closest('svg') || !el.textContent.trim()) return false;
      const s = getComputedStyle(el);
      if (s.display === 'inline' || !['visible'].includes(s.overflowX) || !el.clientWidth) return false;
      return el.scrollWidth > el.clientWidth + 1;
    }).map(describe);

    // Text below 4.5:1 (or minContrast) against what is actually behind it (3:1 for large text; 4.5:1
    // at AAA), in the app and in open dialogs. Backgrounds are composited up the tree; text over images or gradients is skipped.
    const parseColor = (s) => {
      const m = s.match(/^rgba?\(([^)]+)\)$/) || s.match(/^color\(srgb ([^)]+)\)$/);
      if (!m) return null;
      const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      const scale = s.startsWith('color(') ? 255 : 1;
      return { r: n[0] * scale, g: n[1] * scale, b: n[2] * scale, a: n.length > 3 ? n[3] : 1 };
    };
    const blend = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = (c) => [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const canvas = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const backdrop = (el) => {
      const layers = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== 'none') return null;
        const c = parseColor(s.backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      }
      return layers.reduceRight((under, top) => blend(top, under), canvas.a >= 1 ? canvas : { r: 255, g: 255, b: 255, a: 1 });
    };
    const lowContrast = [];
    for (const root of scope) {
      for (const el of root.querySelectorAll('*')) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (!visible(el) || el.closest('[hidden], [aria-hidden="true"], [data-system-ui], .allow-low-contrast') || el.closest('button:disabled, input:disabled')) continue;
        const s = getComputedStyle(el);
        let fg = parseColor(s.color);
        const bg = backdrop(el);
        if (!fg || !bg) continue;
        let opacity = 1;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
        fg = blend({ ...fg, a: fg.a * opacity }, bg);
        const [l1, l2] = [lum(fg), lum(bg)];
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
        if (ratio < (large ? (minContrast >= 7 ? 4.5 : 3) : minContrast) - 0.01) lowContrast.push(`${describe(el)} ${ratio.toFixed(2)}:1`);
      }
    }

    const main = document.getElementById('screen');
    const missingState = [];
    if (!main.dataset.screen) missingState.push('main[data-screen] is empty');
    if (!main.dataset.state) missingState.push('main[data-state] is empty');

    return { platform: platformName, screen: main.dataset.screen, state: main.dataset.state, smallTargets, unnamedControls, overflow: overflow.slice(0, 20), clippedText, overlapping, lowContrast: lowContrast.slice(0, 20), missingState };
  };

  window.App = {
    start, registerPlatform, navigate, back, snackbar, dialog, sheet, banner, requestPermission,
    UI, html, raw, esc, icon, ICONS, config: cfg, platform: platformName, platforms: available,
  };
})();
