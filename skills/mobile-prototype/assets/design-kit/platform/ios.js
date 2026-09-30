/* iOS platform: device chrome, UIKit/SwiftUI-style component markup and iOS behaviour.
   - No system back button. Back is the navigation bar's back button (‹ previous title) or the
     edge swipe from the left; browser back and Esc do the same. Back at the root of a tab does
     nothing: an iOS app never "exits".
   - The screen's `fab` becomes a + button at the trailing end of the navigation bar.
   - `focused` screens are presented modally: no tab bar, "Cancel" instead of the back button.
   - Dialogs are alerts; a sheet that only offers options is an action sheet with Cancel.
   - `ctx.snackbar` is drawn as a toast (iOS has no native snackbar: flag it in the handoff).
   - Runtime permissions: optional pre-prompt (the app's own alert) → system alert, which iOS
     shows only once: a single denial is final ('blocked'); only Settings can change it.
   Look: platform/ios.css with tokens/ios.css. Behaviour rules:
   references/platforms/ios/conventions.md in the skill. */
(function () {
  'use strict';
  const svg = (inner, box = '0 0 24 24') => `<svg viewBox="${box}" aria-hidden="true">${inner}</svg>`;
  const STATUS = {
    signal: svg('<rect x="1" y="15" width="4" height="6" rx="1"/><rect x="7" y="11" width="4" height="10" rx="1"/><rect x="13" y="7" width="4" height="14" rx="1"/><rect x="19" y="3" width="4" height="18" rx="1"/>'),
    wifi: svg('<path d="M12 18.5 14.6 15.6a3.6 3.6 0 0 0-5.2 0zM12 11.3c2 0 3.8.8 5.1 2.1l1.7-1.9A9.5 9.5 0 0 0 12 8.6a9.5 9.5 0 0 0-6.8 2.9l1.7 1.9A7.1 7.1 0 0 1 12 11.3zm0-5.6c3.6 0 6.9 1.4 9.3 3.8L23 7.6A15.3 15.3 0 0 0 12 3 15.3 15.3 0 0 0 1 7.6l1.7 1.9A12.8 12.8 0 0 1 12 5.7z"/>'),
    battery: svg('<rect x="0.5" y="0.5" width="24" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2.5" y="2.5" width="18" height="8" rx="2"/><path d="M26 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/>', '0 0 27 13'),
  };

  // iOS-style glyphs (simple geometry). SF Symbols can't be embedded in a web prototype; record
  // the intended SF Symbol per icon in the handoff instead.
  const icons = {
    back: 'M15.6 3.4 17 4.8 9.8 12l7.2 7.2-1.4 1.4L7 12z',
    chevron: 'M8.4 4.4 9.8 3l9 9-9 9-1.4-1.4 7.6-7.6z',
    add: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
    more: 'M6 10.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zm6 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zm6 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z',
  };

  // Titles of iOS system permission alerts (the OS writes these; the app supplies the message).
  const SYSTEM_TITLES = {
    notifications: (a) => `“${a}” Would Like to Send You Notifications`,
    bluetooth: (a) => `“${a}” Would Like to Use Bluetooth`,
    camera: (a) => `“${a}” Would Like to Access the Camera`,
    microphone: (a) => `“${a}” Would Like to Access the Microphone`,
    photos: (a) => `“${a}” Would Like to Access Your Photos`,
    contacts: (a) => `“${a}” Would Like to Access Your Contacts`,
    location: (a) => `Allow “${a}” to use your location?`,
    health: (a) => `“${a}” Would Like to Access Your Health Data`,
  };
  const NOTIFICATIONS_BODY = 'Notifications may include alerts, sounds and icon badges. These can be configured in Settings.';

  const backLabel = (t) => (t && t.length <= 14 ? t : 'Back');
  let backText = null;

  App.registerPlatform('ios', {
    label: 'iOS',
    minTarget: 44,          // pt
    rootBack: 'none',
    icons,

    chrome: ({ appName, esc, icon }) => `
      <div class="status-bar" aria-hidden="true">
        <span class="time">9:41</span>
        <span class="island"></span>
        <span class="status-icons">${STATUS.signal}${STATUS.wifi}${STATUS.battery}</span>
      </div>

      <nav class="nav" id="nav" aria-label="Tabs"></nav>

      <div class="pane">
        <header class="nav-bar" id="top-app-bar">
          <div class="bar-leading">
            <button type="button" class="back-button" id="up-button" data-testid="up" hidden>${icon('back')}<span class="back-label">Back</span></button>
          </div>
          <h1 id="screen-title"></h1>
          <div class="top-actions" id="top-actions"></div>
        </header>
        <div class="banner" id="banner" role="status" hidden></div>
        <main id="screen" tabindex="-1" data-screen="" data-state=""></main>
        <div class="edge-swipe" id="edge-swipe" data-testid="edge-swipe" aria-hidden="true"></div>
        <button type="button" id="fab" hidden></button>
        <div class="snackbar" id="snackbar" role="status" aria-live="polite" data-testid="snackbar" hidden></div>
      </div>

      <div class="home-indicator" data-system-ui>
        <button type="button" id="system-home" aria-label="Home (swipe up)" data-testid="system-home"><span></span></button>
      </div>

      <div class="scrim" id="scrim" hidden></div>
      <dialog id="dialog" class="alert"></dialog>
      <dialog id="sheet" class="ios-sheet"></dialog>

      <div class="launcher" id="launcher" hidden>
        <button type="button" data-testid="launcher-open"><span class="app-icon" aria-hidden="true">◆</span><span>${esc(appName)}</span></button>
      </div>`,

    navItem: (d, { esc, icon }) =>
      `<button type="button" class="tab-item" data-nav="${esc(d.id)}" data-testid="nav-${esc(d.id)}">${icon(d.icon || 'home')}<span>${esc(d.label)}</span></button>`,

    /** Navigation bar: large title at the top level, inline below it; + for the primary action. */
    renderBar(bar, els) {
      backText ||= els.up.querySelector('.back-label');
      const modal = bar.focused;
      els.up.hidden = bar.top && !modal;
      els.up.classList.toggle('cancel', modal);
      backText.textContent = modal ? 'Cancel' : backLabel(bar.previousTitle);
      els.bar.hidden = bar.hidden;
      els.bar.classList.toggle('large', bar.top && !modal);
      els.title.textContent = bar.title;
      const buttons = bar.actions.map((a) => App.UI.iconButton(a.icon, a.label, a));
      if (bar.fab) buttons.push(App.UI.iconButton(bar.fab.icon || 'add', bar.fab.label, { action: bar.fab.action, testid: bar.fab.testid || 'fab' }));
      els.actions.innerHTML = buttons.join('');
      els.fab.hidden = true;
    },

    snackbar: ({ message, action, testid }, { esc }) =>
      `<span class="msg">${esc(message)}</span>${action ? `<button type="button" class="toast-action" data-testid="${esc(testid)}-action">${esc(action)}</button>` : ''}`,

    /** Alert: title, message, buttons side by side (Cancel first), stacked when long. */
    dialog: (o, { esc, markup }) => {
      const labels = [o.dismiss, o.confirm].filter(Boolean);
      const stacked = labels.join('').length > 22;
      return {
        className: `alert${o.system ? ' system' : ''}${stacked ? ' stacked' : ''}`,
        content: `
          <div class="alert-text">
            <h2 id="dialog-title">${esc(o.title)}</h2>
            ${o.body ? `<div class="alert-body">${markup(o.body)}</div>` : ''}
          </div>
          <div class="alert-actions">
            ${o.dismiss ? `<button type="button" data-testid="${esc(o.testid)}-dismiss" data-value="false">${esc(o.dismiss)}</button>` : ''}
            <button type="button" class="${o.destructive ? 'destructive' : 'preferred'}" data-testid="${esc(o.testid)}-confirm" data-value="true">${esc(o.confirm)}</button>
          </div>`,
      };
    },

    /** Options only → action sheet with Cancel. Otherwise a sheet with a grabber (medium detent). */
    sheet: (o, { esc, markup, icon }) => {
      if (o.options.length && !o.body) {
        return {
          className: 'action-sheet',
          content: `
            <div class="action-group">
              ${o.title ? `<h2 id="sheet-title">${esc(o.title)}</h2>` : ''}
              ${o.options.map((x) => `<button type="button" data-value="${esc(x.value)}" data-testid="${esc(o.testid)}-${esc(x.value)}">${esc(x.label)}${x.supporting ? `<small>${esc(x.supporting)}</small>` : ''}</button>`).join('')}
            </div>
            <div class="action-group"><button type="button" class="cancel" data-value="__null" data-testid="${esc(o.testid)}-cancel">Cancel</button></div>`,
        };
      }
      return {
        className: 'ios-sheet',
        content: `<div class="grabber" aria-hidden="true"></div>
          ${o.title ? `<h2 id="sheet-title">${esc(o.title)}</h2>` : ''}
          ${o.body ? `<div class="sheet-body">${markup(o.body)}</div>` : ''}
          ${o.options.length ? `<ul class="list">${o.options.map((x) => App.UI.listItem({ headline: x.label, supporting: x.supporting, leadingIcon: x.icon, value: x.value, testid: `${o.testid}-${x.value}` })).join('')}</ul>` : ''}`,
      };
    },

    /**
     * iOS permission. options:
     *   usage      the app's purpose string, shown as the system alert's message (required copy on iOS)
     *   rationale  { title, body, confirm } — the app's own pre-prompt, shown before the one system alert
     *   prompt     string (Android wording, ignored here) or { ios } to override the OS title
     */
    async requestPermission(name, { prompt, rationale, usage } = {}, { permissions, dialog, appName }) {
      const state = permissions[name] || 'ask';
      if (state === 'granted') return 'granted';
      if (state !== 'ask') return (permissions[name] = 'blocked');       // iOS asks only once
      if (rationale) {
        const go = await dialog({ title: rationale.title, body: rationale.body, confirm: rationale.confirm || 'Continue', dismiss: 'Not Now', testid: 'rationale' });
        if (!go) return 'denied';                                         // the system alert is still unused
      }
      const title = (prompt && typeof prompt === 'object' && prompt.ios) || (SYSTEM_TITLES[name] || ((a) => `“${a}” Would Like to Access ${name}`))(appName);
      const allowed = await dialog({
        // Notifications have OS-written text; every other permission shows the app's purpose string.
        title, body: name === 'notifications' ? NOTIFICATIONS_BODY : usage || rationale?.body || '',
        confirm: 'Allow', dismiss: 'Don’t Allow', system: true, testid: `permission-${name}`,
      });
      return (permissions[name] = allowed ? 'granted' : 'blocked');
    },

    /** Edge swipe from the left edge pops a screen (a tap on the strip passes through). */
    wire({ els, back }) {
      const strip = document.getElementById('edge-swipe');
      let start = null;
      strip.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; strip.setPointerCapture(e.pointerId); });
      strip.addEventListener('pointerup', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = Math.abs(e.clientY - start.y);
        const at = start; start = null;
        if (dx > 60 && dx > dy) { back(); return; }
        if (dx < 8 && dy < 8) {                                            // a tap: hand it to what's underneath
          strip.style.pointerEvents = 'none';
          document.elementFromPoint(at.x, at.y)?.click();
          strip.style.pointerEvents = '';
        }
      });
      strip.addEventListener('pointercancel', () => { start = null; });
      els.main.addEventListener('scroll', () => els.bar.classList.toggle('scrolled', els.main.scrollTop > 8));
    },
  });
})();
