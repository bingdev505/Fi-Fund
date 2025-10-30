'use client';
import { FirebaseApp } from 'firebase/app';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { initializeFirebase } from './index';

// Define the context shape
interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  firestore: null,
});

export const useFirebaseApp = () => useContext(FirebaseContext)?.app;
export const useAuth = () => useContext(FirebaseContext)?.auth as Auth;
export const useFirestore = () =>
  useContext(FirebaseContext)?.firestore as Firestore;

// Hook for tracking user session
export const useUser = () => {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Firebase might not be initialized yet
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading };
};

// The provider component
export const FirebaseProvider = ({
  app,
  auth,
  firestore,
  children,
}: {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  children: ReactNode;
}) => {
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore }}>
      {children}
    </FirebaseContext.Provider>
  );
};


type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

// Only initialize Firebase on the client
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { app, auth, firestore } = initializeFirebase();
      setServices({ app, auth, firestore });
    }
  }, []);

  if (!services) {
    // You can render a loading state here if needed
    return null;
  }

  return (
    <FirebaseProvider
      app={services.app}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
