/* Style tile: the design direction shown in the prototype's own platform shell — palette with
   contrast ratios, type scale, and the components the screens use. Generated next to the
   prototype by scripts/theme.mjs (style-tile.html + this file); don't edit, it is replaced.

   style-tile.html?platform=<android|ios>&theme=<light|dark>[&option=<name>][&screen=<id>&state=<state>]
     screens: components (states: content, dialog, sheet, snackbar), colour, type, detail
*/
(function () {
  const { html, UI } = App;
  const appName = document.title.split(' — ')[0] || 'App';
  const root = document.documentElement;
  const cssVar = (n) => getComputedStyle(root).getPropertyValue(`--${n}`).trim();

  // Minimal contrast maths (the report from theme.mjs is authoritative; this is for the eye).
  const rgb = (s) => {
    const probe = document.createElement('span');
    probe.style.color = s; document.body.append(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    probe.remove();
    return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
  };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const ratio = (fg, bg) => { const b = rgb(bg); const f = over(rgb(fg), b); const [x, y] = [lum(f), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (s) => { const c = rgb(s); return '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') + (c.a < 1 ? ` · ${Math.round(c.a * 100)}%` : ''); };

  // [background, text on it, label] per platform; the neutral roles first.
  const SWATCHES = {
    neutral: [
      ['color-primary', 'color-on-primary', 'Primary'],
      ['color-primary-container', 'color-on-primary-container', 'Primary container'],
      ['color-surface', 'color-on-surface', 'Surface'],
      ['color-surface-raised', 'color-muted', 'Raised surface · muted text'],
      ['color-error', 'color-on-error', 'Error'],
      ['color-error-container', 'color-on-error-container', 'Error container'],
      ['color-surface', 'color-success', 'Success on surface'],
    ],
    android: [
      ['md-secondary-container', 'md-on-secondary-container', 'Secondary container'],
      ['md-tertiary-container', 'md-on-tertiary-container', 'Tertiary container'],
      ['md-surface-container-low', 'md-primary', 'Primary on container low'],
      ['md-surface-container-highest', 'md-on-surface-variant', 'On surface variant'],
      ['md-inverse-surface', 'md-inverse-on-surface', 'Inverse surface (snackbar)'],
    ],
    ios: [
      ['ios-grouped-bg', 'ios-tint', 'Tint on grouped background'],
      ['ios-grouped-bg-secondary', 'ios-tint', 'Tint in a cell'],
      ['ios-tint-fill', 'ios-on-tint-fill', 'Tinted fill'],
      ['ios-grouped-bg-secondary', 'ios-label-secondary', 'Secondary label'],
      ['ios-toast-bg', 'ios-toast-action', 'Toast action'],
    ],
  };
  const TYPE = {
    neutral: [['text-headline', 'Headline'], ['text-title', 'Title'], ['text-subtitle', 'Subtitle'], ['text-body', 'Body'], ['text-secondary', 'Secondary'], ['text-caption', 'Caption'], ['text-label', 'Label']],
    android: [['display-small', 'Display small'], ['headline-medium', 'Headline medium'], ['title-large', 'Title large'], ['title-medium', 'Title medium'], ['body-large', 'Body large'], ['body-medium', 'Body medium'], ['label-large', 'Label large']],
    ios: [['ios-large-title', 'Large Title'], ['ios-title1', 'Title 1'], ['ios-title2', 'Title 2'], ['ios-title3', 'Title 3'], ['ios-headline', 'Headline'], ['ios-body', 'Body'], ['ios-callout', 'Callout'], ['ios-subheadline', 'Subheadline'], ['ios-footnote', 'Footnote'], ['ios-caption1', 'Caption 1']],
  };

  const swatch = ([bg, fg, label]) => {
    const r = ratio(`var(--${fg})`, `var(--${bg})`);
    return html`<li class="swatch" style="background: var(--${bg}); color: var(--${fg})" data-testid="swatch-${bg}">
      <span class="swatch-label">${label}</span>
      <span class="swatch-meta">${hex(`var(--${fg})`)} on ${hex(`var(--${bg})`)}</span>
      <span class="swatch-ratio">${r.toFixed(2)}:1 ${r >= 4.5 ? '✓' : r >= 3 ? '(large text only)' : '✗'}</span>
    </li>`;
  };

  const style = document.createElement('style');
  style.textContent = `
    .swatches { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: var(--space-3); }
    .swatch { border-radius: var(--shape-md); padding: var(--space-4); min-height: 6.5rem; display: flex; flex-direction: column; gap: var(--space-1); box-shadow: inset 0 0 0 1px var(--color-outline); }
    .swatch-label { font: var(--text-subtitle); }
    .swatch-meta, .swatch-ratio { font: var(--text-caption); overflow-wrap: anywhere; }
    .tile-section { margin: 0; font: var(--text-subtitle); color: var(--color-muted); }
    .type-sample { margin: 0; overflow-wrap: anywhere; }
    .type-name { display: block; font: var(--text-caption); color: var(--color-muted); }
  `;
  document.head.append(style);

  const componentsView = () => html`<div class="content stack">
    <p class="tile-section">Card and buttons</p>
    <div class="card">
      <h2>${appName}</h2>
      <p class="muted">The primary action is the filled button; one per screen.</p>
      <div class="row" style="flex-wrap: wrap; margin-top: var(--space-3)">
        ${UI.button('Primary', { testid: 'btn-filled' })}
        ${UI.button('Secondary', { variant: 'tonal', testid: 'btn-tonal' })}
        ${UI.button('Outlined', { variant: 'outlined', testid: 'btn-outlined' })}
        ${UI.button('Text', { variant: 'text', testid: 'btn-text' })}
      </div>
    </div>
    <p class="tile-section">List</p>
    <ul class="list" data-testid="tile-list">
      ${UI.listItem({ headline: 'Pushed screen', supporting: 'Shows back and the navigation bar title', leadingIcon: 'info', nav: 'detail', testid: 'tile-detail' })}
      ${UI.listItem({ headline: 'Row with a value', supporting: 'Secondary text', leadingIcon: 'sync', trailing: '5.8 mmol/L' })}
      ${UI.listItem({ headline: 'Notifications', leadingIcon: 'notifications', trailing: 'On' })}
    </ul>
    <p class="tile-section">Form</p>
    <div class="card filled stack">
      ${UI.textField({ name: 'name', label: 'Name', value: 'Before breakfast', helper: 'Helper text' })}
      ${UI.textField({ name: 'value', label: 'Value', value: '58', error: 'Enter a value between 1 and 35' })}
    </div>
    <ul class="list">${UI.switchRow({ name: 'reminders', label: 'Reminders', supporting: 'Switch row', checked: true })}</ul>
    <p class="tile-section">Chips and progress</p>
    <div class="chips"><button type="button" class="chip" aria-pressed="true">Selected</button><button type="button" class="chip" aria-pressed="false">Chip</button></div>
    <div class="progress-linear" role="progressbar" aria-label="Progress" aria-valuenow="60"><span style="width: 60%"></span></div>
    <p class="tile-section">Feedback</p>
    <div class="row" style="flex-wrap: wrap">
      ${UI.button('Dialog', { variant: 'outlined', action: 'dialog', testid: 'show-dialog' })}
      ${UI.button('Sheet', { variant: 'outlined', action: 'sheet', testid: 'show-sheet' })}
      ${UI.button('Message', { variant: 'outlined', action: 'snackbar', testid: 'show-snackbar' })}
      ${UI.button('Delete', { variant: 'danger', testid: 'btn-danger' })}
    </div>
    ${UI.error({ title: 'Error state', body: 'What happened, in plain words, and what to do.', testid: 'tile-error' })}
  </div>`;

  const openDialog = (ctx) => ctx.dialog({ title: 'Delete this reading?', body: 'It will be removed from your history on all devices.', confirm: 'Delete', dismiss: 'Cancel', destructive: true, icon: 'delete', testid: 'tile-dialog' });
  const openSheet = (ctx) => ctx.sheet({ title: 'Sort by', options: [{ label: 'Newest first', value: 'new', icon: 'sync' }, { label: 'Highest value', value: 'high', icon: 'list' }], testid: 'tile-sheet' });
  const openSnackbar = (ctx) => ctx.snackbar('Reading deleted', { action: 'Undo', duration: 60000 });

  App.start({
    appName,
    start: 'components',
    destinations: [
      { id: 'components', label: 'Components', icon: 'home' },
      { id: 'colour', label: 'Colour', icon: 'edit' },
      { id: 'type', label: 'Type', icon: 'list' },
    ],
    screens: {
      components: {
        title: 'Style tile',
        render: (ctx) => componentsView(ctx),
        afterRender(ctx) {
          ctx.banner('Info banner: status that stays until it is resolved');
          if (ctx.state === 'dialog') openDialog(ctx);
          if (ctx.state === 'sheet') openSheet(ctx);
          if (ctx.state === 'snackbar') openSnackbar(ctx);
        },
        topActions: () => [{ icon: 'search', label: 'Search', action: 'snackbar' }],
        fab: { label: 'Add', icon: 'add', action: 'snackbar', testid: 'fab-add', always: true },
        actions: { dialog: openDialog, sheet: openSheet, snackbar: openSnackbar },
      },
      colour: {
        title: 'Colour',
        render: () => html`<div class="content stack">
          <p class="tile-section">Neutral roles (what screens use)</p>
          <ul class="swatches">${SWATCHES.neutral.map(swatch)}</ul>
          <p class="tile-section">${App.platform === 'ios' ? 'iOS tint and system colours' : 'Material 3 roles'}</p>
          <ul class="swatches">${SWATCHES[App.platform].map(swatch)}</ul>
        </div>`,
      },
      type: {
        title: 'Type',
        render: () => html`<div class="content stack">
          <p class="tile-section">Neutral text roles</p>
          ${TYPE.neutral.map(([t, n]) => html`<p class="type-sample" style="font: var(--${t})">${n} — ${appName}<span class="type-name">--${t}</span></p>`)}
          <p class="tile-section">${App.platform === 'ios' ? 'Dynamic Type styles' : 'Material 3 type scale'}</p>
          ${TYPE[App.platform].map(([t, n]) => html`<p class="type-sample" style="font: var(--${t})">${n}<span class="type-name">--${t}</span></p>`)}
          <p class="muted">Font: ${cssVar('font').split(',')[0]}</p>
        </div>`,
        afterRender(ctx, main) {
          // Show the size each style resolves to (at the current ?fontScale=).
          main.querySelectorAll('.type-sample').forEach((p) => {
            const s = getComputedStyle(p);
            p.querySelector('.type-name').append(` · ${s.fontWeight} ${Math.round(parseFloat(s.fontSize))}/${Math.round(parseFloat(s.lineHeight)) || s.lineHeight}px`);
          });
        },
      },
      detail: {
        parent: 'components',
        title: 'Detail',
        render: () => html`<div class="content stack">
          <div class="card filled"><h2>Pushed screen</h2><p class="muted">Back returns to the style tile.</p></div>
          ${UI.button('Continue', { block: true })}
        </div>`,
      },
    },
  });
})();
