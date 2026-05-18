import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

const LOCAL_STORAGE_KEY = "webdev-project-management-state";
const FIRESTORE_TIMEOUT_MS = 8000;
const COLLECTION_META_DOC_ID = "_collection_meta";
const COLLECTIONS = {
  projects: "projects",
  appUsers: "app_users",
  teamMembers: "team_members",
  logs: "logs",
  workspaceMeta: "workspace_meta",
  templates: "templates",
};
const WORKSPACE_META_ID = "global";
const TEMPLATE_DOC_ID = "base_timeline_template";

function createStateEnvelope(state, updatedAt = new Date().toISOString()) {
  return {
    ...state,
    __meta: {
      updatedAt,
    },
  };
}

function getStateUpdatedAt(state) {
  return String(state?.__meta?.updatedAt || "");
}

function normalizePersistedState(payload, defaultState) {
  return {
    projects: Array.isArray(payload?.projects) ? payload.projects : defaultState.projects,
    appUsers: Array.isArray(payload?.appUsers) ? payload.appUsers : defaultState.appUsers,
    teamMembers: Array.isArray(payload?.teamMembers)
      ? payload.teamMembers
      : defaultState.teamMembers,
    logs: Array.isArray(payload?.logs) ? payload.logs : defaultState.logs,
    template:
      payload?.template &&
      Array.isArray(payload.template.data) &&
      Array.isArray(payload.template.links)
        ? payload.template
        : defaultState.template,
    __meta: {
      updatedAt: getStateUpdatedAt(payload),
    },
  };
}

function sanitizeForFirestore(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      const sanitizedValue = sanitizeForFirestore(nestedValue);
      if (sanitizedValue !== undefined) {
        accumulator[key] = sanitizedValue;
      }
      return accumulator;
    }, {});
  }

  return value === undefined ? undefined : value;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = window.setTimeout(
        () => reject(new Error(timeoutMessage)),
        timeoutMs
      );

      promise.finally(() => window.clearTimeout(timeoutId));
    }),
  ]);
}

async function syncCollection(batch, collectionName, nextItems) {
  const collectionRef = collection(firebaseDb, collectionName);
  const snapshot = await getDocs(collectionRef);
  const nextMap = new Map(nextItems.map((item) => [String(item.id), item]));

  snapshot.docs.forEach((existingDoc) => {
    if (existingDoc.id !== COLLECTION_META_DOC_ID && !nextMap.has(existingDoc.id)) {
      batch.delete(existingDoc.ref);
    }
  });

  batch.set(
    doc(firebaseDb, collectionName, COLLECTION_META_DOC_ID),
    {
      kind: "collection_meta",
      collection: collectionName,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  nextItems.forEach((item) => {
    const itemRef = doc(firebaseDb, collectionName, String(item.id));
    batch.set(itemRef, sanitizeForFirestore(item), { merge: true });
  });
}

export function readLocalAppState(defaultState) {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    return normalizePersistedState(parsed, defaultState);
  } catch {
    return defaultState;
  }
}

export function writeLocalAppState(state) {
  if (typeof window === "undefined") {
    return;
  }

  const updatedAt = getStateUpdatedAt(state) || new Date().toISOString();
  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(createStateEnvelope(state, updatedAt))
  );
}

export async function loadSharedAppState(defaultState) {
  const localState = readLocalAppState(defaultState);

  if (!firebaseDb) {
    return localState;
  }

  try {
    const [
      workspaceMetaSnapshot,
      projectsSnapshot,
      appUsersSnapshot,
      teamMembersSnapshot,
      logsSnapshot,
      templateSnapshot,
    ] = await withTimeout(
      Promise.all([
        getDoc(doc(firebaseDb, COLLECTIONS.workspaceMeta, WORKSPACE_META_ID)),
        getDocs(collection(firebaseDb, COLLECTIONS.projects)),
        getDocs(collection(firebaseDb, COLLECTIONS.appUsers)),
        getDocs(collection(firebaseDb, COLLECTIONS.teamMembers)),
        getDocs(collection(firebaseDb, COLLECTIONS.logs)),
        getDoc(doc(firebaseDb, COLLECTIONS.templates, TEMPLATE_DOC_ID)),
      ]),
      FIRESTORE_TIMEOUT_MS,
      "Firestore took too long to respond. Loaded local workspace data instead."
    );

    const remoteState = normalizePersistedState(
      {
        projects: projectsSnapshot.docs.map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        })).filter((item) => item.id !== COLLECTION_META_DOC_ID),
        appUsers: appUsersSnapshot.docs.map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        })).filter((item) => item.id !== COLLECTION_META_DOC_ID),
        teamMembers: teamMembersSnapshot.docs.map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        })).filter((item) => item.id !== COLLECTION_META_DOC_ID),
        logs: logsSnapshot.docs.map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        })).filter((item) => item.id !== COLLECTION_META_DOC_ID),
        template: templateSnapshot.exists()
          ? templateSnapshot.data()?.payload
          : defaultState.template,
        __meta: {
          updatedAt:
            workspaceMetaSnapshot.exists()
              ? workspaceMetaSnapshot.data()?.updated_at || ""
              : "",
        },
      },
      defaultState
    );

    const remoteHasAnyData =
      remoteState.projects.length ||
      remoteState.appUsers.length ||
      remoteState.teamMembers.length ||
      remoteState.logs.length ||
      getStateUpdatedAt(remoteState);

    if (!remoteHasAnyData) {
      try {
        await saveSharedAppState(localState);
      } catch {}
      return localState;
    }

    const localUpdatedAt = getStateUpdatedAt(localState);
    const remoteUpdatedAt = getStateUpdatedAt(remoteState);

    if (localUpdatedAt && (!remoteUpdatedAt || localUpdatedAt > remoteUpdatedAt)) {
      try {
        await saveSharedAppState(localState);
      } catch {}
      return localState;
    }

    return remoteState;
  } catch {
    return localState;
  }
}

export async function saveSharedAppState(state) {
  const updatedAt = new Date().toISOString();
  const nextState = createStateEnvelope(state, updatedAt);
  writeLocalAppState(nextState);

  if (!firebaseDb) {
    return;
  }

  const batch = writeBatch(firebaseDb);

  await syncCollection(batch, COLLECTIONS.projects, nextState.projects || []);
  await syncCollection(batch, COLLECTIONS.appUsers, nextState.appUsers || []);
  await syncCollection(batch, COLLECTIONS.teamMembers, nextState.teamMembers || []);
  await syncCollection(batch, COLLECTIONS.logs, nextState.logs || []);

  batch.set(
    doc(firebaseDb, COLLECTIONS.templates, TEMPLATE_DOC_ID),
    {
      payload: sanitizeForFirestore(nextState.template),
      updated_at: updatedAt,
    },
    { merge: true }
  );

  batch.set(
    doc(firebaseDb, COLLECTIONS.workspaceMeta, WORKSPACE_META_ID),
    {
      updated_at: updatedAt,
    },
    { merge: true }
  );

  await batch.commit();
}
