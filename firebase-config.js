/**
 * Rhythm Clicks Studio - Firebase Configuration File
 * 
 * Instructions:
 * 1. Go to the Firebase Console: https://console.firebase.google.com/
 * 2. Create a free project (e.g., "Rhythm Clicks Dashboard").
 * 3. Go to Project Settings -> Add web app.
 * 4. Copy the config object and paste your keys below.
 * 5. Ensure "Email/Password" login is enabled in Firebase Authentication.
 * 6. Set up a Cloud Firestore database.
 * 
 * If these values are left empty or starting with "YOUR_", the dashboard will
 * automatically fallback to Local Mode (LocalStorage & BroadcastChannel sync).
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
