/* Final-look screens from the flow spec. flow-data.js (written by scripts/screens.mjs) puts the
   approved flow.json into window.FLOW; this file turns each frame — a screen in one state —
   into the platform's own components. Nothing here is hand-written per product: change
   flow.json and run screens.mjs again.

   One frame:  index.html?platform=<android|ios>&screen=<screen>&state=<state>&theme=<light|dark>
   Controls are inert: this shows how each screen looks, not how the app behaves (the flow is
   the draw.io sketch). */
(function () {
  const { html, raw, UI } = App;
  const spec = window.FLOW || { journeys: [] };
  const frames = (spec.journeys || []).flatMap((j) => j.screens || []);
  const byId = Object.fromEntries(frames.map((f) => [f.id, f]));
  const OVERLAYS = ['dialog', 'sheet', 'snackbar', 'banner', 'fab', 'bar'];
  const find = (f, type) => (f.elements || []).find((e) => e.type === type);
  const lines = (t) => raw(String(t ?? '').split('\n').map((l) => App.esc(l)).join('<br>'));
  const slug = (s, i) => `${String(s || 'f').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`;

  // A frame that only holds an overlay (a dialog, a sheet) is drawn over another frame's
  // content: the one named in "over", otherwise the screen it sits below in the sketch.
  const under = (f) => {
    const own = (f.elements || []).some((e) => !OVERLAYS.includes(e.type));
    return own ? f : byId[f.over] || byId[f.below] || f;
  };

  const VARIANT = { primary: 'filled', secondary: 'outlined', text: 'text', danger: 'danger' };
  function element(e, i) {
    switch (e.type) {
      case 'heading': return html`<h2>${e.text}</h2>`;
      case 'text': return html`<p${raw(e.align === 'center' ? ' style="text-align: center"' : '')}>${lines(e.text)}</p>`;
      case 'field': return UI.textField({ name: slug(e.label, i), label: e.label, value: e.value || '', helper: e.helper, error: e.error });
      case 'button': return UI.button(e.text, { variant: VARIANT[e.variant] || 'filled', block: true });
      case 'list': return html`<ul class="list">${(e.items || []).map((it) => UI.listItem({ headline: it.text, supporting: it.detail, trailing: it.trailing ?? (it.key ? UI.icon('chevron') : undefined), leadingIcon: it.icon }))}</ul>`;
      case 'card': {
        const [first, ...rest] = String(e.text ?? '').split('\n');
        return html`<div class="card"><h2>${first}</h2>${rest.length ? html`<p class="muted">${lines(rest.join('\n'))}</p>` : ''}</div>`;
      }
      case 'switch': return html`<ul class="list">${UI.switchRow({ name: slug(e.text, i), label: e.text, checked: !!e.on })}</ul>`;
      case 'chips': return html`<div class="chips">${(e.items || []).map((c) => html`<button type="button" class="chip" aria-pressed="${String(c === e.active)}">${c}</button>`)}</div>`;
      case 'image': return html`<div class="card filled" role="img" aria-label="${e.text || 'image'}" style="min-height: ${e.size ? e.size / 10 : 8}rem; display: grid; place-items: center"><span class="muted">${e.text || 'image'}</span></div>`;
      case 'loading': return UI.loading(e.text || 'Loading…');
      case 'empty': return UI.empty({ title: e.title, body: e.text, action: e.action ? { label: e.action.text } : undefined });
      case 'error': return UI.error({ title: e.title, body: e.text, retry: !!e.action });
      case 'gap': return html`<div style="height: ${(e.size ?? 20) / 16}rem" aria-hidden="true"></div>`;
      default: return '';
    }
  }

  const screens = {};
  frames.forEach((f) => {
    const s = (screens[f.screen] ||= { states: {}, order: [] });
    s.states[f.state] = f; s.order.push(f.state);
  });
  const tabs = (spec.tabs || []).filter((t) => screens[t.screen]);
  const start = tabs[0]?.screen || frames[0]?.screen;

  const definitions = {};
  for (const [id, s] of Object.entries(screens)) {
    const frameFor = (ctx) => s.states[ctx.state] || s.states[s.order[0]];
    const barOf = (f) => find(f, 'bar') || find(under(f), 'bar');
    const all = s.order.map((st) => s.states[st]);
    const back = all.some((f) => barOf(f)?.back);
    const parent = all.map((f) => f.parent).find(Boolean) || (back && id !== start ? start : undefined);
    definitions[id] = {
      title: (ctx) => barOf(frameFor(ctx))?.text || '',
      parent,
      focused: back,
      appBar: all.some((f) => barOf(f)) ? undefined : false,
      initialState: s.order[0],
      render(ctx) {
        const f = frameFor(ctx);
        const body = (under(f).elements || []).filter((e) => !OVERLAYS.includes(e.type));
        return html`<div class="content stack">${body.map(element)}</div>`;
      },
      fab(ctx) {
        const e = find(frameFor(ctx), 'fab');
        return e ? { label: String(e.text || 'Add').replace(/^\+\s*/, ''), icon: 'add', always: true } : null;
      },
      afterRender(ctx) {
        const f = frameFor(ctx);
        const banner = find(f, 'banner') || find(under(f), 'banner');
        if (banner) ctx.banner(banner.text);
        const snack = find(f, 'snackbar');
        if (snack) ctx.snackbar(snack.text, { action: snack.action, duration: 3600000 });
        const d = find(f, 'dialog');
        if (d) {
          const actions = d.actions || [];
          const confirm = actions[actions.length - 1];
          ctx.dialog({ title: d.title, body: d.text, confirm: confirm?.text || 'OK', dismiss: actions.length > 1 ? actions[0].text : '', destructive: confirm?.variant === 'danger', system: !!d.system });
        }
        const sh = find(f, 'sheet');
        if (sh) ctx.sheet({ title: sh.title, options: (sh.items || []).map((it, i) => ({ label: it.text, value: it.key || String(i), icon: it.icon })) });
      },
    };
  }

  if (!start) {
    document.getElementById('app').textContent = 'flow-data.js holds no screens. Run scripts/screens.mjs.';
    return;
  }
  App.start({
    appName: spec.app || 'App',
    start,
    destinations: tabs.map((t) => ({ id: t.screen, label: t.label, icon: t.icon || 'home' })),
    screens: definitions,
  });
})();
