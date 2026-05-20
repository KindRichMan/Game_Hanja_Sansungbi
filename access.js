import { db, ensureFirebase } from "./firebase.js";

const FIRESTORE_BASE_URL = "https://www.gstatic.com/firebasejs/10.12.0";
const ACCESS_COLLECTION = "userRoles";

let firestoreModulePromise = null;

export const ORGANIZATION_ADMIN_EMAILS = Object.freeze([
  "anghks12@gmail.com",
]);

export const WORD_ADMIN_EMAILS = Object.freeze([
  "dolsaen@gmail.com",
]);

export const SUPER_ADMIN_EMAILS = Object.freeze([
  ...ORGANIZATION_ADMIN_EMAILS,
]);

const ROLE_PRESETS = {
  admin: {
    manageWords: true,
    manageUsers: true,
    viewLogs: true,
    accessAdminMenu: true,
  },
  editor: {
    manageWords: true,
    manageUsers: false,
    viewLogs: false,
    accessAdminMenu: true,
  },
  viewer: {
    manageWords: false,
    manageUsers: false,
    viewLogs: false,
    accessAdminMenu: true,
  },
  blocked: {
    manageWords: false,
    manageUsers: false,
    viewLogs: false,
    accessAdminMenu: true,
  },
};

const FEATURE_KEYS = Object.keys(ROLE_PRESETS.admin);

async function loadFirestoreModule() {
  await ensureFirebase();

  if (!firestoreModulePromise) {
    firestoreModulePromise = import(`${FIRESTORE_BASE_URL}/firebase-firestore.js`);
  }

  return firestoreModulePromise;
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return ROLE_PRESETS[role] ? role : "viewer";
}

function normalizePermissions(role, permissions, email) {
  const base = { ...ROLE_PRESETS[normalizeRole(role)] };

  if (ORGANIZATION_ADMIN_EMAILS.includes(normalizeEmail(email))) {
    return { ...ROLE_PRESETS.admin };
  }

  if (WORD_ADMIN_EMAILS.includes(normalizeEmail(email))) {
    return { ...ROLE_PRESETS.editor };
  }

  if (permissions && typeof permissions === "object") {
    FEATURE_KEYS.forEach((key) => {
      if (typeof permissions[key] === "boolean") {
        base[key] = permissions[key];
      }
    });
  }

  if (SUPER_ADMIN_EMAILS.includes(normalizeEmail(email))) {
    return { ...ROLE_PRESETS.admin };
  }

  return base;
}

export function buildAccessRecord(input = {}) {
  const email = normalizeEmail(input.email);
  const role = normalizeRole(input.role);
  const permissions = normalizePermissions(role, input.permissions, email);

  return {
    email,
    displayName: input.displayName || "",
    role,
    permissions,
    note: input.note || "",
    updatedAt: input.updatedAt || null,
    updatedBy: input.updatedBy || "",
  };
}

export function canUseFeature(accessRecord, featureKey) {
  return Boolean(accessRecord?.permissions?.[featureKey]);
}

export function isSuperAdmin(email) {
  return SUPER_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function isOrganizationAdmin(email) {
  return ORGANIZATION_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function isWordManager(email) {
  return WORD_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export async function getAccessRecord(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (isSuperAdmin(normalizedEmail)) {
    return buildAccessRecord({
      email: normalizedEmail,
      role: "admin",
      permissions: ROLE_PRESETS.admin,
    });
  }

  if (isWordManager(normalizedEmail)) {
    return buildAccessRecord({
      email: normalizedEmail,
      role: "editor",
      permissions: ROLE_PRESETS.editor,
    });
  }

  const { collection, doc, getDoc } = await loadFirestoreModule();
  const snap = await getDoc(doc(db, ACCESS_COLLECTION, normalizedEmail));
  if (!snap.exists()) return null;

  return buildAccessRecord({
    email: normalizedEmail,
    ...snap.data(),
  });
}

export async function listAccessRecords() {
  const { collection, getDocs } = await loadFirestoreModule();
  const snap = await getDocs(collection(db, ACCESS_COLLECTION));
  return snap.docs
    .map((entry) => buildAccessRecord({ email: entry.id, ...entry.data() }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function saveAccessRecord(record, actorEmail = "") {
  const normalizedEmail = normalizeEmail(record.email);
  if (!normalizedEmail) {
    throw new Error("email is required");
  }

  const { doc, setDoc } = await loadFirestoreModule();
  const payload = buildAccessRecord({
    ...record,
    email: normalizedEmail,
    updatedAt: Date.now(),
    updatedBy: normalizeEmail(actorEmail),
  });

  await setDoc(doc(db, ACCESS_COLLECTION, normalizedEmail), payload);
  return payload;
}

export async function deleteAccessRecord(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const { doc, deleteDoc } = await loadFirestoreModule();
  await deleteDoc(doc(db, ACCESS_COLLECTION, normalizedEmail));
}
