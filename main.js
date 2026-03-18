import { onAuthChange, register, login, logout, toUsername, changePassword } from './auth.js';
import {
  listenSubscriptions, addSubscription,
  updateSubscription, deleteSubscription, reorderSubscriptions,
} from './db.js';
import { hitCounter } from './counter.js';
import {
  showPage, setUserEmail, showToast, renderGrid,
  openFormModal, closeFormModal, openDetailModal, closeDetailModal,
  addFormMember, removeFormMember, syncMemberField, autoSplit,
  setFormCycle, selectPlatform, selectCustomEmoji, getFormData, validateForm,
  setFormSaving, getFormMembers, setOnReorder,
} from './ui.js';
import { MONTHS } from './constants.js';

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  user:          null,
  subscriptions: [],
  editingSubId:  null,
  detailSubId:   null,
  unsubListener: null,
};

// ── Drag Reorder Callback ───────────────────────────────────────────────────
setOnReorder(async (newIdOrder) => {
  if (!state.user) return;
  // Map ordered IDs -> subscription objects
  const orderedSubs = newIdOrder
    .map((id) => state.subscriptions.find((s) => s.id === id))
    .filter(Boolean);
  if (orderedSubs.length === 0) return;
  try {
    await reorderSubscriptions(state.user.uid, orderedSubs);
  } catch (err) {
    console.error('Reorder failed', err);
    showToast('排序儲存失敗，請再試一次', 'error');
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthChange(async (user) => {
  state.user = user;
  if (user) {
    const usernameEl = document.getElementById('user-username');
    if (usernameEl) usernameEl.textContent = toUsername(user.email);
    showPage('app-page');
    startListening();

    // Hit counter — increment (global, shared across all users) and update both elements
    const count = await hitCounter();
    const displayVal = count !== null ? count.toLocaleString() : '—';
    const el = document.getElementById('pageview-count');
    if (el) el.textContent = displayVal;

  } else {
    stopListening();
    showPage('auth-page');
  }
});


function startListening() {
  if (state.unsubListener) state.unsubListener();
  state.unsubListener = listenSubscriptions(state.user.uid, (subs) => {
    state.subscriptions = subs;
    renderGrid(subs);

    // Update dashboard count
    const countEl = document.getElementById('dashboard-count');
    if (countEl) {
      const monthly = subs.filter((s) => s.billingCycle === 'monthly').length;
      const yearly  = subs.filter((s) => s.billingCycle === 'yearly').length;
      countEl.textContent = subs.length
        ? `共 ${subs.length} 個訂閱．月費 ${monthly} 個・年費 ${yearly} 個`
        : '';
    }

    // If detail modal is open, refresh it
    if (state.detailSubId) {
      const updated = subs.find((s) => s.id === state.detailSubId);
      if (updated) openDetailModal(updated);
      else closeDetailModal();
    }
  });
}

function stopListening() {
  if (state.unsubListener) { state.unsubListener(); state.unsubListener = null; }
  state.subscriptions = [];
  state.detailSubId   = null;
  state.editingSubId  = null;
}

// ── Auth Form ─────────────────────────────────────────────────────────────────
let authMode = 'login';

document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const confirmWrap = document.getElementById('auth-confirm-wrap');
    const submitBtn   = document.getElementById('auth-submit');
    if (confirmWrap) confirmWrap.classList.toggle('hidden', authMode !== 'register');
    if (submitBtn)   submitBtn.textContent = authMode === 'login' ? '登入' : '註冊';
    clearAuthError();
  });
});

