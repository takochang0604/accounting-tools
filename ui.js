import { PLATFORMS, CURRENCIES, CURRENCY_SYMBOLS, MONTHS } from './constants.js';

const CUSTOM_EMOJIS = [
  '🎥','📺','🎮','🎧','🎵','🎶','🎤','📻',
  '💻','📱','🖥️','☁️','🌐','📡','💡','🔧',
  '📦','🛡️','🔑','💰','🎁','📚','🏠','✈️',
  '🎯','🏆','⭐','❤️','🦁','🐉','🌈','✨',
];

// ── Utilities ─────────────────────────────────────────────────────────────────

export const h = (s) =>
  String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export function fmtAmount(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(amount);
  const formatted = currency === 'JPY'
    ? num.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
    : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sym}${formatted}`;
}

export function getPlatform(platformId) {
  return PLATFORMS.find((p) => p.id === platformId) || null;
}

export function billingLabel(sub) {
  if (sub.billingCycle === 'monthly') {
    return `每月 ${sub.billingDay} 日`;
  }
  return `每年 ${sub.billingMonth} 月 ${sub.billingDay} 日`;
}

// ── Page switching ─────────────────────────────────────────────────────────────

export function showPage(pageId) {
  document.querySelectorAll('.page').forEach((el) => el.classList.add('hidden'));
  document.getElementById(pageId)?.classList.remove('hidden');
}

export function setUserEmail(email) {
  const el = document.getElementById('user-email');
  if (el) el.textContent = email;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function showToast(msg, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ── Dashboard Grid ─────────────────────────────────────────────────────────────

export function renderGrid(subs) {
  const grid  = document.getElementById('subscriptions-grid');
  const empty = document.getElementById('empty-state');
  if (!grid) return;

  if (!subs.length) {
    grid.innerHTML  = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = subs.map((sub) => cardHTML(sub)).join('');
}

function cardHTML(sub) {
  const plat    = getPlatform(sub.platformId);
  const color   = plat ? plat.color : '#6366f1';
  const emoji   = sub.emoji || (plat ? plat.emoji : '📦');
  const members = sub.members || [];
  const paidCount = members.filter((m) => m.paid).length;
  const totalCount = members.length;
  const allPaid   = totalCount > 0 && paidCount === totalCount;
  const cycleBadge = sub.billingCycle === 'monthly' ? '月費' : '年費';

  const memberPreview = members.slice(0, 3).map((m) =>
    `<span class="member-dot ${m.paid ? 'paid' : 'unpaid'}" title="${h(m.name)}"></span>`
  ).join('') + (members.length > 3 ? `<span class="member-more">+${members.length - 3}</span>` : '');

  return `
  <div class="sub-card" data-id="${h(sub.id)}" style="--platform-color:${color}">
    <div class="card-accent"></div>
    <div class="card-body">
      <div class="card-top">
        <span class="card-emoji">${emoji}</span>
        <div class="card-badges">
          <span class="badge badge-cycle">${cycleBadge}</span>
          ${allPaid && totalCount > 0 ? '<span class="badge badge-paid">全額收齊</span>' : ''}
        </div>
      </div>
      <div class="card-name">${h(sub.platform)}</div>
      <div class="card-amount">${fmtAmount(sub.totalAmount, sub.currency)}</div>
      <div class="card-billing">${billingLabel(sub)}</div>

      <div class="card-footer">
        <div class="card-members">
          ${memberPreview}
          ${totalCount > 0 ? `<span class="member-status ${allPaid ? 'all-paid' : ''}">${paidCount}/${totalCount} 已付</span>` : '<span class="member-status no-members">無成員</span>'}
        </div>
        <div class="card-actions">
          <button class="icon-btn edit-btn" data-id="${h(sub.id)}" title="編輯">✏️</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

