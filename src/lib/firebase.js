import { deleteApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseInitError = "";

if (hasFirebaseConfig) {
  try {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
  } catch (error) {
    firebaseInitError =
      error instanceof Error ? error.message : "Firebase failed to initialize.";
  }
}

async function createManagedAuthUser(email, password = "") {
  if (!hasFirebaseConfig || !firebaseAuth) {
    throw new Error("Firebase auth is not configured yet.");
  }

  const secondaryApp = initializeApp(firebaseConfig, `tool-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const nextPassword =
    password || `Gomo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}!`;

  try {
    const credentials = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      nextPassword
    );

    if (!password) {
      await sendPasswordResetEmail(firebaseAuth, email);
    }

    return {
      uid: credentials.user.uid,
      invited: !password,
      existingAccount: false,
    };
  } catch (error) {
    if (error?.code === "auth/email-already-in-use") {
      await sendPasswordResetEmail(firebaseAuth, email);
      return {
        uid: "",
        invited: true,
        existingAccount: true,
      };
    }

    throw error;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {}

    try {
      await deleteApp(secondaryApp);
    } catch {}
  }
}

async function updateCurrentUserPassword(password) {
  if (!hasFirebaseConfig || !firebaseAuth?.currentUser) {
    throw new Error("Firebase auth is not ready for this account.");
  }

  await updatePassword(firebaseAuth.currentUser, password);
}

async function sendManagedPasswordResetEmail(email) {
  if (!hasFirebaseConfig || !firebaseAuth) {
    throw new Error("Firebase auth is not configured yet.");
  }

  await sendPasswordResetEmail(firebaseAuth, String(email || "").trim().toLowerCase());
}

export {
  createManagedAuthUser,
  firebaseApp,
  firebaseAuth,
  firebaseDb,
  firebaseInitError,
  sendManagedPasswordResetEmail,
  updateCurrentUserPassword,
};