document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAuthError();
  const username = document.getElementById('auth-username')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const confirm  = document.getElementById('auth-confirm')?.value;

  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    showAuthError('帳號只能使用英文、數字或底線，長度 2-20 字元');
    return;
  }
  if (authMode === 'register' && password !== confirm) {
    showAuthError('兩次輸入的密碼不一致');
    return;
  }
  if (password.length < 6) {
    showAuthError('密碼至少需要 6 個字元');
    return;
  }

  const btn = document.getElementById('auth-submit');
  if (btn) { btn.disabled = true; btn.textContent = '處理中…'; }

  try {
    if (authMode === 'login') {
      await login(username, password);
    } else {
      await register(username, password);
    }
  } catch (err) {
    showAuthError(friendlyAuthError(err.code));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = authMode === 'login' ? '登入' : '註冊';
    }
  }
});

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':       '找不到此帳號',
    'auth/wrong-password':       '密碼錯誤',
    'auth/invalid-credential':   '帳號或密碼錯誤',
    'auth/email-already-in-use': '此 Email 已被註冊',
    'auth/invalid-email':        '請輸入有效的 Email',
    'auth/too-many-requests':    '嘗試次數過多，請稍後再試',
  };
  return map[code] || `登入失敗（${code}）`;
}

// ── Logout ─────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await logout();
});

// ── Eye / Show-Password Toggle (global delegated) ──────────────────────────────
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.eye-btn');
  if (!btn) return;
  const targetId = btn.dataset.target;
  const inp = document.getElementById(targetId);
  if (!inp) return;
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '\u{1F441}' : '\u{1F576}';
});

// ── Change Password Modal ───────────────────────────────────────────────────────
document.getElementById('change-pw-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('chpw-modal');
  ['chpw-current','chpw-new','chpw-confirm'].forEach((id) => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const errEl = document.getElementById('chpw-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
  modal?.classList.remove('hidden');
  requestAnimationFrame(() => modal?.classList.add('open'));
});

function closeChpwModal() {
  const modal = document.getElementById('chpw-modal');
  modal?.classList.remove('open');
  setTimeout(() => modal?.classList.add('hidden'), 250);
}

document.getElementById('chpw-modal')?.addEventListener('click', (e) => {
  if (e.target.closest('.modal-backdrop') || e.target.closest('.modal-close') ||
      e.target.closest('#chpw-cancel')) { closeChpwModal(); }
});

document.getElementById('chpw-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('chpw-error');
  const hide  = () => { if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); } };
  const show  = (msg) => { if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); } };
  hide();

  const current = document.getElementById('chpw-current')?.value;
  const newPw   = document.getElementById('chpw-new')?.value;
  const confirm = document.getElementById('chpw-confirm')?.value;

  if (newPw.length < 6) { show('新密碼至少需要 6 個字元'); return; }
  if (newPw !== confirm) { show('兩次輸入的新密碼不一致'); return; }

  const btn = document.getElementById('chpw-submit');
  if (btn) { btn.disabled = true; btn.textContent = '更新中…'; }
  try {
    await changePassword(state.user, current, newPw);
    closeChpwModal();
    showToast('密碼已成功更新！', 'success');
  } catch (err) {
    const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
      ? '目前密碼輸入錯誤' : `更新失敗（${err.code}）`;
    show(msg);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '確認更改'; }
  }
});

// ── Add Subscription Button ────────────────────────────────────────────────────
document.getElementById('add-sub-btn')?.addEventListener('click', () => {
  state.editingSubId = null;
  openFormModal(null);
});

// ── Subscription Grid (delegated) ─────────────────────────────────────────────
document.getElementById('subscriptions-grid')?.addEventListener('click', (e) => {

  const card    = e.target.closest('.sub-card');
  const editBtn = e.target.closest('.edit-btn');
  if (!card) return;
  const subId = card.dataset.id;
  const sub   = state.subscriptions.find((s) => s.id === subId);
  if (!sub) return;

  if (editBtn) {
    e.stopPropagation();
    state.editingSubId = subId;
    openFormModal(sub);
  } else {
    state.detailSubId = subId;
    openDetailModal(sub);
  }
});

