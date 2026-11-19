(() => {
  window.COHUB_TRANSLATIONS = Object.assign(window.COHUB_TRANSLATIONS || {}, {
    'For urgent contact': ['突发状况时优先电话联系', 'Untuk dihubungi segera'],
    'Backup contact': ['备用联系方式', 'Hubungan sandaran']
  });
  const endpoint = 'community-events.php';
  const byId = id => document.getElementById(id);
  const dialog = byId('hostDialog');
  const opener = byId('openHost');
  const form = byId('hostForm');
  const submit = form.querySelector('[type="submit"]');
  const date = form.elements.date;
  const slots = [...form.querySelectorAll('[name="slot"]')];
  const calendarDate = byId('calendarDate');
  const calendarEvents = byId('calendarEvents');
  const calendarEmpty = byId('calendarEmpty');
  const calendarError = byId('calendarError');
  const result = byId('hostResult');
  const details = byId('requestDetails');
  const cancel = byId('cancelContact');
  const invalidFields = byId('invalidFields');
  const malaysiaToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  let slotRevision = 0;
  let calendarRevision = 0;
  let submitting = false;
  let fieldsToFix = [];
  let lastPayload;
  let retryKey;
  let unresolvedRequest;

  const slotLabel = id => slots.find(slot => slot.value === id)?.nextElementSibling.textContent;
  async function readOccupancy(day) {
    const response = await fetch(endpoint + '?' + new URLSearchParams({date: day}), {
      cache: 'no-store', signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Occupancy unavailable');
    const data = await response.json();
    if (data.date !== day || !Array.isArray(data.occupied)) throw new Error('Invalid occupancy');
    return data.occupied;
  }

  function showResult(status) {
    for (const message of result.querySelectorAll('[data-result]')) {
      message.hidden = message.dataset.result !== status;
    }
    details.hidden = !['confirmed', 'pending'].includes(status);
    cancel.hidden = status !== 'confirmed';
    invalidFields.hidden = status !== 'invalid';
  }

  function renderInvalidFields() {
    invalidFields.replaceChildren(...fieldsToFix.map(name => {
      const item = document.createElement('li');
      item.dataset.userContent = '';
      const label = name === 'slot' ? form.querySelector('legend') : form.elements[name]?.labels?.[0]?.querySelector('span');
      item.textContent = label?.textContent || '';
      return item;
    }));
  }

  async function refreshSlots() {
    const revision = ++slotRevision;
    date.min = malaysiaToday();
    const day = date.value;
    byId('noSlots').hidden = true;
    for (const slot of slots) slot.disabled = true;
    submit.disabled = submitting;
    if (!day || !date.validity.valid) return;
    submit.disabled = true;
    try {
      const occupied = await readOccupancy(day);
      if (revision !== slotRevision) return;
      for (const slot of slots) {
        const retry = unresolvedRequest?.date === day && unresolvedRequest.slot === slot.value;
        slot.disabled = occupied.includes(slot.value) && !retry;
        if (slot.disabled) slot.checked = false;
      }
      const full = slots.every(slot => slot.disabled);
      byId('noSlots').hidden = !full;
      submit.disabled = full || submitting;
    } catch {
      if (revision === slotRevision && details.hidden) showResult('unavailable');
    }
  }

  async function refreshCalendar() {
    const revision = ++calendarRevision;
    calendarEmpty.hidden = true;
    calendarError.hidden = true;
    calendarEvents.hidden = true;
    if (!calendarDate.value) return;
    try {
      const occupied = await readOccupancy(calendarDate.value);
      if (revision !== calendarRevision) return;
      calendarEvents.replaceChildren(...slots.filter(slot => occupied.includes(slot.value)).map(slot => {
        const item = document.createElement('li');
        const time = document.createElement('bdi');
        time.dataset.userContent = '';
        time.textContent = slotLabel(slot.value);
        const label = byId('reservedLabel').content.firstElementChild.cloneNode(true);
        const {en, zh, ms} = label.dataset;
        label.textContent = window.COHUB_I18N.local(en, zh, ms);
        item.append(time, ' · ', label);
        return item;
      }));
      calendarEvents.hidden = !occupied.length;
      calendarEmpty.hidden = Boolean(occupied.length);
      window.COHUB_I18N.apply();
    } catch {
      if (revision === calendarRevision) calendarError.hidden = false;
    }
  }

  function openHost() {
    if (!dialog.open) dialog.showModal();
    void refreshSlots();
  }

  opener.addEventListener('click', openHost);
  byId('closeHost').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => opener.focus());
  date.addEventListener('input', () => {
    for (const slot of slots) slot.checked = false;
    showResult();
    void refreshSlots();
  });
  calendarDate.value = malaysiaToday();
  calendarDate.addEventListener('change', refreshCalendar);
  document.querySelector('.activity-calendar').addEventListener('toggle', event => {
    if (event.target.open) void refreshCalendar();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    void refreshCalendar();
    if (dialog.open) void refreshSlots();
  });
  document.getElementById('language').addEventListener('change', () => {
    requestAnimationFrame(() => {
      renderInvalidFields();
      cancel.textContent = byId('hostCancellation').textContent;
    });
  });
  void refreshCalendar();
  void refreshSlots();
  setInterval(() => {
    if (document.hidden) return;
    if (calendarDate.closest('details').open) void refreshCalendar();
    if (dialog.open && !submitting) void refreshSlots();
  }, 20000);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const request = Object.fromEntries(new FormData(form));
    if (!request.slot) return;
    const payload = JSON.stringify(request);
    if (lastPayload !== payload) retryKey = crypto.randomUUID();
    lastPayload = payload;
    submitting = true;
    form.inert = true;
    submit.disabled = true;
    showResult();
    unresolvedRequest = request;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...request, retryKey}),
        signal: AbortSignal.timeout(15000)
      });
      const reply = await response.json();
      if (response.status < 500) unresolvedRequest = null;
      if ((response.status === 201 && reply.status === 'confirmed')
        || (response.status === 202 && reply.status === 'pending')) {
        byId('requestId').textContent = reply.id;
        byId('requestSlot').textContent = reply.date + ' · ' + slotLabel(reply.slot);
        cancel.href = 'https://wa.me/60178497319?text=' + encodeURIComponent(reply.id);
        cancel.textContent = byId('hostCancellation').textContent;
        showResult(reply.status);
        if (dialog.open) result.focus();
      } else if (response.status === 422 && reply.status === 'invalid') {
        fieldsToFix = reply.fields || [];
        renderInvalidFields();
        showResult('invalid');
      } else {
        showResult(['taken', 'rejected'].includes(reply.status) ? reply.status : 'unavailable');
      }
    } catch {
      showResult('unavailable');
    } finally {
      submitting = false;
      form.inert = false;
      void refreshSlots();
      void refreshCalendar();
    }
  });

  const url = new URL(location.href);
  if (url.searchParams.get('host') === '1' || url.hash === '#host') {
    openHost();
    url.searchParams.delete('host');
    if (url.hash === '#host') url.hash = '';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
})();
