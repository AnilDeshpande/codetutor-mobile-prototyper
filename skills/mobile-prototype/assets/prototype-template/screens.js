/* Screens. This file is an EXAMPLE showing every pattern the runtime supports — replace it with
   the product's screens. Each screen:

   title        string or (ctx) => string
   parent       screen id whose stack this screen belongs to (for deep links / ?screen=)
   focused      true → hide bottom navigation (focused tasks such as editing or pairing)
   appBar       false → no top app bar
   load(ctx)    async; its result becomes ctx.data. [] → 'empty', throws → 'error' / 'offline'
   stateFor(data, ctx)  optional: choose the state from the loaded data
   render(ctx)  returns markup for ctx.state ('loading' | 'content' | 'empty' | 'error' | 'offline' | …).
                Return undefined for a state to get the runtime's default view for it.
   topActions(ctx)  [{ icon, label, action }]
   fab          { label, icon, action, testid } or (ctx) => …  (shown in the 'content' state)
   actions      { name: (ctx, element, event) => … } for data-action / data-submit
   onBack(ctx)  async; return true if the screen handled system back itself

   Markup: use ctx.html`…` (escapes values), ctx.UI helpers, data-nav="<screen>" with
   data-param-<name>="…", data-action="<name>", and <form data-submit="<name>">.
   ctx gives: params, data, error, state, dirty, api(), navigate(), back(), replace(), popScreen(),
   setState(), rerender(), reload(), snackbar(), dialog(), sheet(), banner(), requestPermission(), form().
*/
(function () {
  const { html, UI } = App;
  const when = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  App.start({
    appName: '{{APP_NAME}}',
    start: 'items',
    destinations: [
      { id: 'items', label: 'Readings', icon: 'list' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],

    screens: {
      items: {
        title: 'Readings',
        load: (ctx) => ctx.api('listItems'),
        render(ctx) {
          if (ctx.state === 'loading') return UI.skeletonList(4);
          if (ctx.state === 'empty') {
            return UI.empty({
              title: 'No readings yet',
              body: 'Readings you add or sync from your meter will appear here.',
              action: { label: 'Add reading', nav: 'item-edit', testid: 'empty-add' },
            });
          }
          if (ctx.state === 'content') {
            // .content keeps reading width sensible on medium and expanded windows.
            return html`<div class="content flush"><ul class="list" data-testid="items-list">
              ${ctx.data.map((item) => UI.listItem({
                headline: item.name, supporting: item.detail, leading: item.name[0],
                trailing: when(item.updated), nav: 'item-detail', navParams: { id: item.id }, testid: `item-${item.id}`,
              }))}
            </ul></div>`;
          }
          return undefined; // default error / offline views, with "Try again"
        },
        topActions: () => [{ icon: 'search', label: 'Search readings', action: 'search' }],
        fab: { label: 'Add reading', icon: 'add', action: 'add', testid: 'fab-add' },
        actions: {
          add: (ctx) => ctx.navigate('item-edit'),
          search: (ctx) => ctx.snackbar('Search is out of scope for this prototype'),
        },
      },

      'item-detail': {
        parent: 'items',
        title: (ctx) => (ctx.data ? ctx.data.name : 'Reading'),
        load: (ctx) => ctx.api('getItem', { id: ctx.params.id }),
        render(ctx) {
          if (ctx.state !== 'content') return undefined;
          const item = ctx.data;
          return html`<div class="content stack">
            <div class="card filled">
              <h2>${item.detail}</h2>
              <p class="muted">Updated ${when(item.updated)}</p>
            </div>
            <p>Details for this reading would go here. Use real content from the spec.</p>
          </div>`;
        },
        topActions: (ctx) => (ctx.state === 'content' ? [{ icon: 'delete', label: 'Delete reading', action: 'delete', testid: 'delete' }] : []),
        actions: {
          async delete(ctx) {
            const ok = await ctx.dialog({
              title: 'Delete this reading?', body: 'It will be removed from your history on all devices.',
              confirm: 'Delete', dismiss: 'Cancel', destructive: true, icon: 'delete', testid: 'confirm-delete',
            });
            if (!ok) return;
            const result = await ctx.api('deleteItem', { id: ctx.data.id });
            ctx.popScreen();
            if (await ctx.snackbar('Reading deleted', { action: 'Undo' })) {
              await ctx.api('restoreItem', result);
              App.navigate('items');
            }
          },
        },
      },

      'item-edit': {
        parent: 'items',
        title: 'Add reading',
        focused: true,
        render(ctx) {
          if (ctx.state === 'saving') return UI.loading('Saving…');
          const v = ctx.values || {};
          const errors = ctx.errors || {};
          return html`<form class="content stack" data-submit="save" novalidate>
            ${UI.textField({ name: 'name', label: 'Name', value: v.name, error: errors.name, helper: 'For example “Before breakfast”', required: true })}
            ${UI.textField({ name: 'detail', label: 'Value', value: v.detail, helper: 'mmol/L' })}
            <div class="bottom-actions">
              ${UI.button('Cancel', { variant: 'text', action: '__back', testid: 'cancel' })}
              ${UI.button('Save', { type: 'submit', testid: 'save' })}
            </div>
          </form>`;
        },
        actions: {
          async save(ctx) {
            const values = ctx.form();
            ctx.values = values;
            ctx.errors = values.name.trim() ? {} : { name: 'Enter a name' };
            if (ctx.errors.name) { ctx.rerender(); return; }
            ctx.setState('saving');
            try {
              await ctx.api('addItem', values);
              ctx.dirty = false;
              ctx.popScreen();
              ctx.snackbar('Reading added');
            } catch (e) {
              ctx.setState('content');
              ctx.banner(e.type === 'offline' ? 'You’re offline. Your reading wasn’t saved.' : 'Couldn’t save. Please try again.', { tone: 'error' });
            }
          },
        },
        async onBack(ctx) {
          if (!ctx.dirty) return false;
          const discard = await ctx.dialog({ title: 'Discard this reading?', body: 'What you entered will be lost.', confirm: 'Discard', dismiss: 'Keep editing', testid: 'confirm-discard' });
          if (discard) { ctx.dirty = false; ctx.popScreen(); }
          return true;
        },
      },

      settings: {
        title: 'Settings',
        render(ctx) {
          return html`<div class="content flush">
            <h2 class="list-header">Notifications</h2>
            <ul class="list">
              ${UI.listItem({ headline: 'Reminders', supporting: ctx.reminders || 'Off', leadingIcon: 'notifications', action: 'reminders', testid: 'reminders' })}
            </ul>
            <hr class="divider">
            <h2 class="list-header">About</h2>
            <ul class="list">${UI.listItem({ headline: 'Version', supporting: 'Prototype build', leadingIcon: 'info' })}</ul>
          </div>`;
        },
        actions: {
          async reminders(ctx) {
            const result = await ctx.requestPermission('notifications', {
              prompt: 'Allow {{APP_NAME}} to send you notifications?',
              rationale: { title: 'Turn on reminders?', body: 'We’ll remind you when it’s time for a reading. You can change this at any time.', confirm: 'Continue', icon: 'notifications', always: true },
            });
            if (result === 'granted') {
              const choice = await ctx.sheet({ title: 'Remind me', options: [
                { label: 'Every morning', value: 'Every morning', icon: 'notifications' },
                { label: 'Morning and evening', value: 'Morning and evening', icon: 'notifications' },
              ] });
              if (choice) { ctx.reminders = choice; ctx.rerender(); ctx.snackbar('Reminders on'); }
            } else if (result === 'blocked') {
              const open = await ctx.dialog({ title: 'Notifications are off', body: 'To get reminders, allow notifications in your phone’s settings.', confirm: 'Open settings', dismiss: 'Not now', testid: 'blocked' });
              if (open) ctx.snackbar('Would open Android settings');
            } else {
              ctx.snackbar('Reminders need notifications');
            }
          },
        },
      },
    },
  });
})();
