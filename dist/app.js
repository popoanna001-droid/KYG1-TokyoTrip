// 主程式：請在 data.js 之後載入。沿用原頁面的 HTML、CSS 與 assets。
// ── 分類插圖（通常不需要修改） ──
const illustrations = {
    '正餐': '<ellipse cx="85" cy="95" rx="63" ry="10" fill="#a7967d" opacity=".2"/><ellipse cx="85" cy="69" rx="57" ry="26" fill="#f9f3e6"/><path d="M28 69q6 38 57 38t57-38" fill="#c6a178"/><ellipse cx="85" cy="66" rx="48" ry="19" fill="#8b6644"/><path d="m49 63 15-7 13 16 14-18 20 13 12-7" stroke="#e5ca82" stroke-width="6" fill="none"/><circle cx="107" cy="60" r="11" fill="#f8edd0"/><circle cx="107" cy="60" r="5" fill="#dda247"/><path d="m59 60 10-9m13 23 10-9" stroke="#789063" stroke-width="5"/><path d="m100 25 45 22m-43-29 44 21" stroke="#775b41" stroke-width="3" stroke-linecap="round"/>',
    '咖啡': '<ellipse cx="83" cy="102" rx="55" ry="8" fill="#89947a" opacity=".2"/><ellipse cx="82" cy="92" rx="48" ry="11" fill="#f9f5e8"/><path d="M115 51h12q23 16 0 30h-12" stroke="#f9f5e8" stroke-width="9" fill="none"/><path d="M45 48h72v29q-3 22-36 22T45 77z" fill="#fcfaef"/><ellipse cx="81" cy="49" rx="36" ry="13" fill="#e5dcc4"/><ellipse cx="81" cy="49" rx="30" ry="10" fill="#90704d"/><path d="M66 49q14-16 29 0-15 12-29 0" fill="#eee0bc"/><path d="M70 29q-8-7 0-14m20 14q8-7 0-14" stroke="#99a98a" stroke-width="2" fill="none"/>',
    '甜點': '<ellipse cx="86" cy="105" rx="53" ry="9" fill="#b09080" opacity=".2"/><ellipse cx="85" cy="97" rx="53" ry="12" fill="#fff6e9"/><path d="m47 57 52-23 26 55-78 6z" fill="#f0e2b6"/><path d="m47 75 66-14 5 11-71 15z" fill="#ba8170"/><path d="m47 57 52-23 10 22-62 15z" fill="#faf1dc"/><path d="m48 58 52-23 8 16-61 15z" fill="#e6dac2"/><path d="M75 43q-4-18 8-16 12-1 8 16" fill="#c6775f"/><path d="m82 27 4-7" stroke="#76845a" stroke-width="3"/>',
    '小吃': '<ellipse cx="87" cy="105" rx="51" ry="8" fill="#b5a47c" opacity=".2"/><path d="m45 91 85 8" stroke="#9b7955" stroke-width="4"/><path d="m62 58 3 54m25-64 3 64m24-58 3 58" stroke="#ac8a5a" stroke-width="3"/><circle cx="62" cy="62" r="15" fill="#d9b584"/><circle cx="62" cy="40" r="15" fill="#eee1be"/><circle cx="62" cy="21" r="13" fill="#b7c18e"/><circle cx="90" cy="69" r="15" fill="#d4a77b"/><circle cx="90" cy="44" r="15" fill="#eddfbd"/><circle cx="118" cy="72" r="15" fill="#ddbd8b"/><circle cx="118" cy="47" r="15" fill="#eee3c6"/>'
};
// ── 目前畫面狀態 ──

const savedOutingSections = ['shopping-list', 'clothing-list', 'drugstore-list', 'goods-list', 'activity-list'];
let collectionDatabase;
let collectionSaveQueue = Promise.resolve();
document.body.inert = true;

function openCollectionDatabase() {
 return new Promise((resolve, reject) => {
    const request = indexedDB.open('kyg1-travel-collections', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('collections');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
 });
}

function collectionTransaction(mode, value) {
 return new Promise((resolve, reject) => {
    const transaction = collectionDatabase.transaction('collections', mode);
    const store = transaction.objectStore('collections');
    const request = mode === 'readonly' ? store.get('snapshot') : store.put(value, 'snapshot');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
 });
}

function saveCollections() {
 const snapshot = {
    version: 1,
    trips: structuredClone(data),
    outings: Object.fromEntries(savedOutingSections.map(id => {
        const list = document.querySelector('#' + id + ' > .outing-cards').cloneNode(true);
        list.querySelectorAll('[hidden]').forEach(card => card.removeAttribute('hidden'));
        return [id, list.innerHTML];
    }))
 };
 collectionSaveQueue = collectionSaveQueue.then(async () => {
    if (!collectionDatabase) throw new Error('儲存空間無法開啟');
    await collectionTransaction('readwrite', snapshot);
 }).catch(() => toast('儲存失敗，請確認瀏覽器允許網站儲存資料，並保留目前頁面。'));
 return collectionSaveQueue;
}

async function restoreCollections() {
 try {
    collectionDatabase = await openCollectionDatabase();
    const saved = await collectionTransaction('readonly');
    if (saved?.version === 1 && Array.isArray(saved.trips) && saved.trips.length &&
        saved.trips.every(trip => trip && Array.isArray(trip.places))) {
        data = saved.trips;
        current = data[0].id;
        render();
    }
    for (const id of savedOutingSections) {
        const section = document.getElementById(id);
        if (typeof saved?.outings?.[id] === 'string') {
            const template = document.createElement('template');
            template.innerHTML = saved.outings[id];
            template.content.querySelectorAll('script,iframe,object,embed').forEach(node => node.remove());
            section.querySelector(':scope > .outing-cards').replaceChildren(template.content);
        }
        const filters = section.querySelector(':scope > .outing-region-filter');
        const known = new Set(Array.from(filters.querySelectorAll('button'), button => button.textContent.trim()));
        section.querySelectorAll(':scope > .outing-cards .outing-label:not(.type-label)').forEach(label => {
            const area = label.textContent.trim();
            if (!area || known.has(area)) return;
            known.add(area);
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = area;
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => filterOutingRegion(id, area, button));
            filters.append(button);
        });
    }
    refreshOutingFilters();
 } catch {
    toast('無法讀取瀏覽器儲存資料，目前顯示原始清單。');
 } finally {
    document.body.inert = false;
 }
}

