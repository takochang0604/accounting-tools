import { auth } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

/** 將使用者自訂帳號轉成 Firebase 可接受的 email 格式 */
export const toEmail = (username) =>
  `${username.trim().toLowerCase()}@splitool.app`;

/** 從 Firebase email 取回顯示用帳號名稱 */
export const toUsername = (email) =>
  email ? email.replace(/@splitool\.app$/, '') : '';

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

export const register = (username, password) =>
  createUserWithEmailAndPassword(auth, toEmail(username), password);

export const login = (username, password) =>
  signInWithEmailAndPassword(auth, toEmail(username), password);

export const logout = () => signOut(auth);

export async function changePassword(user, currentPassword, newPassword) {
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