// ── Detail Modal Actions (delegated) ──────────────────────────────────────────
document.getElementById('detail-modal')?.addEventListener('click', async (e) => {
  // Close backdrop
  if (e.target.closest('.modal-backdrop')) { closeDetailModal(); state.detailSubId = null; return; }
  if (e.target.closest('.modal-close'))    { closeDetailModal(); state.detailSubId = null; return; }

  // Edit button
  if (e.target.closest('#detail-edit-btn')) {
    const sub = state.subscriptions.find((s) => s.id === state.detailSubId);
    if (!sub) return;
    closeDetailModal();
    state.editingSubId = sub.id;
    openFormModal(sub);
    return;
  }

  // Delete button
  if (e.target.closest('#detail-delete-btn')) {
    if (!confirm('確定要刪除這個訂閱嗎？此操作無法復原。')) return;
    try {
      await deleteSubscription(state.user.uid, state.detailSubId);
      closeDetailModal();
      state.detailSubId = null;
      showToast('已刪除訂閱', 'success');
    } catch { showToast('刪除失敗，請再試一次', 'error'); }
    return;
  }

  // Member paid toggle
  const memberRow = e.target.closest('.detail-member');
  if (memberRow && state.detailSubId) {
    const memberId = memberRow.dataset.memberId;
    const sub = state.subscriptions.find((s) => s.id === state.detailSubId);
    if (!sub) return;
    const members = JSON.parse(JSON.stringify(sub.members || []));
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    m.paid  = !m.paid;
    m.paidAt = m.paid ? new Date().toISOString() : null;
    try {
      await updateSubscription(state.user.uid, state.detailSubId, { members });
    } catch { showToast('更新失敗', 'error'); }
  }
});

// ── Form Modal ─────────────────────────────────────────────────────────────────
document.getElementById('form-modal')?.addEventListener('click', (e) => {
  if (e.target.closest('.modal-backdrop')) { closeFormModal(); return; }
  if (e.target.closest('.modal-close'))    { closeFormModal(); return; }
  if (e.target.closest('#cancel-form-btn')){ closeFormModal(); return; }

  // Platform selection
  const platBtn = e.target.closest('.plat-btn');
  if (platBtn) { selectPlatform(platBtn.dataset.plat); return; }

  // Cycle toggle
  const cycleBtn = e.target.closest('.cycle-btn');
  if (cycleBtn) { setFormCycle(cycleBtn.dataset.cycle); return; }

  // Add member
  if (e.target.closest('#add-member-btn')) { addFormMember(); return; }

  // Remove member
  const removeBtn = e.target.closest('.remove-member-btn');
  if (removeBtn) { removeFormMember(parseInt(removeBtn.dataset.idx)); return; }

  // Auto split
  if (e.target.closest('#auto-split-btn')) { autoSplit(); return; }

  // Custom emoji selection
  const emojiBtn = e.target.closest('.emoji-pick-btn');
  if (emojiBtn) { selectCustomEmoji(emojiBtn.dataset.emoji); return; }
});

// Member field input sync — delegated on stable ancestor (form-modal)
document.getElementById('form-modal')?.addEventListener('input', (e) => {
  const inp  = e.target;
  const idx  = parseInt(inp.dataset.idx);
  const field = inp.dataset.field;
  if (!isNaN(idx) && field) syncMemberField(idx, field, inp.value);
});

// Form submit
document.getElementById('sub-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = getFormData();
  const err  = validateForm(data);
  if (err) { showToast(err, 'error'); return; }

  setFormSaving(true);
  try {
    if (state.editingSubId) {
      await updateSubscription(state.user.uid, state.editingSubId, data);
      showToast('已更新訂閱！', 'success');
    } else {
      await addSubscription(state.user.uid, data);
      showToast('已新增訂閱！', 'success');
    }
    closeFormModal();
    state.editingSubId = null;
  } catch (err2) {
    showToast('儲存失敗，請再試一次', 'error');
    console.error(err2);
  } finally {
    setFormSaving(false);
  }
});

// Populate billing month select on load
(function populateBillingMonth() {
  const sel = document.getElementById('billing-month');
  if (!sel) return;
  sel.innerHTML = MONTHS.map((m, i) =>
    `<option value="${i + 1}">${m}</option>`).join('');
})();