let current = data[0].id, category = '全部', region = '全部', editing = null, deleting = null;
let page = 1, lastFilterKey = '';
let convenience = '';
const pageSize = 6;
function changePage(next) {
    page = next;
    render();
    document.querySelector('#cards').scrollIntoView({behavior: 'smooth', block: 'start'});
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const trip = () => data.find(t => t.id === current);
function toast(msg) {
    const e = document.querySelector('#toast');
    e.textContent = msg;
    e.style.display = 'block';
    setTimeout(() => e.style.display = 'none', 3500);
}
function select(id) {
    current = id;
    convenience = '';
    category = '全部';
    region = '全部';
    document.querySelector('#search').value = '';
    render();
}
// ── 更新旅程、篩選條件與收藏卡片 ──
function render() {
    const t = trip();
    document.querySelector('#tripname').textContent = t.name;
    document.querySelector('#crumb').textContent = t.name;
    document.querySelector('#destination').textContent = '⌖ ' + t.where;
    document.querySelector('#dates').textContent = '▦ ' + t.start.replaceAll('-', '.') + ' — ' + t.end.replaceAll('-', '.');
    document.querySelector('#tripnav').innerHTML = data.map(t => '<button class="triplink ' + (t.id === current ? 'active' : '') + '" onclick="select(' + t.id + ')"><span>▧</span>' + esc(t.name) + '</button>').join('');
    document.querySelector('#mobiletrips').innerHTML = data.map(t => '<button onclick="select(' + t.id + ')">' + esc(t.name) + '</button>').join('') + '<button onclick="openTrip()">＋ 新旅程</button>';
    document.querySelector('#total').innerHTML = t.places.length + '<small>間</small>';
    document.querySelector('#want').innerHTML = t.places.filter(p => !p.done).length + '<small>間</small>';
    document.querySelector('#done').innerHTML = t.places.filter(p => p.done).length + '<small>間</small>';
    const regions = [
        '全部', ...new Set(t.places.filter(p => !p.convenienceItem).flatMap(placeRegions))
    ];
    document.querySelector('#regions').innerHTML = regions.map(r => '<button class="region ' + (r === region ? 'active' : '') + '" data-region="' + esc(r) + '">' + esc(r) + '</button>').join('');
    const cats = [
        '全部', ...new Set(t.places.map(p => p.category).filter(Boolean))
    ];
    document.querySelector('#tabs').innerHTML = cats.map(c => '<button class="tab ' + (c === category ? 'active' : '') + '" data-category="' + esc(c) + '">' + esc(c) + '</button>').join('');
    document.querySelectorAll('#convenience-filter button').forEach(button => {
        const selected = button.dataset.store === convenience;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    const q = document.querySelector('#search').value.trim().toLowerCase();
    const rows = t.places.map((p, i) => ({
        ...p, i
    })).filter(p => (convenience ? p.convenienceItem && (convenience === '全部' || p.store === convenience) : !p.convenienceItem) && (category === '全部' || p.category === category) && (region === '全部' || placeRegions(p).includes(region)) && [
        p.name, ...placeRegions(p), p.note, p.hours || '', ...placeAddresses(p)
    ].some(v => v.toLowerCase().includes(q)));
    document.querySelector('#resultcount').textContent = rows.length + ' 家收藏';
    const filterKey = JSON.stringify([current, category, region, convenience, q]);
    if (filterKey !== lastFilterKey) page = 1;
    lastFilterKey = filterKey;
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, pageCount);
    document.querySelector('#pagination').hidden = rows.length <= pageSize;
    document.querySelector('#pagination').innerHTML = '<button type="button" onclick="changePage(' + (page - 1) + ')"' + (page === 1 ? ' disabled' : '') + '>← 上一頁</button><span aria-live="polite">第 ' + page + ' / ' + pageCount + ' 頁</span><button type="button" onclick="changePage(' + (page + 1) + ')"' + (page === pageCount ? ' disabled' : '') + '>下一頁 →</button>';
    document.querySelector('#cards').innerHTML = rows.slice((page - 1) * pageSize, page * pageSize).map(p => '<article class="card"><div class="card-media"><button type="button" class="visual v' + (p.i % 6 + 1) + '" data-photo-index="' + p.i + '" aria-label="放大圖片">' +
        (p.photo ? '<img src="' + esc(p.photo) + '" alt="店家照片">' : '<svg viewBox="0 0 170 125" aria-hidden="true">' + (illustrations[p.category] || illustrations['正餐']) + '</svg>') +
        '</button><div class="card-actions">' + interestMarkup(p.i, p.interested) + '<button type="button" class="edit-place" title="編輯收藏" aria-label="編輯收藏" onclick="editPlace(' +
        p.i +
        ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z"/></svg></button><button type="button" class="delete-place" title="刪除收藏" aria-label="刪除收藏" onclick="deletePlace(' +
        p.i +
        ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/></svg></button></div></div><div class="cardbody"><div class="placecontent"><h3 class="place-name">' +
        esc(p.name) +
        '</h3>' +
        ((p.hours && p.hours.trim()) || (p.days && p.days.length) ? '<div class="schedule">' +
            (p.hours && p.hours.trim() ? '<div class="schedule-row"><svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="營業時間"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>' +
                esc(p.hours.trim()) +
                '</span></div>' : '') +
            (p.days && p.days.length ? '<div class="schedule-row"><div class="weekday-chips">' + p.days.map(d => '<span>週' + esc(d) + '</span>').join('') + '</div></div>' : '') +
            '</div>' : '') +
        (p.note && p.note.trim() ? '<div class="place-note"><p class="comment">' + esc(p.note.trim()) + '</p></div>' : '') +
        '<div class="cardfooter">' +
        placeAddresses(p).map((address, index) => '<a class="map" target="_blank" rel="noopener noreferrer" href="' + esc(mapDestination(address)) + '">地圖' +
            (placeRegions(p)[index] ? '-' + esc(placeRegions(p)[index]) : placeAddresses(p).length > 1 ? '-' + (index + 1) : '') +
            ' ↗</a>').join('') +
        '</div></div><div class="side-labels">' +
        placeRegions(p).map(r => '<span class="side-label region-label">' + esc(r) + '</span>').join('') +
        (p.category && p.category.trim() ? '<span class="side-label">' + esc(p.category.trim()) + '</span>' : '') +
        '</div></div></article>').join('') || '<div class="empty">' + (t.places.length ? '沒有找到符合的地方，換個條件試試？' : '旅程的第一個好地方，等你收藏。') + '</div>';
}
// ── 新增收藏與旅程、表單事件 ──
function toggle(i) {
    trip().places[i].done = !trip().places[i].done;
    render();
}
function openPlace() {
    editing = null;
    document.querySelector('#placeform h2').textContent = '收藏一個好地方';
    document.querySelector('#placeform button.primary').textContent = '加入清單';
    document.querySelector('#placeform').reset();
    document.querySelector('#pstore').value = ['LAWSON','全家','711'].includes(convenience) ? convenience : '';
    document.querySelector('#hours-groups').innerHTML = '';
    addHoursGroup();
    setTextFields('region-fields', []);
    setTextFields('address-fields', []);
    document.querySelector('#place').showModal();
}
function openTrip() {
    document.querySelector('#tripform').reset();
    document.querySelector('#trip').showModal();
}
document.querySelector('#tabs').onclick = e => {
    if (e.target.dataset.category) {
        category = e.target.dataset.category;
        render();
    }
};
document.querySelector('#regions').onclick = e => {
    if (e.target.dataset.region) {
        convenience = '';
        region = e.target.dataset.region;
        render();
    }
};
document.querySelector('#convenience-filter').onclick = event => {
    const button = event.target.closest('button[data-store]');
    if (!button) return;
    convenience = button.dataset.store;
    region = '全部';
    category = '全部';
    render();
};
document.querySelector('#search').oninput = render;
document.querySelector('#placeform').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.querySelector('#pname').value.trim();
    if (!name)
        return;
    const schedule = readHoursGroups();
    if (schedule === null)
        return;
    const targetTrip = trip();
    const file = document.querySelector('#pphoto').files[0];
    let photo = '';
    if (file) {
        if (!file.type.startsWith('image/')) {
            toast('請選擇圖片檔案');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast('預覽照片請小於 10 MB');
            return;
        }
        photo = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    const previous = editing !== null ? targetTrip.places[editing] : null;
    const item = {
        convenienceItem: Boolean(document.querySelector('#pstore').value), store: document.querySelector('#pstore').value,
        name, photo: photo || (previous?.photo || ''), category: previous?.category || '', scheduleGroups: schedule, hours: formatHours(schedule), days: [
            ...new Set(schedule.flatMap(g => g.days))
        ], addresses: readTextFields('address-fields'), address: readTextFields('address-fields')[0] || '', regions: readTextFields('region-fields'), area: readTextFields('region-fields')[0] || '', note: document.querySelector('#pnote').value.trim(), interested: previous?.interested || false, author: previous?.author || '你', done: previous?.done || false
    };
    const wasEditing = editing !== null;
    convenience = item.convenienceItem ? item.store : '';
    if (wasEditing)
        targetTrip.places[editing] = item;
    else
        targetTrip.places.push(item);
    editing = null;
    category = '全部';
    region = '全部';
    document.querySelector('#search').value = '';
    document.querySelector('#place').close();
    render();
    saveCollections();
    toast(wasEditing ? '已更新收藏。' : '已加入收藏。');
};
document.querySelector('#tripform').onsubmit = e => {
    e.preventDefault();
    const start = document.querySelector('#tstart').value, end = document.querySelector('#tend').value;
    if (end < start) {
        document.querySelector('#tend').setCustomValidity('回程不能早於出發日期');
        document.querySelector('#tend').reportValidity();
        return;
    }
    const id = Date.now();
    data.push({
        id, name: document.querySelector('#tname').value.trim(), where: document.querySelector('#twhere').value.trim(), start, end, places: []
    });
    document.querySelector('#trip').close();
    select(id);
    saveCollections();
    toast('已建立旅程。');
};
document.querySelector('#tend').oninput = e => e.target.setCustomValidity('');
illustrations['咖啡甜點'] = illustrations['咖啡'];
render();
// ── 編輯與刪除收藏 ──
function editPlace(i) {
    openPlace();
    editing = i;
    const p = trip().places[i];
    document.querySelector('#placeform h2').textContent = '編輯收藏';
    document.querySelector('#placeform button.primary').textContent = '儲存修改';
    document.querySelector('#pname').value = p.name;
    document.querySelector('#pstore').value = p.convenienceItem ? p.store : '';
    setTextFields('region-fields', placeRegions(p));
    setTextFields('address-fields', placeAddresses(p));
    document.querySelector('#pnote').value = p.note || '';
    document.querySelector('#hours-groups').innerHTML = '';
    const groups = p.scheduleGroups || legacyHours(p);
    (groups.length ? groups : [
        {}
    ]).forEach(addHoursGroup);
}
function deletePlace(i) {
    deleting = {
        trip: current, index: i
    };
    document.querySelector('#delete-name').textContent = trip().places[i].name;
    document.querySelector('#delete-place').showModal();
}
function confirmDelete() {
    if (!deleting)
        return;
    const t = data.find(t => t.id === deleting.trip);
    if (t)
        t.places.splice(deleting.index, 1);
    deleting = null;
    document.querySelector('#delete-place').close();
    category = '全部';
    region = '全部';
    render();
    saveCollections();
    toast('已刪除收藏。');
}
// ── 照片放大 ──
function zoomPhoto(i) {
    const p = trip().places[i];
    document.querySelector('#photo-stage').innerHTML = p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '">' : '<svg viewBox="0 0 170 125" role="img" aria-label="示範插圖">' + (illustrations[p.category] || illustrations['正餐']) + '</svg>';
    document.querySelector('#photo-caption').textContent = p.name;
    document.querySelector('#photo-viewer').showModal();
}
document.querySelector('#photo-viewer').onclick = e => {
    if (e.target === e.currentTarget) {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            e.currentTarget.close();
    }
};
document.querySelector('#cards').addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-photo-index]');
    if (trigger) {
        event.preventDefault();
        zoomPhoto(Number(trigger.dataset.photoIndex));
    }
});
// ── Google 地圖連結 ──
function googleMapURL(value) {
    try {
        const u = new URL(value.trim());
        if (u.protocol !== 'https:' && u.protocol !== 'http:')
            return null;
        const host = u.hostname.toLowerCase();
        if (host === 'share.google' || host === 'maps.app.goo.gl' || host === 'goo.gl' && u.pathname.startsWith('/maps') || host === 'maps.google.com' || ((host === 'google.com' || host === 'www.google.com' || host === 'google.com.tw' || host === 'www.google.com.tw') && (u.pathname === '/maps' || u.pathname.startsWith('/maps/'))))
            return u.href;
        return null;
    }
    catch {
        return null;
    }
}
function mapDestination(value) {
    return googleMapURL(value) || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(value.trim());
}
// ── 營業時間欄位 ──
function timeOptions(value) {
    return '<option value=""></option>' +
        Array.from({
            length: 48
        }, (_, i) => {
            const t = String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00');
            return '<option value="' + t + '"' + (value === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');
}
function addHoursGroup(group = {}, container = 'hours-groups') {
    const row = document.createElement('div');
    row.className = 'hours-group';
    row.innerHTML = '<div class="group-top"><span>營業時段</span><button type="button" title="移除此時段" aria-label="移除此時段" onclick="this.closest(&quot;.hours-group&quot;).remove()">×</button></div><div class="day-options">' +
        [
            '一', '二', '三', '四', '五', '六', '日'
        ].map(d => '<label class="day-option"><input type="checkbox" value="' + d + '"' + ((group.days || []).includes(d) ? ' checked' : '') + '><span>週' + d + '</span></label>').join('') +
        '</div><div class="time-row"><label>開始營業<select class="group-start">' +
        timeOptions(group.start) +
        '</select></label><span>至</span><label>結束營業<select class="group-end">' +
        timeOptions(group.end) +
        '</select></label></div><label class="allday"><input class="group-all" type="checkbox"' +
        (group.all ? ' checked' : '') +
        '>24 小時營業</label>';
    const all = row.querySelector('.group-all');
    const update = () => row.querySelectorAll('select').forEach(s => s.disabled = all.checked);
    all.onchange = update;
    update();
    document.getElementById(container).appendChild(row);
}
function readHoursGroups(container = 'hours-groups') {
    const result = [];
    for (const row of document.getElementById(container).querySelectorAll('.hours-group')) {
        const days = Array.from(row.querySelectorAll('.day-option input:checked')).map(e => e.value), start = row.querySelector('.group-start').value, end = row.querySelector('.group-end').value, all = row.querySelector('.group-all').checked;
        if (!days.length && !start && !end && !all)
            continue;
        if (!days.length || !all && (!start || !end)) {
            toast('每組時段請選擇營業星期，並填完整時間或勾選 24 小時營業');
            return null;
        }
        result.push({
            days, start: all ? '' : start, end: all ? '' : end, all
        });
    }
    return result;
}
function formatHours(groups) {
    return groups.map(g => g.days.map(d => '週' + d).join('、') + ' ' + (g.all ? '24 小時營業' : g.start + '–' + g.end + (g.end <= g.start ? '（翌日）' : ''))).join('\n');
}
function legacyHours(p) {
    if (!p.hours)
        return [];
    if (p.name === 'おでん屋たけし (西口店)')
        return [
            {
                days: [
                    '一', '二', '三', '四', '五'
                ], start: '16:00', end: '23:00', all: false
            }, {
                days: [
                    '六', '日'
                ], start: '15:00', end: '23:00', all: false
            }
        ];
    const m = p.hours.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/);
    return m ? [
        {
            days: p.days || [], start: m[1], end: m[2], all: false
        }
    ] : p.hours === '24 小時營業' ? [
        {
            days: p.days || [], all: true
        }
    ] : [];
}
// ── 地區與地址欄位 ──
function placeRegions(p) {
    return (p.regions || [
        p.area || ''
    ]).map(s => s.trim()).filter(Boolean);
}
function placeAddresses(p) {
    return (p.addresses || [
        p.address || ''
    ]).map(s => s.trim()).filter(Boolean);
}
function addTextField(id, value = '') {
    const row = document.createElement('div');
    row.className = 'multi-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = id === 'region-fields' ? 60 : 2000;
    input.value = value;
    input.setAttribute('aria-label', id === 'region-fields' ? '地區' : '地址或 Google 地圖連結');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '×';
    button.title = '移除此項';
    button.setAttribute('aria-label', '移除此項');
    button.onclick = () => row.remove();
    row.append(input, button);
    document.querySelector('#' + id).appendChild(row);
}
function setTextFields(id, values) {
    document.querySelector('#' + id).innerHTML = '';
    (values.length ? values : [
        ''
    ]).forEach(value => addTextField(id, value));
}
function readTextFields(id) {
    return [
        ...new Set(Array.from(document.querySelectorAll('#' + id + ' input')).map(e => e.value.trim()).filter(Boolean))
    ];
}

function switchContent(section, animate = true) {
 const active = section === 'prepare' ? 'prepare' : section === 'records' ? 'records' : section === true ? 'outings' : 'food';
 const line = document.querySelector('.tokyo-line');
 const changed = !document.getElementById(active + '-tab').classList.contains('active');
 document.querySelector('.journal-top .title > div').textContent = {prepare:'準備中',records:'重點筆記',food:'進攻美食世界',outings:'買買買'}[active];
 const train = line.querySelector('.little-train');
 train.classList.remove('arriving');
 line.style.setProperty('--station', {prepare:0,records:1,food:2,outings:3}[active]);
 if (animate && changed) {
    void train.offsetWidth;
    train.classList.add('arriving');
 }
 for (const name of ['prepare','records','food','outings']) {
    document.getElementById(name + '-main').hidden = name !== active;
    const tab = document.getElementById(name + '-tab');
    tab.classList.toggle('active', name === active);
    tab.setAttribute('aria-current', name === active ? 'page' : 'false');
 }
}

const outingPageSize = 5;
const outingPages = new WeakMap();

function filterOutingRegion(sectionId, region, button) {
 const section = document.getElementById(sectionId);
 section.querySelectorAll(':scope > .outing-region-filter button').forEach(filter => {
    filter.classList.toggle('active', filter === button);
    filter.setAttribute('aria-pressed', String(filter === button));
 });
 const query = document.querySelector('#outing-search').value.trim().toLowerCase();
 const state = outingPages.get(section);
 const page = state?.region === region && state.query === query ? state.page : 1;
 renderOutingPage(section, region, query, page);
}

function renderOutingPage(section, region, query, requestedPage) {
 const list = section.querySelector(':scope > .outing-cards');
 const cards = Array.from(list.querySelectorAll(':scope > .outing-card'));
 const matches = cards.filter(card => {
    const areas = Array.from(card.querySelectorAll('.outing-label:not(.type-label)'), label => label.textContent.trim());
    return (region === '全部' || region.split('・').every(area => areas.includes(area.trim()))) &&
        card.textContent.toLowerCase().includes(query);
 });
 const pageCount = Math.max(1, Math.ceil(matches.length / outingPageSize));
 const page = Math.max(1, Math.min(requestedPage, pageCount));
 const start = (page - 1) * outingPageSize;
 const shown = new Set(matches.slice(start, start + outingPageSize));
 cards.forEach(card => { card.hidden = !shown.has(card); });
 outingPages.set(section, {region, query, page});
 section.querySelector(':scope > .outing-filter-empty').hidden = matches.length > 0;
 document.querySelector('.outing-jump a[href="#' + section.id + '"] .bookmark-count').textContent = cards.length;

 let pagination = section.querySelector(':scope > .outing-pagination');
 if (!pagination) {
    pagination = document.createElement('nav');
    pagination.className = 'pagination outing-pagination';
    pagination.setAttribute('aria-label', section.querySelector('h2').textContent + '分頁');
    list.after(pagination);
 }
 pagination.hidden = pageCount === 1;
 pagination.replaceChildren();
 if (pagination.hidden) return;

 function addButton(label, target, disabled = false, numbered = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    if (numbered) {
        button.setAttribute('aria-label', '第 ' + target + ' 頁');
        if (target === page) button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
        if (target === page) return;
        renderOutingPage(section, region, query, target);
        pagination.querySelector('[aria-current="page"]').focus({preventScroll: true});
        list.scrollIntoView({block: 'start'});
    });
    pagination.append(button);
 }

 const status = document.createElement('span');
 status.className = 'outing-page-status';
 status.setAttribute('aria-live', 'polite');
 status.textContent = '第 ' + page + ' / ' + pageCount + ' 頁';
 pagination.append(status);
 addButton('← 上一頁', page - 1, page === 1);
 for (let number = 1; number <= pageCount; number++) addButton(String(number), number, false, true);
 addButton('下一頁 →', page + 1, page === pageCount);
}


function interestMarkup(index, interested) {return "<button type=\"button\" class=\"interest-button\" aria-label=\"標記有興趣\" title=\"有興趣\" aria-pressed=\"false\" ><svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M20.4 4.9a5.2 5.2 0 0 0-7.4 0L12 6l-1-1.1a5.2 5.2 0 0 0-7.4 7.3L12 21l8.4-8.8a5.2 5.2 0 0 0 0-7.3Z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg></button>".replace('aria-pressed="false"','aria-pressed="'+Boolean(interested)+'"').replace('class="interest-button"','class="interest-button'+(interested?' is-interested':'')+'"').replace('title="有興趣"','title="'+(interested?'取消有興趣':'有興趣')+'" onclick="toggleFoodInterest('+index+')"');}
function toggleFoodInterest(index){const p=trip().places[index];p.interested=!p.interested;render();saveCollections();}
function toggleOutingInterest(button){const active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-interested',active);button.title=active?'取消有興趣':'有興趣';button.setAttribute('aria-label',button.title);saveCollections();}
let pendingOutingDelete=null;
function askDeleteOuting(button){pendingOutingDelete=button.closest('.outing-card');document.querySelector('#delete-outing-name').textContent=pendingOutingDelete.querySelector('h3').textContent;document.querySelector('#delete-outing').showModal();}
function confirmDeleteOuting(){if(!pendingOutingDelete)return;pendingOutingDelete.remove();pendingOutingDelete=null;document.querySelector('#delete-outing').close();refreshOutingFilters();saveCollections();}

function updatePrepProgress(save, walk = false) {
 const total = prepTasks.length;
 const count = prepTasks.filter(task => task.checked).length;
 const percent = total ? Math.floor(count / total * 100) : 0;
 document.querySelector('#prep-journey-fill').style.width=percent+'%';
 const traveller=document.querySelector('#prep-journey-plane');
 traveller.classList.toggle('is-complete',percent===100);
 traveller.classList.remove('is-walking');
 if (walk && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void traveller.offsetWidth;
    traveller.classList.add('is-walking');
 }
 traveller.style.left = percent + '%';

 document.querySelector('#prep-progress').max=Math.max(1,total);
 document.querySelector('#prep-progress').value=count;
 document.querySelector('#prep-progress-count').textContent=count+' / '+total+'（'+percent+'%）';
 document.querySelector('#prep-progress-note').textContent=percent===100?'準備完成，帶著好心情出發吧！':'出發前要準備的，都在這裡慢慢完成。';
 if(save){try{localStorage.setItem(prepStorageKey,JSON.stringify(prepTasks));}catch{}}
}
const prepList = document.querySelector('#prepare-main .prep-items');
const prepForm = document.querySelector('.prep-add-form');
const prepStorageKey = 'kyg1-preparation-v5';
const prepDefaults = Array.from(prepList.querySelectorAll('.prep-item'), row => ({
 text: row.querySelector('label span').textContent,
 note: row.querySelector('p')?.textContent || '',
 checked: false
}));
let prepTasks = prepDefaults;
try {
 const saved = JSON.parse(localStorage.getItem(prepStorageKey));
 if (Array.isArray(saved)) {
    prepTasks = saved.filter(task => typeof task?.text === 'string');
 } else {
    const previous = JSON.parse(localStorage.getItem('kyg1-preparation-v3'));
    const legacy = JSON.parse(localStorage.getItem('kyg1-preparation-v4'));
    const existing = Array.isArray(legacy) ? legacy.filter(task => typeof task?.text === 'string') : [];
    const existingNames = new Set(existing.map(task => task.text));
    prepDefaults.forEach((task, index) => { task.checked = previous?.[index] === true; });
    prepTasks = [...existing, ...prepDefaults.filter(task => !existingNames.has(task.text))];
    localStorage.setItem(prepStorageKey, JSON.stringify(prepTasks));
 }
} catch {}

function renderPrepTasks() {
 prepList.replaceChildren(...prepTasks.map((task, index) => {
    const row = document.createElement('div');
    row.className = 'prep-item';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.checked);
    checkbox.addEventListener('change', () => {
        task.checked = checkbox.checked;
        updatePrepProgress(true, true);
    });
    const text = document.createElement('span');
    text.textContent = task.text;
    label.append(checkbox, text);
    row.append(label);
    if (task.note) {
        const note = document.createElement('p');
        note.textContent = task.note;
        row.append(note);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'prep-remove';
    remove.setAttribute('aria-label', '刪除「' + task.text + '」');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
        prepTasks.splice(index, 1);
        renderPrepTasks();
        updatePrepProgress(true);
        (prepList.querySelectorAll('.prep-remove')[index] || prepForm.elements[0]).focus();
    });
    row.append(remove);
    return row;
 }));
}

