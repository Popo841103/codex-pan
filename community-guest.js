(() => {
  'use strict';
  const endpoint = 'community-events.php';
  const byId = id => document.getElementById(id);
  const copy = byId('eventCopy').content;
  const slotLabels = {
    '10-12': '10:00–12:00',
    '14-17': '14:00–17:00',
    '18-20': '18:00–20:00',
    '20-2230': '20:00–22:30'
  };
  const slotLabel = id => slotLabels[id];

  function malaysiaToday() {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({type, value}) => [type, value]));
    return [values.year, values.month, values.day].join('-');
  }

  function localCopy(selector, template = copy) {
    const node = template.querySelector(selector).cloneNode(true);
    for (const element of [node, ...node.querySelectorAll('[data-en]')]) {
      const {en, zh, ms} = element.dataset;
      if (en) element.textContent = window.COHUB_I18N.local(en, zh, ms);
    }
    node.removeAttribute('id');
    node.hidden = false;
    return node;
  }

  function userText(tag, text) {
    const node = document.createElement(tag);
    node.dataset.userContent = '';
    node.textContent = text;
    return node;
  }

  async function post(action, fields = {}) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...fields, action}),
      signal: AbortSignal.timeout(15000)
    });
    return {code: response.status, body: await response.json()};
  }

  async function readOccupancy(day) {
    const response = await fetch(endpoint + '?' + new URLSearchParams({date: day}), {
      cache: 'no-store', signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Occupancy unavailable');
    const data = await response.json();
    if (data.date !== day || !Array.isArray(data.occupied)) throw new Error('Invalid occupancy');
    return data.occupied;
  }

  function initAccount() {
    const panel = byId('my-events');
    const accountForm = byId('accountForm');
    const guestArea = byId('guestArea');
    const form = byId('hostForm');
    const submit = form.querySelector('[type="submit"]');
    const date = form.elements.date;
    const slots = [...form.querySelectorAll('[name="slot"]')];
    const status = byId('accountStatus');
    let slotRevision = 0;
    let busy = false;

    function message(selector) {
      status.replaceChildren(...(selector ? [localCopy(selector)] : []));
    }

    function showAccount(account) {
      accountForm.hidden = Boolean(account);
      guestArea.hidden = !account;
      byId('myRequests').replaceChildren();
      byId('guestIdentity').textContent = '';
      if (!account) return;
      byId('guestIdentity').textContent = account.email + ' · ' + account.phone;
      for (const record of account.requests) {
        const card = document.createElement('article');
        card.className = 'request-card';
        card.append(
          userText('h3', record.title),
          userText('p', record.date + ' · ' + slotLabel(record.slot)),
          localCopy('[data-copy="' + record.status + '"]'),
          userText('p', record.id)
        );
        if (['pending', 'confirmed'].includes(record.status)) {
          card.append(localCopy('[data-result="' + record.status + '"]'));
        }
        if (record.reason) {
          const reasonCopy = Array.from(copy.querySelectorAll('[data-reason]'))
            .find(node => node.dataset.reason === record.reason);
          if (reasonCopy) {
            card.append(localCopy('[data-reason="' + reasonCopy.dataset.reason + '"]'));
          } else {
            card.append(record.reason === 'venue_policy'
              ? localCopy('[data-result="rejected"]') : userText('p', record.reason));
          }
        }
        if (['pending', 'confirmed'].includes(record.status)) {
          const cancel = localCopy('[data-copy="cancel"]');
          cancel.addEventListener('click', () => {
            if (!window.confirm(localCopy('#cancelPrompt').textContent)) return;
            void run(async () => {
              const {code, body} = await post('cancel-my-event', {id: record.id});
              if (code === 401) return showAccount(null);
              if (code !== 200) throw new Error('Cancellation failed');
              await loadMine();
              if (body.status === 'cancelled') message('[data-result="released"]');
            });
          });
          card.append(cancel);
        }
        byId('myRequests').append(card);
      }
      if (!account.requests.length) byId('myRequests').append(localCopy('[data-copy="empty"]'));
    }

    async function loadMine() {
      const {code, body} = await post('my-events');
      if (code !== 200 && code !== 401) throw new Error('Account unavailable');
      showAccount(code === 200 ? body : null);
    }

    async function run(operation) {
      if (busy) return;
      busy = true;
      panel.setAttribute('aria-busy', 'true');
      accountForm.inert = true;
      guestArea.inert = true;
      message();
      try {
        await operation();
      } catch {
        message('[data-result="unavailable"]');
      } finally {
        busy = false;
        accountForm.inert = false;
        guestArea.inert = false;
        panel.removeAttribute('aria-busy');
        void refreshSlots();
      }
    }

    accountForm.addEventListener('submit', event => {
      event.preventDefault();
      void run(async () => {
        const fields = Object.fromEntries(new FormData(accountForm));
        const {code, body} = await post(event.submitter?.value || 'sign-in', fields);
        if (code === 200) {
          accountForm.reset();
          showAccount(body);
          panel.focus();
        } else if (body.status === 'credentials') {
          message('[data-copy="credentials"]');
        } else {
          throw new Error('Sign-in unavailable');
        }
      });
    });

    byId('signOut').addEventListener('click', () => void run(async () => {
      if ((await post('sign-out')).code !== 200) throw new Error('Sign-out failed');
      form.reset();
      showAccount(null);
      panel.focus();
    }));
    byId('refreshMine').addEventListener('click', () => void run(loadMine));

    form.addEventListener('submit', event => {
      event.preventDefault();
      void run(async () => {
        const fields = Object.fromEntries(new FormData(form));
        if (!fields.slot) return;
        const {code, body} = await post('submit-event', fields);
        if (code === 201 || code === 202) {
          form.reset();
          await loadMine();
          byId('myRequests').firstElementChild?.scrollIntoView({block: 'nearest'});
        } else if (code === 401) {
          showAccount(null);
          panel.focus();
        } else if (['taken', 'invalid'].includes(body.status)) {
          message('[data-result="' + body.status + '"]');
          if (body.status === 'invalid' && Array.isArray(body.fields)) {
            const list = document.createElement('ul');
            for (const field of body.fields) {
              const label = field === 'slot' ? form.querySelector('legend')
                : form.elements.namedItem(field)?.labels?.[0]?.querySelector('[data-en]');
              if (!label) continue;
              const item = document.createElement('li');
              item.append(label.cloneNode(true));
              list.append(item);
            }
            status.append(list);
          }
          status.scrollIntoView({block: 'nearest'});
        } else {
          throw new Error('Submission unavailable');
        }
      });
    });

    async function refreshSlots() {
      const revision = ++slotRevision;
      date.min = malaysiaToday();
      byId('noSlots').hidden = true;
      for (const slot of slots) slot.disabled = true;
      submit.disabled = true;
      if (guestArea.hidden || !date.value || !date.validity.valid) return;
      try {
        const occupied = await readOccupancy(date.value);
        if (revision !== slotRevision) return;
        for (const slot of slots) {
          slot.disabled = occupied.includes(slot.value);
          if (slot.disabled) slot.checked = false;
        }
        const full = slots.every(slot => slot.disabled);
        byId('noSlots').hidden = !full;
        submit.disabled = full;
      } catch {
        if (revision === slotRevision && !status.childElementCount) message('[data-result="unavailable"]');
      }
    }

    date.addEventListener('input', () => {
      for (const slot of slots) slot.checked = false;
      void refreshSlots();
    });
    addEventListener('pageshow', event => {
      if (event.persisted) void run(loadMine);
    });

    void run(loadMine);
  }

  function initDiscovery() {
    function redirectLegacyHost() {
      const url = new URL(location.href);
      if (url.searchParams.get('host') !== '1' &&
          !['#my-events', '#host', '#host-event', '#my-activities'].includes(url.hash)) return false;
      url.searchParams.delete('host');
      location.replace('my-events.html' + url.search);
      return true;
    }

    if (redirectLegacyHost()) return;
    addEventListener('hashchange', redirectLegacyHost);

    const calendarDate = byId('calendarDate');
    const calendarEvents = byId('calendarEvents');
    let calendarRevision = 0;

    function signupForm(id) {
      const details = localCopy('details', byId('signupCopy').content);
      const form = details.querySelector('form');
      const button = form.querySelector('button');
      const status = form.querySelector('[role="status"]');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (button.disabled) return;
        button.disabled = true;
        try {
          const {body} = await post('join-event', {...Object.fromEntries(new FormData(form)), id});
          if (['joined', 'full'].includes(body.status)) {
            status.replaceChildren(localCopy('[data-copy="' + body.status + '"]'));
            if (body.status === 'joined') form.reset();
          } else {
            status.replaceChildren(localCopy(body.status === 'invalid'
              ? '[data-result="invalid"]' : '[data-result="unavailable"]'));
          }
        } catch {
          status.replaceChildren(localCopy('[data-result="unavailable"]'));
        } finally {
          button.disabled = false;
        }
      });
      return details;
    }

    async function refreshPublished() {
      const response = await fetch(endpoint + '?published=1', {signal: AbortSignal.timeout(10000)});
      if (!response.ok) return;
      const {events} = await response.json();
      const list = byId('event-list');
      const cards = events.map(record => {
        const card = document.createElement('article');
        card.className = 'event';
        card.dataset.published = '';
        const image = document.createElement('img');
        image.src = record.poster;
        image.alt = '';
        image.loading = 'lazy';
        const body = document.createElement('div');
        body.className = 'body';
        const when = userText('p', record.date + ' · ' + slotLabel(record.slot));
        when.className = 'when';
        const intro = userText('p', record.intro);
        intro.className = 'desc';
        body.append(userText('h3', record.title), when, intro, signupForm(record.id));
        card.append(image, body);
        return card;
      });
      list.querySelectorAll('[data-published]').forEach(card => card.remove());
      list.prepend(...cards);
    }

    async function refreshCalendar() {
      const revision = ++calendarRevision;
      const empty = byId('calendarEmpty');
      const error = byId('calendarError');
      empty.hidden = true;
      error.hidden = true;
      calendarEvents.hidden = true;
      if (!calendarDate.value) return;
      try {
        const occupied = await readOccupancy(calendarDate.value);
        if (revision !== calendarRevision) return;
        calendarEvents.replaceChildren(...Object.keys(slotLabels).filter(slot => occupied.includes(slot)).map(slot => {
          const item = document.createElement('li');
          const label = byId('reservedLabel').content.firstElementChild.cloneNode(true);
          const {en, zh, ms} = label.dataset;
          label.textContent = window.COHUB_I18N.local(en, zh, ms);
          item.append(userText('bdi', slotLabel(slot)), ' · ', label);
          return item;
        }));
        calendarEvents.hidden = occupied.length === 0;
        empty.hidden = occupied.length > 0;
      } catch {
        if (revision === calendarRevision) error.hidden = false;
      }
    }

    calendarDate.value = malaysiaToday();
    calendarDate.addEventListener('change', refreshCalendar);
    calendarDate.closest('details').addEventListener('toggle', event => {
      if (event.target.open) void refreshCalendar();
    });

    addEventListener('pageshow', event => {
      if (!event.persisted) return;
      if (calendarDate.closest('details').open) void refreshCalendar();
      void refreshPublished().catch(() => {});
    });
    void refreshPublished().catch(() => {});
  }

  if (byId('accountForm')) initAccount();
  else initDiscovery();
})();
