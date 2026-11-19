(() => {
  'use strict';
  const PAGE = document.body.dataset.eventsPage || '';
  const API = 'community-events.php';
  const BUSINESS = '60178497319';
  const SLOTS = [
    {id: '10-12', en: 'Morning 10:00–12:00', zh: '上午 10:00–12:00', ms: 'Pagi 10:00–12:00'},
    {id: '14-17', en: 'Afternoon 14:00–17:00', zh: '下午 14:00–17:00', ms: 'Petang 14:00–17:00'},
    {id: '18-20', en: 'Early evening 18:00–20:00', zh: '傍晚 18:00–20:00', ms: 'Awal malam 18:00–20:00'},
    {id: '20-2230', en: 'Evening 20:00–22:30', zh: '晚上 20:00–22:30', ms: 'Malam 20:00–22:30'}
  ];
  const COPY = {
    'Hi CO-HUB, I would like to host an event.': ['你好，CO-HUB，我想在店里办一场活动。', 'Helo CO-HUB, saya ingin menganjurkan aktiviti di sini.'],
    'This is a request only. The time is not confirmed yet.': ['这只是申请，时间尚未确认。', 'Ini hanya permohonan. Masa belum disahkan.'],
    'Hello, your CO-HUB event is approved.': ['你好，你在 CO-HUB 的活动已经批准。', 'Helo, aktiviti CO-HUB anda telah diluluskan.'],
    'Please remember this time and upload a poster. Guests can see the event only after the poster is uploaded.': ['请记住这个时间，并上传海报。海报上传后，客人才能在列表里看到这场活动。', 'Sila ingat masa ini dan muat naik poster. Tetamu hanya dapat melihat aktiviti selepas poster dimuat naik.'],
    'Upload your poster:': ['上传海报：', 'Muat naik poster:'],
    'Time slot': ['时段', 'Slot masa'],
    'The request is saved. Check the WhatsApp message, then tap send to COHUB KL.': ['申请已记下。请在 WhatsApp 里检查后再发送给 COHUB KL。', 'Permohonan disimpan. Semak mesej WhatsApp, kemudian tekan hantar kepada COHUB KL.'],
    'The approval page did not store this request. WhatsApp can still be used so you can check the message and send it.': ['批准页暂时没有记下这份申请。仍可打开 WhatsApp，检查后再发送。', 'Halaman kelulusan belum menyimpan permohonan ini. WhatsApp masih boleh dibuka untuk semak dan hantar.'],
    'Choose an available time slot.': ['请先选择一个还可以预定的时段。', 'Pilih slot yang masih boleh ditempah.'],
    'That time slot is no longer available. Please choose another one.': ['这个时段已经不能预定，请另选一个。', 'Slot ini tidak lagi boleh ditempah. Sila pilih yang lain.'],
    'Approved. That time slot can no longer be booked. The WhatsApp reminder below is ready for you to check before you send it. The event appears on the guest page after the poster is uploaded.': ['已批准。该时段现在不能再预定。下面的 WhatsApp 提醒已备好，请检查后再发送。海报上传后，活动才会出现在客人页。', 'Diluluskan. Slot itu tidak boleh ditempah lagi. Peringatan WhatsApp di bawah sedia untuk anda semak sebelum dihantar. Aktiviti muncul di halaman tetamu selepas poster dimuat naik.'],
    'Declined. That time slot stays available.': ['已标记为不通过，该时段仍可预定。', 'Tidak diluluskan. Slot itu masih boleh ditempah.'],
    'Cancelled. That time slot is free again, and the event is no longer on the guest page.': ['已取消。该时段重新空出，活动不再出现在客人页。', 'Dibatalkan. Slot itu kosong semula, dan aktiviti tidak lagi dipaparkan di halaman tetamu.'],
    'The events service is not available yet, so this page cannot load requests. Guests can still send a request through WhatsApp.': ['活动服务还没接上，这一页暂时读不到申请。客人仍可通过 WhatsApp 发送申请。', 'Perkhidmatan aktiviti belum tersedia, jadi halaman ini tidak dapat memuatkan permohonan. Tetamu masih boleh hantar melalui WhatsApp.'],
    'Poster submitted. The event now appears on the guest page.': ['海报已提交。活动现在会出现在客人页。', 'Poster dihantar. Aktiviti kini dipaparkan di halaman tetamu.'],
    'This upload link is not valid, or the event is not approved yet.': ['这条上传链接无效，或活动还没有批准。', 'Pautan muat naik ini tidak sah, atau aktiviti belum diluluskan.'],
    'Please choose a poster image first.': ['请先选择一张海报图片。', 'Sila pilih gambar poster dahulu.'],
    'The poster must be a JPG, PNG, or WebP image under 5 MB.': ['海报需为 5 MB 以内的 JPG、PNG 或 WebP 图片。', 'Poster mestilah imej JPG, PNG, atau WebP di bawah 5 MB.'],
    'No phone number was found in the contact, so copy the reminder and send it to the host yourself.': ['联系方式里没有找到电话号码，请复制提醒，自行发给主办人。', 'Nombor telefon tidak dijumpai dalam hubungan. Salin peringatan dan hantar sendiri kepada penganjur.'],
    'Could not reach the events service.': ['暂时连不上活动服务。', 'Tidak dapat menghubungi perkhidmatan aktiviti.'],
    'Could not confirm which slots are already taken. You can still send the request through WhatsApp.': ['暂时无法确认哪些时段已被占用。你仍可通过 WhatsApp 发送申请。', 'Tidak dapat mengesahkan slot yang sudah diambil. Anda masih boleh hantar permohonan melalui WhatsApp.'],
    'The owner token was not accepted.': ['所有者口令未被接受。', 'Token pemilik tidak diterima.'],
    'Unavailable': ['不可预定', 'Tidak boleh ditempah'],
    'Name': ['姓名', 'Nama'],
    'Contact': ['联系方式', 'Hubungan'],
    'Event title': ['活动名称', 'Tajuk aktiviti'],
    'Expected guests': ['预计人数', 'Anggaran tetamu'],
    'Event date': ['日期', 'Tarikh'],
    'Event introduction': ['活动介绍', 'Pengenalan aktiviti'],
    'Notes': ['备注', 'Catatan'],
    'Event host': ['主办人', 'Penganjur'],
    'Request ID': ['申请编号', 'ID permohonan'],
    'Please remember this time': ['请记住这个时间', 'Sila ingat masa ini'],
    'If WhatsApp did not open, use this link to review the message before you send it.': ['如果 WhatsApp 没有打开，用这个链接检查后再发送。', 'Jika WhatsApp tidak terbuka, gunakan pautan ini untuk semak mesej sebelum menghantar.']
  };

  const lang = () => document.getElementById('language')?.value || 'en';
  const t = (en) => {
    const pair = COPY[en];
    const local = window.COHUB_I18N?.local;
    if (typeof local === 'function') return local(en, pair ? pair[0] : en, pair ? pair[1] : en);
    return lang() === 'zh' && pair ? pair[0] : lang() === 'ms' && pair ? pair[1] : en;
  };
  const slotById = (id) => SLOTS.find((slot) => slot.id === id);
  const slotLabel = (id) => {
    const slot = slotById(id);
    return slot ? window.COHUB_I18N.local(slot.en, slot.zh, slot.ms) : id;
  };
  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const [year, month, day] = iso.split('-').map(Number);
    const code = lang();
    if (code === 'zh' || code === 'zh-TW') return year + '年' + month + '月' + day + '日';
    if (code === 'ms') {
      const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
      return day + ' ' + months[month - 1] + ' ' + year;
    }
    if (code === 'en') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return months[month - 1] + ' ' + day + ', ' + year;
    }
    try {
      return new Intl.DateTimeFormat(code, {dateStyle: 'long', timeZone: 'Asia/Kuala_Lumpur'}).format(new Date(iso + 'T00:00:00+08:00'));
    } catch (error) {
      return iso;
    }
  }
  function todayKL() {
    return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  }
  function newId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return 'req_' + [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  function phoneNumber(contact) {
    let digits = String(contact || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    if (digits.startsWith('0')) digits = '60' + digits.slice(1);
    return digits;
  }
  function trailer(event) {
    return ['---', 'Request ID: ' + event.id, 'Slot ID: ' + event.slot, 'Date: ' + event.date, 'Timezone: Asia/Kuala_Lumpur'].join('\n');
  }
  function paxLabel(form) {
    const option = form.pax.selectedOptions[0];
    return window.COHUB_I18N.local(option.dataset.en, option.dataset.zh, option.dataset.ms);
  }
  function hostMessage(fields) {
    return [
      t('Hi CO-HUB, I would like to host an event.'),
      t('Name') + ': ' + fields.name,
      t('Contact') + ': ' + fields.contact,
      t('Event title') + ': ' + fields.title,
      t('Expected guests') + ': ' + fields.paxLabel,
      t('Event date') + ': ' + formatDate(fields.date),
      t('Time slot') + ': ' + slotLabel(fields.slot),
      t('Event introduction') + ': ' + fields.intro,
      t('Notes') + ': ' + (fields.note || '-'),
      t('This is a request only. The time is not confirmed yet.'),
      trailer(fields)
    ].join('\n');
  }
  function reminderMessage(event, posterUrl) {
    return [
      t('Hello, your CO-HUB event is approved.'),
      t('Please remember this time and upload a poster. Guests can see the event only after the poster is uploaded.'),
      '',
      formatDate(event.date),
      slotLabel(event.slot),
      event.title,
      '',
      t('Upload your poster:') + ' ' + posterUrl,
      trailer(event)
    ].join('\n');
  }
  function waUrl(number, text) {
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
  }
  function openWhatsApp(url) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  }
  async function api(path, options) {
    const response = await fetch(path, Object.assign({headers: {Accept: 'application/json'}}, options || {}));
    const body = await response.json().catch(() => ({ok: false, error: 'bad_json'}));
    body.status = response.status;
    return body;
  }
  function ownerHeaders() {
    const headers = {'Content-Type': 'application/json', Accept: 'application/json'};
    try {
      const token = sessionStorage.getItem('cohub-events-owner-token') || '';
      if (token) headers['X-Cohub-Owner-Token'] = token;
    } catch (error) {}
    return headers;
  }
  function field(form, name) {
    return (form.elements[name].value || '').trim();
  }

  let booked = [];
  let serviceNote = '';

  function renderSlots() {
    const form = document.getElementById('hostForm');
    const grid = document.getElementById('slotGrid');
    if (!form || !grid) return;
    const date = field(form, 'date');
    const selected = field(form, 'slot');
    const taken = new Set(booked.filter((item) => item.date === date).map((item) => item.slot));
    if (taken.has(selected)) form.elements.slot.value = '';
    grid.replaceChildren();
    SLOTS.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot';
      button.dataset.slot = slot.id;
      const label = document.createElement('span');
      label.dataset.en = slot.en;
      label.dataset.zh = slot.zh;
      label.dataset.ms = slot.ms;
      label.textContent = t(slot.en);
      button.append(label);
      const isTaken = Boolean(date) && taken.has(slot.id);
      button.disabled = !date || isTaken;
      button.setAttribute('aria-pressed', String(!button.disabled && form.elements.slot.value === slot.id));
      if (isTaken) {
        const small = document.createElement('small');
        small.dataset.en = 'Unavailable';
        small.dataset.zh = '不可预定';
        small.dataset.ms = 'Tidak boleh ditempah';
        small.textContent = t('Unavailable');
        button.append(small);
      }
      grid.append(button);
    });
  }

  function renderPublic(events) {
    const list = document.getElementById('event-list');
    if (!list) return;
    list.replaceChildren();
    (events || []).forEach((event) => {
      if (!event || !/^req_[a-f0-9]{32}$/.test(event.id || '') || !/^community-events\.php\?poster=req_[a-f0-9]{32}$/.test(event.poster || '')) return;
      const article = document.createElement('article');
      article.className = 'event';
      article.dataset.userContent = '';
      const image = document.createElement('img');
      image.src = event.poster;
      image.alt = event.title || '';
      const body = document.createElement('div');
      body.className = 'body';
      const when = document.createElement('p');
      when.className = 'when';
      when.textContent = formatDate(event.date) + ' · ' + slotLabel(event.slot);
      const title = document.createElement('h3');
      title.textContent = event.title || '';
      const intro = document.createElement('p');
      intro.className = 'desc';
      intro.textContent = event.intro || '';
      body.append(when, title, intro);
      article.append(image, body);
      list.append(article);
    });
  }

  function setStatus(id, en) {
    const node = document.getElementById(id);
    if (!node) return;
    if (!en) { node.textContent = ''; return; }
    const pair = COPY[en];
    node.dataset.en = en;
    if (pair) { node.dataset.zh = pair[0]; node.dataset.ms = pair[1]; }
    node.textContent = t(en);
  }

  async function loadPublic() {
    try {
      const body = await api(API + '?view=public');
      if (!body.ok) throw new Error('public');
      booked = Array.isArray(body.booked) ? body.booked : [];
      serviceNote = '';
      renderPublic(body.events || []);
    } catch (error) {
      booked = [];
      serviceNote = 'Could not confirm which slots are already taken. You can still send the request through WhatsApp.';
      renderPublic([]);
    }
    renderSlots();
    const hint = document.getElementById('slotHint');
    if (hint && serviceNote) hint.textContent = t(serviceNote);
  }

  function bindGuest() {
    const dialog = document.getElementById('hostDialog');
    const form = document.getElementById('hostForm');
    if (!dialog || !form) return;
    const date = form.elements.date;
    date.min = todayKL();
    const openHost = () => {
      if (dialog.open) return;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      renderSlots();
    };
    const closeHost = () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    };
    document.getElementById('openHost').addEventListener('click', openHost);
    document.getElementById('closeHost').addEventListener('click', closeHost);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeHost(); });
    dialog.addEventListener('close', () => document.getElementById('openHost').focus());
    date.addEventListener('change', () => { form.elements.slot.value = ''; renderSlots(); });
    document.getElementById('slotGrid').addEventListener('click', (event) => {
      const button = event.target.closest('.slot');
      if (!button || button.disabled) return;
      form.elements.slot.value = button.dataset.slot;
      renderSlots();
    });
    let busy = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const slot = field(form, 'slot');
      const dateValue = field(form, 'date');
      if (!slot || booked.some((item) => item.date === dateValue && item.slot === slot)) {
        setStatus('hostStatus', slot ? 'That time slot is no longer available. Please choose another one.' : 'Choose an available time slot.');
        renderSlots();
        return;
      }
      busy = true;
      const request = {
        id: newId(),
        name: field(form, 'name'),
        contact: field(form, 'contact'),
        title: field(form, 'title'),
        pax: field(form, 'pax'),
        paxLabel: paxLabel(form),
        date: dateValue,
        slot,
        intro: field(form, 'intro'),
        note: field(form, 'note')
      };
      const message = hostMessage(request);
      const url = waUrl(BUSINESS, message);
      let saved = false;
      try {
        const body = await api(API, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
          action: 'create', id: request.id, name: request.name, contact: request.contact, title: request.title,
          pax: request.pax, date: request.date, slot: request.slot, intro: request.intro, note: request.note
        })});
        saved = body.ok === true;
        if (body.error === 'slot_taken') {
          setStatus('hostStatus', 'That time slot is no longer available. Please choose another one.');
          await loadPublic();
          busy = false;
          return;
        }
      } catch (error) {
        saved = false;
      }
      const opened = openWhatsApp(url);
      setStatus('hostStatus', saved
        ? 'The request is saved. Check the WhatsApp message, then tap send to COHUB KL.'
        : 'The approval page did not store this request. WhatsApp can still be used so you can check the message and send it.');
      showFallback('hostFallback', url, opened);
      if (saved) {
        form.reset();
        date.min = todayKL();
        await loadPublic();
      }
      busy = false;
    });
    const params = new URLSearchParams(location.search);
    if (params.get('host') === '1' || location.hash === '#host') {
      openHost();
      const url = new URL(location.href);
      url.searchParams.delete('host');
      if (url.hash === '#host') url.hash = '';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    loadPublic();
  }

  function showFallback(id, url, opened) {
    const node = document.getElementById(id);
    if (!node) return;
    node.replaceChildren();
    if (opened) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.en = 'If WhatsApp did not open, use this link to review the message before you send it.';
    link.dataset.zh = COPY[link.dataset.en][0];
    link.dataset.ms = COPY[link.dataset.en][1];
    link.textContent = t(link.dataset.en);
    node.append(link);
  }

  function requestCard(event, actions) {
    const article = document.createElement('article');
    article.className = 'req no-poster';
    article.dataset.userContent = '';
    const body = document.createElement('div');
    body.className = 'body';
    const when = document.createElement('p');
    when.className = 'when';
    when.textContent = formatDate(event.date) + ' · ' + slotLabel(event.slot);
    const title = document.createElement('h3');
    title.textContent = event.title || '';
    const intro = document.createElement('p');
    intro.className = 'desc';
    intro.textContent = event.intro || '';
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = t('Event host') + ': ' + (event.name || '') + ' · ' + (event.contact || '') + '\n' + t('Expected guests') + ': ' + (event.pax || '') + '\n' + t('Request ID') + ': ' + event.id;
    const row = document.createElement('div');
    row.className = 'admin-actions';
    actions.forEach((action) => row.append(action));
    body.append(when, title, intro, meta, row);
    article.append(body);
    return article;
  }
  function button(className, en, zh, ms) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.dataset.en = en;
    node.dataset.zh = zh;
    node.dataset.ms = ms;
    node.textContent = window.COHUB_I18N.local(en, zh, ms);
    return node;
  }

  async function loadOwner() {
    const pending = document.getElementById('pendingList');
    if (!pending) return;
    let body;
    try {
      body = await api(API + '?view=owner', {headers: ownerHeaders()});
    } catch (error) {
      setStatus('ownerStatus', 'Could not reach the events service.');
      return;
    }
    const tokenForm = document.getElementById('ownerTokenForm');
    if (body.error === 'owner_token_required') {
      if (tokenForm) tokenForm.hidden = false;
      setStatus('ownerStatus', 'The owner token was not accepted.');
      return;
    }
    if (!body.ok) {
      setStatus('ownerStatus', 'The events service is not available yet, so this page cannot load requests. Guests can still send a request through WhatsApp.');
      return;
    }
    if (tokenForm) tokenForm.hidden = true;
    const groups = body.events || {};
    fillOwner(pending, document.getElementById('pendingEmpty'), groups.pending_review || [], (event) => {
      const approve = button('btn-approve', 'Approve', '批准', 'Lulus');
      approve.addEventListener('click', () => decide('approve', event, 'Approved. That time slot can no longer be booked. The WhatsApp reminder below is ready for you to check before you send it. The event appears on the guest page after the poster is uploaded.'));
      const decline = button('btn-decline', 'Decline', '不通过', 'Tidak lulus');
      decline.addEventListener('click', () => decide('decline', event, 'Declined. That time slot stays available.'));
      return [approve, decline];
    });
    fillOwner(document.getElementById('awaitList'), document.getElementById('awaitEmpty'), groups.approved_waiting_poster || [], (event) => {
      const open = button('btn-approve', 'Open the upload page', '打开上传页', 'Buka halaman muat naik');
      open.addEventListener('click', () => window.open(posterUrl(event), '_blank', 'noopener,noreferrer'));
      const cancel = button('btn-decline', 'Cancel and release the slot', '取消并释放时段', 'Batal dan lepaskan slot');
      cancel.addEventListener('click', () => decide('cancel', event, 'Cancelled. That time slot is free again, and the event is no longer on the guest page.'));
      return [open, cancel];
    });
    fillOwner(document.getElementById('liveList'), document.getElementById('liveEmpty'), groups.published || [], (event) => {
      const cancel = button('btn-decline', 'Cancel and release the slot', '取消并释放时段', 'Batal dan lepaskan slot');
      cancel.addEventListener('click', () => decide('cancel', event, 'Cancelled. That time slot is free again, and the event is no longer on the guest page.'));
      return [cancel];
    });
  }
  function fillOwner(list, empty, events, actionsFor) {
    if (!list) return;
    list.replaceChildren();
    events.forEach((event) => list.append(requestCard(event, actionsFor(event))));
    if (empty) empty.hidden = events.length > 0;
  }
  function posterUrl(event) {
    return new URL('community-poster.html?id=' + encodeURIComponent(event.id) + '&upload=' + encodeURIComponent(event.uploadToken), location.href).href;
  }
  async function decide(action, event, message) {
    const body = await api(API, {method: 'POST', headers: ownerHeaders(), body: JSON.stringify({action, id: event.id})});
    if (!body.ok) {
      setStatus('ownerStatus', body.error === 'slot_taken' ? 'That time slot is no longer available. Please choose another one.' : 'Could not reach the events service.');
      await loadOwner();
      return;
    }
    setStatus('ownerStatus', message);
    if (action === 'approve') showReminder(body.event || event);
    else document.getElementById('prepared')?.setAttribute('hidden', '');
    await loadOwner();
  }
  function showReminder(event) {
    const box = document.getElementById('prepared');
    const text = document.getElementById('preparedText');
    const link = document.getElementById('preparedLink');
    if (!box || !text || !link) return;
    const message = reminderMessage(event, posterUrl(event));
    text.value = message;
    const number = phoneNumber(event.contact);
    if (number) {
      link.href = waUrl(number, message);
      link.hidden = false;
    } else {
      link.hidden = true;
      setStatus('ownerStatus', 'No phone number was found in the contact, so copy the reminder and send it to the host yourself.');
    }
    box.hidden = false;
  }

  function bindOwner() {
    const form = document.getElementById('ownerTokenForm');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      try { sessionStorage.setItem('cohub-events-owner-token', form.elements.token.value.trim()); } catch (error) {}
      loadOwner();
    });
    loadOwner();
  }

  function bindPoster() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';
    const upload = params.get('upload') || '';
    const box = document.getElementById('posterReminder');
    const empty = document.getElementById('posterEmpty');
    api(API + '?view=poster&id=' + encodeURIComponent(id) + '&upload=' + encodeURIComponent(upload)).then((body) => {
      if (!body.ok) {
        if (empty) empty.hidden = false;
        setStatus('posterStatus', 'This upload link is not valid, or the event is not approved yet.');
        return;
      }
      if (empty) empty.hidden = true;
      renderPoster(box, body.event, id, upload);
    }).catch(() => setStatus('posterStatus', 'Could not reach the events service.'));
  }
  function renderPoster(box, event, id, upload) {
    box.replaceChildren();
    const card = document.createElement('div');
    card.className = 'when-card';
    card.dataset.userContent = '';
    const kicker = document.createElement('p');
    kicker.className = 'when-kicker';
    kicker.dataset.en = 'Please remember this time';
    kicker.dataset.zh = '请记住这个时间';
    kicker.dataset.ms = 'Sila ingat masa ini';
    kicker.textContent = t('Please remember this time');
    const date = document.createElement('p');
    date.className = 'when-date';
    date.textContent = formatDate(event.date);
    const slot = document.createElement('p');
    slot.className = 'when-slot';
    slot.textContent = slotLabel(event.slot);
    const title = document.createElement('h2');
    title.textContent = event.title || '';
    const intro = document.createElement('p');
    intro.className = 'desc';
    intro.textContent = event.intro || '';
    card.append(kicker, date, slot, title, intro);
    const form = document.createElement('form');
    form.className = 'poster-form';
    const label = document.createElement('label');
    label.className = 'poster-box';
    const span = document.createElement('span');
    span.dataset.en = 'Event poster';
    span.dataset.zh = '活动海报';
    span.dataset.ms = 'Poster aktiviti';
    span.textContent = t('Event poster');
    const fileLabel = document.createElement('label');
    fileLabel.className = 'file-btn';
    const fileText = document.createElement('span');
    fileText.dataset.en = 'Choose a poster image';
    fileText.dataset.zh = '选择海报图片';
    fileText.dataset.ms = 'Pilih gambar poster';
    fileText.textContent = t('Choose a poster image');
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'poster';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.required = true;
    const preview = document.createElement('img');
    preview.className = 'poster-preview';
    preview.alt = '';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) { preview.classList.remove('on'); return; }
      preview.src = URL.createObjectURL(file);
      preview.classList.add('on');
    });
    fileLabel.append(fileText, input);
    label.append(span, fileLabel, preview);
    const submit = document.createElement('button');
    submit.className = 'host-send';
    submit.type = 'submit';
    submit.dataset.en = 'Submit poster';
    submit.dataset.zh = '提交海报';
    submit.dataset.ms = 'Hantar poster';
    submit.textContent = t('Submit poster');
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.dataset.en = 'After you submit the poster, the event appears on the guest page right away.';
    hint.dataset.zh = '提交海报后，活动会立刻出现在客人页。';
    hint.dataset.ms = 'Selepas poster dihantar, aktiviti serta-merta muncul pada halaman tetamu.';
    hint.textContent = t(hint.dataset.en);
    form.append(label, submit, hint);
    form.addEventListener('submit', async (eventSubmit) => {
      eventSubmit.preventDefault();
      const file = input.files && input.files[0];
      if (!file) { setStatus('posterStatus', 'Please choose a poster image first.'); return; }
      if (file.size > 5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setStatus('posterStatus', 'The poster must be a JPG, PNG, or WebP image under 5 MB.');
        return;
      }
      const data = new FormData();
      data.set('id', id);
      data.set('upload', upload);
      data.set('poster', file);
      try {
        const body = await api(API, {method: 'POST', body: data});
        setStatus('posterStatus', body.ok ? 'Poster submitted. The event now appears on the guest page.' : 'This upload link is not valid, or the event is not approved yet.');
      } catch (error) {
        setStatus('posterStatus', 'Could not reach the events service.');
      }
    });
    box.append(card, form);
  }

  document.getElementById('language')?.addEventListener('change', () => {
    if (PAGE === 'guest') { renderSlots(); loadPublic(); }
    if (PAGE === 'approve') loadOwner();
    if (PAGE === 'poster') bindPoster();
  });
  if (PAGE === 'guest') bindGuest();
  if (PAGE === 'approve') bindOwner();
  if (PAGE === 'poster') bindPoster();
})();
