import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBAc8rrFgqOSmrImCZU8vPzJeKIaTTftj4",
  authDomain:        "memorandum-3abaa.firebaseapp.com",
  projectId:         "memorandum-3abaa",
  storageBucket:     "memorandum-3abaa.firebasestorage.app",
  messagingSenderId: "339882662542",
  appId:             "1:339882662542:web:a01cd406296720318c07df",
  measurementId:     "G-MW4W68Y6KT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
