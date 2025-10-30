// This file is the single source of truth for all things Firebase.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, type Auth } from 'firebase/auth';
import { getFirestore as getFirebaseFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Initialize Firebase on the client side
export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        auth = getFirebaseAuth(app);
        firestore = getFirebaseFirestore(app);
      } catch (e) {
        console.error('Error initializing Firebase', e);
      }
    } else {
      app = getApp();
      auth = getFirebaseAuth(app);
      firestore = getFirebaseFirestore(app);
    }
  }
  // On the server, we don't initialize Firebase.
  return { app, auth, firestore };
}

// Export the functions to be used in the providers
export {
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useUser,
} from './provider';

export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
