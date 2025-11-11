
'use client';
import CryptoJS from 'crypto-js';
import type { Credential } from '@/lib/types';

// It is crucial that this key remains consistent and is not exposed on the client-side bundle.
// In a real-world scenario, this should be a securely managed environment variable.
const ENCRYPTION_KEY_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'default-super-secret-key-that-is-long-enough';

function getEncryptionKey(userId: string) {
    // Derive a key from the user's ID and the secret. This ensures each user has a unique encryption key.
    return CryptoJS.SHA256(userId + ENCRYPTION_KEY_SECRET).toString(CryptoJS.enc.Hex);
}

export function encrypt(data: Partial<Omit<Credential, 'id' | 'user_id' | 'created_at'>>, userId: string) {
    const key = getEncryptionKey(userId);
    const encryptedData: Partial<Credential> = {};

    if (data.password) {
        encryptedData.password = CryptoJS.AES.encrypt(data.password, key).toString();
    }
    if (data.totp_secret) {
        encryptedData.totp_secret = CryptoJS.AES.encrypt(data.totp_secret, key).toString();
    }
    
    return encryptedData;
}

export function decrypt(credential: Credential, userId: string): Credential {
    const key = getEncryptionKey(userId);
    const decryptedData = { ...credential };

    try {
        if (credential.password) {
            const bytes = CryptoJS.AES.decrypt(credential.password, key);
            decryptedData.password = bytes.toString(CryptoJS.enc.Utf8);
        }
        if (credential.totp_secret) {
            const bytes = CryptoJS.AES.decrypt(credential.totp_secret, key);
            decryptedData.totp_secret = bytes.toString(CryptoJS.enc.Utf8);
        }
    } catch (e) {
        console.error("Decryption failed for credential:", credential.id, e);
        // Return partially decrypted or original data if one field fails
        // so the app doesn't crash. Mark fields that failed.
        if (credential.password && !decryptedData.password) {
            decryptedData.password = "DECRYPTION_FAILED";
        }
         if (credential.totp_secret && !decryptedData.totp_secret) {
            decryptedData.totp_secret = "DECRYPTION_FAILED";
        }
    }
    
    return decryptedData;
}
