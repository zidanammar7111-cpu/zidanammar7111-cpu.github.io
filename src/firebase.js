// ============================================================
// Firebase initialization + Firestore + Authentication helpers
// ============================================================
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEIKF9z7A1UgsfIYainx8C9VI8eq-E1aQ",
  authDomain: "ammar-ammar-85aff.firebaseapp.com",
  projectId: "ammar-ammar-85aff",
  storageBucket: "ammar-ammar-85aff.firebasestorage.app",
  messagingSenderId: "305599034422",
  appId: "1:305599034422:web:ef3cfc8ffb9b63b4651497",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// كل بيانات التطبيق محفوظة بمستند واحد، عشان التحديثات اللحظية تكون بسيطة وسريعة
const DOC_REF = doc(db, "app", "data");

export async function loadDataOnce() {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.error("فشل تحميل البيانات", e);
  }
  return null;
}

export async function saveData(data) {
  try {
    await setDoc(DOC_REF, data);
  } catch (e) {
    console.error("فشل الحفظ", e);
    throw e;
  }
}

// تستمع لأي تغيير يصير على البيانات (من أي جهاز) وتستدعي callback فوراً
export function subscribeToData(callback) {
  return onSnapshot(
    DOC_REF,
    (snap) => {
      if (snap.exists()) callback(snap.data());
    },
    (error) => {
      console.error("خطأ بالمزامنة اللحظية", error);
    }
  );
}

/* ============================================================
   دوال المصادقة (Authentication) — تسجيل دخول حقيقي بالبريد الإلكتروني
   ============================================================ */

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// تستمع لحالة تسجيل الدخول (هل في مستخدم مسجل دخول أم لا) وتستدعي callback
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
