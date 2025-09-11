import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDrnsoTrh4lHw6q0-wPUPowUI37164vEw",
  authDomain: "autitos-82ad2.firebaseapp.com",
  projectId: "autitos-82ad2",
  storageBucket: "autitos-82ad2.appspot.com",
  messagingSenderId: "1073855461143",
  appId: "1:1073855461143:web:b15858452517829d786952",
  measurementId: "G-LLDF0B72DJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export the necessary Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

// You can also initialize and export other services like Analytics, Storage, etc.
// import { getAnalytics } from "firebase/analytics";
// export const analytics = getAnalytics(app);
