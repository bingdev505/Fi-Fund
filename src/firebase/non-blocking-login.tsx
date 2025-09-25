'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';


/** Initiate anonymous sign-in (non-blocking). */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<void> {
  try {
    await signInAnonymously(authInstance);
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    // Here we re-throw the error so the calling component can handle it.
    throw error;
  }
}

/** Initiate email/password sign-up (non-blocking). */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(authInstance, email, password);
  } catch (error) {
    console.error("Email sign-up failed", error);
    if (error instanceof FirebaseError) {
        throw error;
    }
    throw new Error("An unexpected error occurred during sign up.");
  }
}

/** Initiate email/password sign-in (non-blocking). */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
    try {
        await signInWithEmailAndPassword(authInstance, email, password);
    } catch (error) {
        console.error("Email sign-in failed", error);
        if (error instanceof FirebaseError) {
            throw error;
        }
        throw new Error("An unexpected error occurred during sign in.");
    }
}
