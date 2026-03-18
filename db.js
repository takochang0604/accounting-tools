import { db } from './firebase-config.js';
import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, onSnapshot, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Path helpers
const subsCol = (uid) => collection(db, 'users', uid, 'subscriptions');
const subDoc  = (uid, id) => doc(db, 'users', uid, 'subscriptions', id);

/**
 * Real-time subscription listener.
 * Returns an unsubscribe function.
 */
export function listenSubscriptions(uid, callback) {
  // order 欄位存在時依 order asc 排，否則 createdAt desc（新資料）
  const q = query(subsCol(uid), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => {
    // Fallback: order index 不存在時改用 createdAt
    const q2 = query(subsCol(uid), orderBy('createdAt', 'desc'));
    onSnapshot(q2, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  });
}

export async function addSubscription(uid, data, order = 0) {
  return addDoc(subsCol(uid), {
    ...data,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Batch-update order field for all subscriptions after drag-reorder.
 * @param {string} uid
 * @param {Array<{id:string}>} orderedSubs - subscriptions in new order
 */
export async function reorderSubscriptions(uid, orderedSubs) {
  const batch = writeBatch(db);
  orderedSubs.forEach((sub, idx) => {
    batch.update(subDoc(uid, sub.id), { order: idx, updatedAt: serverTimestamp() });
  });
  return batch.commit();
}

export async function updateSubscription(uid, subId, data) {
  return updateDoc(subDoc(uid, subId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubscription(uid, subId) {
  return deleteDoc(subDoc(uid, subId));
}