export function openDetailModal(sub) {
  const modal = document.getElementById('detail-modal');
  const body  = document.getElementById('detail-body');
  const title = document.getElementById('detail-title');
  if (!modal || !body || !title) return;

  const plat  = getPlatform(sub.platformId);
  const emoji = sub.emoji || (plat ? plat.emoji : '📦');
  const color = plat ? plat.color : '#6366f1';
  const members = sub.members || [];
  const paidCount = members.filter((m) => m.paid).length;
  const paidTotal = members.filter((m) => m.paid).reduce((s, m) => s + (m.amount || 0), 0);

  title.innerHTML = `<span style="margin-right:.4rem">${emoji}</span>${h(sub.platform)}`;

  body.innerHTML = `
    <div class="detail-meta">
      <div class="detail-meta-item">
        <span class="meta-label">費用</span>
        <span class="meta-value">${fmtAmount(sub.totalAmount, sub.currency)}</span>
      </div>
      <div class="detail-meta-item">
        <span class="meta-label">週期</span>
        <span class="meta-value">${sub.billingCycle === 'monthly' ? '月費' : '年費'}</span>
      </div>
      <div class="detail-meta-item">
        <span class="meta-label">扣款日</span>
        <span class="meta-value">${billingLabel(sub)}</span>
      </div>
      <div class="detail-meta-item">
        <span class="meta-label">幣別</span>
        <span class="meta-value">${h(sub.currency)}</span>
      </div>
    </div>
    ${sub.note ? `<div class="detail-note">📝 ${h(sub.note)}</div>` : ''}

    <div class="detail-section-header">
      <span>分攤成員</span>
      <span class="detail-paid-summary">${paidCount}/${members.length} 已付款 · 已收 ${fmtAmount(paidTotal, sub.currency)}</span>
    </div>

    <div class="member-list" id="detail-member-list">
      ${members.length === 0 ? '<p class="no-content">尚未新增成員</p>' :
        members.map((m) => `
          <div class="member-row detail-member ${m.paid ? 'is-paid' : ''}" data-member-id="${h(m.id)}">
            <span class="member-paid-icon">${m.paid ? '✅' : '⬜'}</span>
            <span class="member-name">${h(m.name)}</span>
            <span class="member-amount">${fmtAmount(m.amount, sub.currency)}</span>
            <span class="member-toggle-hint">${m.paid ? '點擊取消付款' : '點擊標記付款'}</span>
          </div>`).join('')}
    </div>

    <div class="detail-actions">
      <button class="btn btn-ghost btn-sm" id="detail-edit-btn">✏️ 編輯</button>
      <button class="btn btn-danger btn-sm" id="detail-delete-btn">🗑️ 刪除訂閱</button>
    </div>
  `;

  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('open'));
}

export function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  modal?.classList.remove('open');
  setTimeout(() => modal?.classList.add('hidden'), 250);
}

// ── Form Modal ────────────────────────────────────────────────────────────────

let _formMembers = [];
let _formCycle   = 'monthly';
let _formPlatId  = null;
let _formCustomEmoji = '\u2728';

export function getFormMembers() { return _formMembers; }
export function getFormCycle()   { return _formCycle; }
export function getFormPlatId()  { return _formPlatId; }

export function openFormModal(sub = null) {
  _formMembers = sub ? JSON.parse(JSON.stringify(sub.members || [])) : [];
  _formCycle   = sub ? (sub.billingCycle || 'monthly') : 'monthly';
  _formPlatId  = sub ? (sub.platformId || null) : null;
  _formCustomEmoji = (sub && sub.platformId === 'custom' && sub.emoji) ? sub.emoji : '\u2728';

  const modal = document.getElementById('form-modal');
  const title = document.getElementById('form-modal-title');
  if (!modal || !title) return;

  title.textContent = sub ? '編輯訂閱' : '新增訂閱';

  // Platform grid
  const pgrid = document.getElementById('platform-grid');
  if (pgrid) {
    pgrid.innerHTML = PLATFORMS.map((p) => `
      <button type="button" class="plat-btn ${_formPlatId === p.id ? 'selected' : ''}"
        data-plat="${p.id}" style="--pc:${p.color}">
        <span>${p.emoji}</span>
        <span>${p.name}</span>
      </button>`).join('') + `
      <button type="button" class="plat-btn ${_formPlatId === 'custom' ? 'selected' : ''}"
        data-plat="custom" style="--pc:#6366f1">
        <span>✨</span><span>自訂</span>
      </button>`;
  }

  // Currency
  const curSel = document.getElementById('currency');
  if (curSel) {
    curSel.innerHTML = CURRENCIES.map((c) =>
      `<option value="${c}" ${sub?.currency === c ? 'selected' : ''}>${c}</option>`).join('');
  }

  // Fill fields
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('total-amount',   sub?.totalAmount);
  set('billing-day',    sub?.billingDay);
  set('billing-month',  sub?.billingMonth || 1);
  set('sub-note',       sub?.note);

  const customNameInp = document.getElementById('custom-platform-name');
  if (customNameInp) {
    customNameInp.value = _formPlatId === 'custom' ? (sub?.platform || '') : '';
    customNameInp.classList.toggle('hidden', _formPlatId !== 'custom');
  }

  // Emoji picker
  populateEmojiPicker(_formPlatId === 'custom', _formCustomEmoji);

  // Cycle buttons
  updateCycleUI();

  // Members
  renderFormMembers();

  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('open'));
}

export function closeFormModal() {
  const modal = document.getElementById('form-modal');
  modal?.classList.remove('open');
  setTimeout(() => modal?.classList.add('hidden'), 250);
}

function updateCycleUI() {
  document.querySelectorAll('.cycle-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cycle === _formCycle);
  });
  const monthGroup = document.getElementById('billing-month-group');
  if (monthGroup) monthGroup.classList.toggle('hidden', _formCycle !== 'yearly');
}

