import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEIKF9z7A1UgsfIYainx8C9VI8eq-E1aQ",
  authDomain: "ammar-ammar-85aff.firebaseapp.com",
  projectId: "ammar-ammar-85aff",
  storageBucket: "ammar-ammar-85aff.firebasestorage.app",
  messagingSenderId: "305599034422",
  appId: "1:305599034422:web:ef3cfc8ffb9b63b4651497",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DOC_REF = doc(db, "delivery_v3", "data");

export async function loadFromCloud() {
  try {
    const snap = await getDoc(DOC_REF);
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function saveToCloud(data) {
  try { await setDoc(DOC_REF, data); } catch {}
}

export function subscribeToCloud(callback) {
  return onSnapshot(DOC_REF, snap => {
    if (snap.exists()) callback(snap.data());
  }, () => {});
}
