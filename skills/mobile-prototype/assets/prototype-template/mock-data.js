/* Mock data and API for the prototype. Replace the example with data derived from the spec and
   API contracts: realistic names, dates, units and lengths — never "Item 1".

   base        the data every scenario starts from
   scenarios   named variations, selected with ?scenario=<id>
                 label        what the scenario represents (shown in the debug panel)
                 data         overrides merged over base
                 offline      true → every API call fails as offline
                 fail         { apiName: 'error' | 'offline' } → only those calls fail
                 permissions  { name: 'granted' | 'denied' | 'blocked' } → starting permission state
   delays      extra delay per API call at normal latency, in ms (scaled by ?latency=)
   api         handlers (db, args) → result; they may change db (it's a per-page-load copy)
*/
window.MOCK = {
  base: {
    items: [
      { id: 'a1', name: 'Morning reading', detail: 'Before breakfast · 5.8 mmol/L', updated: '2026-09-27T07:42:00' },
      { id: 'a2', name: 'Post-lunch reading', detail: '2 h after lunch · 7.9 mmol/L', updated: '2026-09-26T14:10:00' },
      { id: 'a3', name: 'Evening reading with a much longer name to test wrapping on compact screens', detail: 'Before dinner · 6.4 mmol/L', updated: '2026-09-25T19:05:00' },
    ],
  },

  scenarios: {
    default: { label: 'Typical user with data' },
    empty: { label: 'New user, nothing yet', data: { items: [] } },
    error: { label: 'Server error loading the list', fail: { listItems: 'error' } },
    offline: { label: 'No connection', offline: true },
    'save-fails': { label: 'Saving fails', fail: { addItem: 'error' } },
    'notifications-blocked': { label: 'Notifications permission permanently denied', permissions: { notifications: 'blocked' } },
  },

  delays: { addItem: 800 },

  api: {
    listItems: (db) => db.items,
    getItem: (db, { id }) => {
      const item = db.items.find((i) => i.id === id);
      if (!item) throw Object.assign(new Error('Not found'), { type: 'error' });
      return item;
    },
    addItem: (db, { name, detail }) => {
      const item = { id: `n${Date.now()}`, name, detail: detail || '', updated: new Date().toISOString() };
      db.items.unshift(item);
      return item;
    },
    deleteItem: (db, { id }) => {
      const index = db.items.findIndex((i) => i.id === id);
      const [removed] = db.items.splice(index, 1);
      return { removed, index };
    },
    restoreItem: (db, { removed, index }) => { db.items.splice(index, 0, removed); return removed; },
  },
};
