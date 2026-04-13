// 🔥 Firebase CDN (중요)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCqCOP5w-YcN1fuSnw6AM49YFHMjsHgBE8", // 👉 여기에 넣기
  authDomain: "kindrichman-hanja-game.firebaseapp.com",
  projectId: "kindrichman-hanja-game",
  storageBucket: "kindrichman-hanja-game.firebasestorage.app",
  messagingSenderId: "553963274568",
  appId: "1:553963274568:web:30175f2252d92d5e45b37d",
  measurementId: "G-SEY926YXYM"
};

// 🔥 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// const db = getFirestore(app);

// 🔥 words 불러오기 함수
export async function loadWords() {
  const snapshot = await getDocs(collection(db, "words"));

  return snapshot.docs.map(doc => doc.data());
}