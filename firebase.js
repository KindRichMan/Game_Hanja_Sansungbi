const firebaseConfig = {
  apiKey: "AIzaSyCqCOP5w-YcN1fuSnw6AM49YFHMjsHgBE8",
  authDomain: "kindrichman-hanja-game.firebaseapp.com",
  projectId: "kindrichman-hanja-game",
  storageBucket: "kindrichman-hanja-game.firebasestorage.app",
  messagingSenderId: "553963274568",
  appId: "1:553963274568:web:30175f2252d92d5e45b37d",
  measurementId: "G-SEY926YXYM",
};

const FIREBASE_BASE_URL = "https://www.gstatic.com/firebasejs/10.12.0";
const WORDS_CACHE_KEY = "hanjaWordsCache.v2";
const WORDS_CACHE_TTL = 24 * 60 * 60 * 1000;
const RANKING_CACHE_KEY = "hanjaRankingCache.v1";
const RANKING_CACHE_TTL = 5 * 60 * 1000;

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;
let firebaseAuthModule = null;
let firestoreDb = null;
let firebaseInitPromise = null;
let firestoreModulePromise = null;
let authModulePromise = null;

export const auth = { currentUser: null };
export const provider = { type: "google" };
export let db = null;

async function loadAppModule() {
  return import(`${FIREBASE_BASE_URL}/firebase-app.js`);
}

async function loadFirestoreModule() {
  if (!firestoreModulePromise) {
    firestoreModulePromise = import(`${FIREBASE_BASE_URL}/firebase-firestore.js`);
  }
  return firestoreModulePromise;
}

async function loadAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import(`${FIREBASE_BASE_URL}/firebase-auth.js`);
  }
  return authModulePromise;
}

export async function ensureFirebase() {
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    const [appModule, firestoreModule, authModule] = await Promise.all([
      loadAppModule(),
      loadFirestoreModule(),
      loadAuthModule(),
    ]);

    if (!firebaseApp) {
      firebaseApp = appModule.initializeApp(firebaseConfig);
      firestoreDb = firestoreModule.getFirestore(firebaseApp);
      db = firestoreDb;
      firebaseAuthModule = authModule;
      firebaseAuth = firebaseAuthModule.getAuth(firebaseApp);
      googleProvider = new firebaseAuthModule.GoogleAuthProvider();

      if (typeof firebaseAuthModule.setPersistence === "function") {
        const persistenceCandidates = [
          firebaseAuthModule.indexedDBLocalPersistence,
          firebaseAuthModule.browserLocalPersistence,
          firebaseAuthModule.browserSessionPersistence,
        ].filter(Boolean);

        for (const persistence of persistenceCandidates) {
          try {
            await firebaseAuthModule.setPersistence(firebaseAuth, persistence);
            break;
          } catch (err) {
            console.warn("firebase auth persistence setup failed", err);
          }
        }
      }

      auth.currentUser = firebaseAuth.currentUser ?? null;

      if (typeof firebaseAuthModule.onAuthStateChanged === "function") {
        firebaseAuthModule.onAuthStateChanged(firebaseAuth, (user) => {
          auth.currentUser = user ?? null;
        });
      }
    }

    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: firebaseAuth,
    };
  })();

  return firebaseInitPromise;
}

export async function getAuthInstance() {
  await ensureFirebase();
  return firebaseAuth;
}

export function signInWithPopupDirect() {
  if (!firebaseAuthModule || !firebaseAuth || !googleProvider) {
    throw new Error("Firebase auth is not ready");
  }

  const result = firebaseAuthModule.signInWithPopup(firebaseAuth, googleProvider);
  result.then((userResult) => {
    auth.currentUser = userResult.user ?? null;
  }).catch(() => {});
  return result;
}

export async function signInWithGoogleCredentialDirect(idToken) {
  if (!firebaseAuthModule || !firebaseAuth || !idToken) {
    throw new Error("Firebase auth is not ready");
  }

  const credential = firebaseAuthModule.GoogleAuthProvider.credential(idToken);
  const result = await firebaseAuthModule.signInWithCredential(firebaseAuth, credential);
  auth.currentUser = result.user ?? null;
  return result;
}

export function signInWithRedirectDirect() {
  if (!firebaseAuthModule || !firebaseAuth || !googleProvider) {
    throw new Error("Firebase auth is not ready");
  }

  return firebaseAuthModule.signInWithRedirect(firebaseAuth, googleProvider);
}

export function getRedirectResultDirect() {
  if (!firebaseAuthModule || !firebaseAuth) {
    throw new Error("Firebase auth is not ready");
  }

  return firebaseAuthModule.getRedirectResult(firebaseAuth).then((result) => {
    auth.currentUser = firebaseAuth.currentUser ?? null;
    return result;
  });
}

async function getFirestoreApi() {
  await ensureFirebase();
  return loadFirestoreModule();
}

function readWordsCache() {
  try {
    const raw = localStorage.getItem(WORDS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.words)) return null;
    if (Date.now() - cached.savedAt > WORDS_CACHE_TTL) return null;

    return cached.words;
  } catch (err) {
    console.warn("words cache read failed", err);
    return null;
  }
}

function writeWordsCache(words) {
  try {
    localStorage.setItem(
      WORDS_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        words,
      }),
    );
  } catch (err) {
    console.warn("words cache write failed", err);
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
    console.warn("ranking cache read failed", err);
    return null;
  }
}

function writeRankingCache(ranking) {
  try {
    localStorage.setItem(
      RANKING_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        ranking,
      }),
    );
  } catch (err) {
    console.warn("ranking cache write failed", err);
  }
}

function clearRankingCache() {
  try {
    localStorage.removeItem(RANKING_CACHE_KEY);
  } catch (err) {
    console.warn("ranking cache clear failed", err);
  }
}

export async function signInWithPopup() {
  await ensureFirebase();
  return signInWithPopupDirect();
}

export async function signInWithRedirect() {
  await ensureFirebase();
  return signInWithRedirectDirect();
}

export async function getRedirectResult() {
  await ensureFirebase();
  return getRedirectResultDirect();
}

export async function loadWords() {
  const cachedWords = readWordsCache();
  if (cachedWords) return cachedWords;

  const { collection, getDocs } = await getFirestoreApi();
  const snapshot = await getDocs(collection(db, "words"));
  const words = snapshot.docs.map((entry) => entry.data());
  writeWordsCache(words);
  return words;
}

export async function saveScore(nickname, score) {
  await ensureFirebase();
  const { doc, getDoc, setDoc } = await getFirestoreApi();

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
      updatedAt: Date.now(),
    });
    localStorage.setItem(localBestKey, String(score));
    clearRankingCache();
    return true;
  }

  const old = snap.data().score;
  if (score > old) {
    await setDoc(ref, {
      nickname,
      score,
      updatedAt: Date.now(),
    });
    localStorage.setItem(localBestKey, String(score));
    clearRankingCache();
    return true;
  }

  localStorage.setItem(localBestKey, String(old));
  return false;
}

export async function loadRanking(forceRefresh = false) {
  if (!forceRefresh) {
    const cachedRanking = readRankingCache();
    if (cachedRanking) return cachedRanking;
  }

  const { collection, getDocs, limit, orderBy, query } = await getFirestoreApi();
  const rankingQuery = query(
    collection(db, "ranking"),
    orderBy("score", "desc"),
    limit(10),
  );

  const snapshot = await getDocs(rankingQuery);
  const ranking = snapshot.docs.map((entry) => entry.data());
  writeRankingCache(ranking);
  return ranking;
}