export function setFormCycle(cycle) {
  _formCycle = cycle;
  updateCycleUI();
}

export function selectPlatform(platId) {
  _formPlatId = platId;
  document.querySelectorAll('.plat-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.plat === platId);
  });
  const customNameInp = document.getElementById('custom-platform-name');
  if (customNameInp) customNameInp.classList.toggle('hidden', platId !== 'custom');
  populateEmojiPicker(platId === 'custom', _formCustomEmoji);
}

function populateEmojiPicker(show, selectedEmoji) {
  const picker = document.getElementById('custom-emoji-picker');
  if (!picker) return;
  picker.classList.toggle('hidden', !show);
  if (!show) return;
  picker.innerHTML = CUSTOM_EMOJIS.map((em) =>
    `<button type="button" class="emoji-pick-btn ${em === selectedEmoji ? 'active' : ''}" data-emoji="${em}">${em}</button>`
  ).join('');
}

export function selectCustomEmoji(emoji) {
  _formCustomEmoji = emoji;
  document.querySelectorAll('.emoji-pick-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.emoji === emoji);
  });
}

function renderFormMembers() {
  const list = document.getElementById('member-list');
  if (!list) return;
  if (_formMembers.length === 0) {
    list.innerHTML = '<p class="no-members-hint">尚未新增成員，點擊下方按鈕新增</p>';
    return;
  }
  list.innerHTML = _formMembers.map((m, i) => `
    <div class="form-member-row" data-idx="${i}">
      <input class="form-control member-name-inp" type="text" placeholder="成員姓名"
        value="${h(m.name)}" data-idx="${i}" data-field="name">
      <input class="form-control member-amt-inp" type="number" placeholder="0" min="0" step="0.01"
        value="${m.amount ?? ''}" data-idx="${i}" data-field="amount">
      <button type="button" class="icon-btn remove-member-btn" data-idx="${i}" title="移除">✕</button>
    </div>`).join('');
}

export function addFormMember() {
  _formMembers.push({ id: genId(), name: '', amount: 0, paid: false, paidAt: null });
  renderFormMembers();
}

export function removeFormMember(idx) {
  _formMembers.splice(idx, 1);
  renderFormMembers();
}

export function syncMemberField(idx, field, value) {
  if (!_formMembers[idx]) return;
  _formMembers[idx][field] = field === 'amount' ? (parseFloat(value) || 0) : value;
}

export function autoSplit() {
  const totalEl = document.getElementById('total-amount');
  const total   = parseFloat(totalEl?.value) || 0;
  const count   = _formMembers.length;
  if (!count) return;
  const share = Math.round((total / count) * 100) / 100;
  _formMembers.forEach((m, i) => {
    m.amount = i === count - 1 ? Math.round((total - share * (count - 1)) * 100) / 100 : share;
  });
  renderFormMembers();
}

export function getFormData() {
  const platId = _formPlatId;
  const plat   = getPlatform(platId);
  const platName = platId === 'custom'
    ? (document.getElementById('custom-platform-name')?.value.trim() || '自訂')
    : (plat?.name || '');
  const emoji  = platId === 'custom' ? _formCustomEmoji : (plat ? plat.emoji : '✨');
  const color  = plat ? plat.color : '#6366f1';

  return {
    platformId:   platId,
    platform:     platName,
    emoji,
    color,
    totalAmount:  parseFloat(document.getElementById('total-amount')?.value) || 0,
    currency:     document.getElementById('currency')?.value || 'TWD',
    billingCycle: _formCycle,
    billingDay:   parseInt(document.getElementById('billing-day')?.value) || 1,
    billingMonth: _formCycle === 'yearly'
      ? (parseInt(document.getElementById('billing-month')?.value) || 1)
      : null,
    note:         document.getElementById('sub-note')?.value.trim() || '',
    members:      JSON.parse(JSON.stringify(_formMembers)),
  };
}

export function validateForm(data) {
  if (!data.platformId) return '請選擇平台';
  if (data.platformId === 'custom' && !data.platform) return '請輸入自訂平台名稱';
  if (!data.totalAmount || data.totalAmount <= 0) return '請輸入有效的費用';
  if (!data.billingDay || data.billingDay < 1 || data.billingDay > 31) return '請輸入有效的扣款日（1-31）';
  const memberTotal = data.members.reduce((s, m) => s + (m.amount || 0), 0);
  if (data.members.length > 0) {
    const diff = Math.abs(memberTotal - data.totalAmount);
    if (diff > 0.1) return `成員金額合計（${fmtAmount(memberTotal, data.currency)}）不等於總費用，請確認或使用平均分攤`;
  }
  return null;
}

export function setFormSaving(saving) {
  const btn = document.getElementById('save-sub-btn');
  if (!btn) return;
  btn.disabled = saving;
  btn.textContent = saving ? '儲存中…' : '儲存';
}
