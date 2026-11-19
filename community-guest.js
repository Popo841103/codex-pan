(() => {
  window.COHUB_TRANSLATIONS = Object.assign(window.COHUB_TRANSLATIONS || {}, {
    'For urgent contact': ['突发状况时优先电话联系', 'Untuk dihubungi segera'],
    'Backup contact': ['备用联系方式', 'Hubungan sandaran']
  });
  const dialog = document.getElementById('hostDialog');
  const opener = document.getElementById('openHost');
  const form = document.getElementById('hostForm');
  const date = form.elements.date;
  const slots = [...form.querySelectorAll('[name="slot"]')];
  const calendarDate = document.getElementById('calendarDate');
  const calendarEvents = document.getElementById('calendarEvents');
  const calendarEmpty = document.getElementById('calendarEmpty');
  const published = [...document.querySelectorAll('#event-list .event[data-event-date][data-event-slot]')];
  const occupied = [
    ...published,
    ...document.getElementById('approved-slots').content.querySelectorAll('[data-event-date][data-event-slot]')
  ];
  const zone = 'Asia/Kuala_Lumpur';
  const malaysiaToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  let previousDraft;
  let requestId;

  function updateSlots() {
    date.min = malaysiaToday();
    for (const slot of slots) {
      const taken = occupied.some(({dataset}) => dataset.eventDate === date.value && dataset.eventSlot === slot.value);
      slot.disabled = !date.value || !date.validity.valid || taken;
      if (slot.disabled) slot.checked = false;
    }
    const full = date.value && date.validity.valid && slots.every(slot => slot.disabled);
    document.getElementById('noSlots').hidden = !full;
  }

  function updateCalendar() {
    const events = published.filter(event => event.dataset.eventDate === calendarDate.value);
    calendarEmpty.hidden = events.length > 0;
    calendarEvents.hidden = events.length === 0;
    calendarEvents.replaceChildren(...events.map(event => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const label = slots.find(slot => slot.value === event.dataset.eventSlot)?.nextElementSibling.textContent;
      link.dataset.userContent = '';
      link.href = '#' + encodeURIComponent(event.id);
      link.textContent = [label, event.querySelector('h3').textContent].filter(Boolean).join(' · ');
      item.append(link);
      return item;
    }));
  }

  function openHost() {
    updateSlots();
    if (!dialog.open) dialog.showModal();
  }

  opener.addEventListener('click', openHost);
  document.getElementById('closeHost').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => opener.focus());
  date.addEventListener('input', () => {
    for (const slot of slots) slot.checked = false;
    updateSlots();
  });
  calendarDate.value = malaysiaToday();
  calendarDate.addEventListener('input', updateCalendar);
  const titles = new MutationObserver(updateCalendar);
  for (const event of published) titles.observe(event.querySelector('h3'), {childList: true});
  updateCalendar();
  updateSlots();

  form.addEventListener('submit', event => {
    event.preventDefault();
    updateSlots();
    const selected = slots.find(slot => slot.checked && !slot.disabled);
    if (!form.reportValidity() || !selected) return;

    const value = name => form.elements[name].value.trim();
    const draft = [
      'Hi CO-HUB, I would like to host an event.',
      'Name: ' + value('name'),
      'Phone: ' + value('phone'),
      'Email: ' + value('email'),
      'Event title: ' + value('title'),
      'Date: ' + value('date'),
      'Time: ' + selected.nextElementSibling.textContent + ' (' + zone + ')',
      'Slot ID: ' + selected.value,
      'Event introduction: ' + value('intro'),
      'Notes: ' + (value('note') || '-'),
      document.getElementById('hostSignup').dataset.en,
      document.getElementById('hostCancellation').dataset.en
    ].join('\n');
    if (previousDraft !== draft) {
      requestId = 'COHUB-' + crypto.randomUUID();
      previousDraft = draft;
    }
    const message = 'Request ID: ' + requestId + '\n' + draft;
    window.open('https://wa.me/60178497319?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  });

  const url = new URL(location.href);
  if (url.searchParams.get('host') === '1' || url.hash === '#host') {
    openHost();
    url.searchParams.delete('host');
    if (url.hash === '#host') url.hash = '';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
})();
