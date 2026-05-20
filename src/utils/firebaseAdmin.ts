import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized and environment variables are present
if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines for the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[Firebase Admin] Successfully initialized.');
  } catch (error) {
    console.error('[Firebase Admin] Initialization error', error);
  }
} else if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.warn('[Firebase Admin] Missing FIREBASE_PRIVATE_KEY. Admin SDK will not be available.');
}

const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

export { adminDb, adminAuth, admin };
