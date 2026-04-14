// 🔥 Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// 🔥 Firestore
import { 
  getFirestore, 
  collection, 
  getDocs,
  addDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 Auth
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// 🔥 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCqCOP5w-YcN1fuSnw6AM49YFHMjsHgBE8",
  authDomain: "kindrichman-hanja-game.firebaseapp.com",
  projectId: "kindrichman-hanja-game",
  storageBucket: "kindrichman-hanja-game.firebasestorage.app",
  messagingSenderId: "553963274568",
  appId: "1:553963274568:web:30175f2252d92d5e45b37d",
  measurementId: "G-SEY926YXYM"
};


// 🔥 초기화
const app = initializeApp(firebaseConfig);

// 🔥 Firestore
export const db = getFirestore(app);

// 🔥 Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };


// 🔥 words 불러오기
export async function loadWords() {
  const snapshot = await getDocs(collection(db, "words"));
  return snapshot.docs.map(doc => doc.data());
}


// 🔥 랭킹 저장
export async function saveScore(nickname, score) {
  await addDoc(collection(db, "ranking"), {
    nickname,
    score,
    createdAt: Date.now()
  });
}


// 🔥 랭킹 불러오기
export async function loadRanking() {
  const q = query(
    collection(db, "ranking"),
    orderBy("score", "desc"),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}