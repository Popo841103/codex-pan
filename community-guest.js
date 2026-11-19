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
  const cancel = byId('cancelBooking');
  const bookingLink = byId('bookingLink');
  const cancelError = byId('cancelError');
  const invalidFields = byId('invalidFields');
  const malaysiaToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  let booking;
  let bookingRevision = 0;
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
    details.hidden = !['confirmed', 'pending', 'cancelled', 'released', 'rejected'].includes(status) || !booking;
    byId('bookingActions').hidden = !booking || !['confirmed', 'pending'].includes(status);
    byId('confirmedCancellation').hidden = status !== 'confirmed';
    cancel.hidden = status !== 'confirmed';
    cancelError.hidden = true;
    invalidFields.hidden = status !== 'invalid';
  }

  async function post(body) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    return {code: response.status, reply: await response.json()};
  }

  function showBooking(reply, token) {
    booking = {id: reply.id, token};
    byId('requestId').textContent = reply.id;
    byId('requestSlot').textContent = reply.date + ' · ' + slotLabel(reply.slot);
    const link = new URL(location.pathname, location.origin);
    link.hash = new URLSearchParams({booking: reply.id, token}).toString();
    bookingLink.href = link.href;
    const status = reply.status === 'cancelled' && reply.slotAvailable ? 'released' : reply.status;
    showResult(status);
    if (dialog.open) result.focus();
  }

  cancel.addEventListener('click', async () => {
    if (!booking || submitting || !window.confirm(byId('cancelPrompt').textContent)) return;
    const credentials = booking;
    submitting = true;
    cancel.disabled = true;
    form.inert = true;
    cancelError.hidden = true;
    try {
      const {code, reply} = await post({action: 'guest-cancel', ...credentials});
      if (code !== 200 || reply.status !== 'cancelled') throw new Error('Cancellation failed');
      if (booking === credentials) showBooking(reply, credentials.token);
      lastPayload = undefined;
      calendarDate.value = reply.date;
    } catch {
      if (booking === credentials) cancelError.hidden = false;
    } finally {
      submitting = false;
      cancel.disabled = false;
      form.inert = false;
      void refreshSlots();
      void refreshCalendar();
    }
  });

  async function openBooking(id, token) {
    const revision = ++bookingRevision;
    booking = undefined;
    showResult();
    form.hidden = true;
    byId('hostLead').hidden = true;
    if (!dialog.open) dialog.showModal();
    try {
      const {code, reply} = await post({action: 'guest-status', id, token});
      if (revision !== bookingRevision) return;
      if (code === 200) showBooking(reply, token);
      else showResult(code === 403 ? 'forbidden' : 'unavailable');
    } catch {
      if (revision === bookingRevision) showResult('unavailable');
    }
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
      if (revision === slotRevision && details.hidden && !form.hidden) showResult('unavailable');
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
    if (form.hidden) {
      ++bookingRevision;
      booking = undefined;
      form.hidden = false;
      byId('hostLead').hidden = false;
      showResult();
    }
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
    requestAnimationFrame(renderInvalidFields);
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
      const {code, reply} = await post({...request, retryKey});
      if (code < 500) unresolvedRequest = null;
      if ((code === 201 && reply.status === 'confirmed')
        || (code === 202 && reply.status === 'pending')) {
        showBooking(reply, reply.cancelToken);
      } else if (code === 422 && reply.status === 'invalid') {
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
  function restoreBooking() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (!params.has('booking')) return false;
    void openBooking(params.get('booking'), params.get('token'));
    return true;
  }

  window.addEventListener('hashchange', restoreBooking);
  if (!restoreBooking() && (url.searchParams.get('host') === '1' || url.hash === '#host')) {
    openHost();
    url.searchParams.delete('host');
    if (url.hash === '#host') url.hash = '';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
})();
