'use client';

import {
  initializeFirebase,
  FirebaseProvider,
} from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { ReactNode, useEffect, useState } from 'react';

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