prepForm.addEventListener('submit', event => {
 event.preventDefault();
 const input = prepForm.querySelector('input');
 const text = input.value.trim();
 if (!text) { input.focus(); return; }
 prepTasks.push({text, checked: false});
 renderPrepTasks();
 updatePrepProgress(true);
 prepForm.reset();
 input.focus();
});
renderPrepTasks();
updatePrepProgress(false);



function refreshOutingFilters() {
    for (const sectionId of ['shopping-list', 'clothing-list', 'drugstore-list', 'goods-list', 'activity-list']) {
        document.querySelector('#' + sectionId + ' .outing-region-filter .active').click();
    }
}
document.querySelector('#outing-search').addEventListener('input', refreshOutingFilters);
refreshOutingFilters();
function openOuting() {
 const form = document.getElementById('outing-form');
 form.reset();
 setTextFields('outing-region-fields', ['']);
 setTextFields('outing-address-fields', ['']);
 document.getElementById('outing-hours-groups').replaceChildren();
 addHoursGroup({}, 'outing-hours-groups');
 document.getElementById('outing-form-dialog').showModal();
}
document.querySelector('#outing-form').addEventListener('submit', async event => {
 event.preventDefault();
 const form = event.currentTarget;
 const sectionId = form.querySelector('#outing-destination').value;
 const name = form.querySelector('#outing-name').value.trim();
 const regions = readTextFields('outing-region-fields');
 if (!name || !savedOutingSections.includes(sectionId)) return;
 if (!regions.length) { toast('請填寫至少一個地區'); return; }
 const schedule = readHoursGroups('outing-hours-groups');
 if (schedule === null) return;
 const file = form.querySelector('#outing-photo').files[0];
 const submit = form.querySelector('button.primary');
 submit.disabled = true;
 try {
    let photo = '';
    if (file) {
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
            toast('請選擇 10 MB 以下的圖片');
            return;
        }
        photo = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    const section = document.getElementById(sectionId);
    const card = document.querySelector('#outing-card-template').content.firstElementChild.cloneNode(true);
    card.querySelector('h3').textContent = name;
    const labels = card.querySelector('.outing-labels');
    labels.replaceChildren(...regions.map(region => {
        const label = document.createElement('span');
        label.className = 'outing-label';
        label.textContent = region;
        return label;
    }));
    const category = form.querySelector('#outing-tape').value.trim();
    if (category) {
        const type = document.createElement('span');
        type.className = 'shopping-type-tape';
        type.textContent = category;
        card.querySelector('h3').after(type);
    }
    card.dataset.labelCount = labels.children.length;
    card.style.setProperty('--outing-label-width', labels.children.length * 30 + 'px');
    const body = card.querySelector('p');
    body.replaceChildren();
    if (schedule.length) {
        const hours = document.createElement('span');
        hours.className = 'outing-custom-hours';
        hours.textContent = '◷ ' + formatHours(schedule);
        const weekdays = document.createElement('span');
        weekdays.className = 'weekday-chips shopping-weekdays';
        for (const day of [...new Set(schedule.flatMap(group => group.days))]) {
            const label = document.createElement('span');
            label.textContent = '週' + day;
            weekdays.append(label);
        }
        body.append(hours, weekdays);
    }
    const note = form.querySelector('#outing-note').value.trim();
    if (note) { const text = document.createElement('span'); text.className = 'outing-custom-note'; text.textContent = note; body.append(text); }
    body.hidden = !schedule.length && !note;
    if (photo) {
        const image = document.createElement('img');
        image.className = 'outing-custom-photo';
        image.src = photo;
        image.alt = name;
        card.querySelector('h3').before(image);
    }
    const map = card.querySelector('.map');
    const links = document.createElement('div');
    links.className = 'shopping-map-links';
    readTextFields('outing-address-fields').forEach((address, index) => {
        const link = map.cloneNode(true);
        link.href = mapDestination(address);
        link.textContent = '地圖' + (regions[index] ? '－' + regions[index] : '') + ' ↗';
        links.append(link);
    });
    map.replaceWith(links);
    section.querySelector(':scope > .outing-cards').prepend(card);
    const filters = section.querySelector(':scope > .outing-region-filter');
    for (const region of regions) {
        if (Array.from(filters.children).some(button => button.textContent.trim() === region)) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = region;
        button.addEventListener('click', () => filterOutingRegion(sectionId, region, button));
        filters.append(button);
    }
    document.getElementById('outing-search').value = '';
    filters.querySelector('button').click();
    refreshOutingFilters();
    await saveCollections();
    form.closest('dialog').close();
    section.scrollIntoView({block:'start'});
 } catch {
    toast('圖片讀取失敗，請重新選擇照片');
 } finally { submit.disabled = false; }
});

