// 🔥 Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// 🔥 Firestore
import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  getDocs,
  setDoc,
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

const WORDS_CACHE_KEY = "hanjaWordsCache.v1";
const WORDS_CACHE_TTL = 24 * 60 * 60 * 1000;
const RANKING_CACHE_KEY = "hanjaRankingCache.v1";
const RANKING_CACHE_TTL = 5 * 60 * 1000;

function readWordsCache() {
  try {
    const raw = localStorage.getItem(WORDS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.words)) return null;
    if (Date.now() - cached.savedAt > WORDS_CACHE_TTL) return null;

    return cached.words;
  } catch (err) {
    console.warn("단어 캐시 읽기 실패", err);
    return null;
  }
}

function writeWordsCache(words) {
  try {
    localStorage.setItem(WORDS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      words
    }));
  } catch (err) {
    console.warn("단어 캐시 저장 실패", err);
  }
}

function readRankingCache() {
  try {
    const raw = localStorage.getItem(RANKING_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.ranking)) return null;
    if (Date.now() - cached.savedAt > RANKING_CACHE_TTL) return null;

    return cached.ranking;
  } catch (err) {
    console.warn("랭킹 캐시 읽기 실패", err);
    return null;
  }
}

function writeRankingCache(ranking) {
  try {
    localStorage.setItem(RANKING_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      ranking
    }));
  } catch (err) {
    console.warn("랭킹 캐시 저장 실패", err);
  }
}

function clearRankingCache() {
  try {
    localStorage.removeItem(RANKING_CACHE_KEY);
  } catch (err) {
    console.warn("랭킹 캐시 삭제 실패", err);
  }
}


// 🔥 단어 로드
export async function loadWords() {
  const cachedWords = readWordsCache();
  if (cachedWords) return cachedWords;

  const snapshot = await getDocs(collection(db, "words"));
  const words = snapshot.docs.map(doc => doc.data());
  writeWordsCache(words);
  return words;
}


// 🔥 최고점만 저장 (중복 방지 + 소문자 통일)
export async function saveScore(nickname, score) {

  // 🔥 핵심: 닉네임 정규화
  nickname = nickname.toLowerCase();
  const localBestKey = `hanjaBestScore.${nickname}`;
  const localBest = Number(localStorage.getItem(localBestKey) || 0);

  if (localBest >= score) return false;

  const ref = doc(db, "ranking", nickname);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nickname,
      score,
      updatedAt: Date.now()
    });
    localStorage.setItem(localBestKey, String(score));
    clearRankingCache();
    return true;
  } else {
    const old = snap.data().score;

    if (score > old) {
      await setDoc(ref, {
        nickname,
        score,
        updatedAt: Date.now()
      });
      localStorage.setItem(localBestKey, String(score));
      clearRankingCache();
      return true;
    }

    localStorage.setItem(localBestKey, String(old));
  }

  return false;
}


// 🔥 랭킹 불러오기
export async function loadRanking(forceRefresh = false) {
  if (!forceRefresh) {
    const cachedRanking = readRankingCache();
    if (cachedRanking) return cachedRanking;
  }

  const q = query(
    collection(db, "ranking"),
    orderBy("score", "desc"),
    limit(10)
  );

  const snapshot = await getDocs(q);
  const ranking = snapshot.docs.map(doc => doc.data());
  writeRankingCache(ranking);
  return ranking;
}
