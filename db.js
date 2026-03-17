import { db } from './firebase-config.js';
import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Path helpers
const subsCol = (uid) => collection(db, 'users', uid, 'subscriptions');
const subDoc  = (uid, id) => doc(db, 'users', uid, 'subscriptions', id);

/**
 * Real-time subscription listener.
 * Returns an unsubscribe function.
 */
export function listenSubscriptions(uid, callback) {
  const q = query(subsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addSubscription(uid, data) {
  return addDoc(subsCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