const routePlan = document.querySelector('.route-plan');
const routeDialog = document.querySelector('#route-dialog');
const routeDate = document.querySelector('#route-date');
const routeInputs = [...routeDialog.querySelectorAll('input[type="checkbox"]')];
const routeStorageKey = 'kyg1-route-2026';
let routeSelections = {};
let lastRouteDate = '0';
try {
    routeSelections = JSON.parse(localStorage.getItem(routeStorageKey)) || {};
} catch {}

function renderRouteDay(day) {
    const tags = routePlan.querySelector('[data-route-day="' + day + '"] .route-selected');
    const selected = routeSelections[day];
    tags.replaceChildren(...(Array.isArray(selected) ? selected : []).map(area => {
        const tag = document.createElement('span');
        tag.textContent = area;
        return tag;
    }));
}

function restoreRouteDraft() {
    const saved = routeSelections[routeDate.value];
    routeInputs.forEach(input => {
        input.checked = Array.isArray(saved) && saved.includes(input.value);
    });
}

routePlan.querySelectorAll('[data-route-day]').forEach(day => renderRouteDay(day.dataset.routeDay));
routePlan.querySelector('.route-edit').addEventListener('click', () => {
    routeDate.value = lastRouteDate;
    restoreRouteDraft();
    routeDialog.showModal();
});
routeDate.addEventListener('change', restoreRouteDraft);
routeDialog.querySelector('[data-route-cancel]').addEventListener('click', () => routeDialog.close());
routeDialog.querySelector('[data-route-confirm]').addEventListener('click', () => {
    lastRouteDate = routeDate.value;
    routeSelections[lastRouteDate] = routeInputs.filter(input => input.checked).map(input => input.value);
    renderRouteDay(lastRouteDate);
    showRouteMap(lastRouteDate);
    try {
        localStorage.setItem(routeStorageKey, JSON.stringify(routeSelections));
    } catch {}
    routeDialog.close();
});

const routeMapPoints = {
    '機場':[85.6,15.8],
    '東京車站':[58.6,56.3],
    '秋葉原':[61.4,41.5],
    '新宿':[33.4,38.5],
    '原宿':[28.3,54.1],
    '澀谷':[29.9,65.5],
    '目黑':[26,84],
    '淺草':[63.4,24.7],
    '池袋':[36.8,22.7]
};
const routeMapLabelPositions = {
    '機場':[92.2,12.5,12],
    '東京車站':[67.1,55.2,14.5],
    '秋葉原':[68.5,40.5,11.5],
    '新宿':[38.4,36.9,8],
    '原宿':[33.2,52.9,7.5],
    '澀谷':[35.2,64.7,8],
    '目黑':[30.6,83.3,7],
    '淺草':[68.5,23,8],
    '池袋':[42,20.8,8]
};
const routeMap = routePlan.querySelector('.daily-map-points');

function showRouteMap(day) {
    lastRouteDate = day;
    const saved = routeSelections[day];
    const stops = Array.isArray(saved) ? saved.filter(area => Object.hasOwn(routeMapPoints, area)) : [];
    routePlan.querySelectorAll('.route-day-date').forEach(button => {
        button.setAttribute('aria-pressed', String(button.closest('[data-route-day]').dataset.routeDay === day));
    });
    routeMap.replaceChildren();
    const width = routeMap.clientWidth;
    const height = routeMap.clientHeight;
    stops.slice(1).forEach((area, index) => {
        const [x, y] = routeMapPoints[stops[index]];
        const [nextX, nextY] = routeMapPoints[area];
        const dx = (nextX - x) * width / 100;
        const dy = (nextY - y) * height / 100;
        const leg = document.createElement('span');
        leg.className = 'daily-map-leg';
        Object.assign(leg.style, {left:x+'%', top:y+'%', width:Math.hypot(dx,dy)+'px', transform:'rotate('+Math.atan2(dy,dx)+'rad)'});
        routeMap.append(leg);
    });
    for (const area of stops) {
        const [x, y] = routeMapPoints[area];
        const pin = document.createElement('span');
        pin.className = 'daily-map-point';
        const label = document.createElement('span');
        label.className = 'daily-map-point-label';
        label.textContent = area === '機場' ? '成田機場' : area;
        const [labelX, labelY, labelWidth] = routeMapLabelPositions[area];
        Object.assign(label.style, {left: labelX + '%', top: labelY + '%', minWidth: labelWidth + '%'});
        routeMap.append(label);
        pin.setAttribute('aria-hidden', 'true');
        Object.assign(pin.style, {left: x + '%', top: y + '%'});
        routeMap.append(pin);
    }
    routePlan.querySelector('.daily-map-stops').replaceChildren(...stops.map(area => {
        const stop = document.createElement('li');
        stop.textContent = area;
        return stop;
    }));
    routePlan.querySelector('.daily-map-empty').hidden = stops.length > 0;
}

routePlan.querySelectorAll('.route-day-date').forEach(button => {
    button.addEventListener('click', () => showRouteMap(button.closest('[data-route-day]').dataset.routeDay));
});
new ResizeObserver(() => showRouteMap(lastRouteDate)).observe(routeMap);
showRouteMap(Object.keys(routeSelections).find(day => /^[0-6]$/.test(day) && routeSelections[day]?.length) || '0');

switchContent('records', false);
restoreCollections();
