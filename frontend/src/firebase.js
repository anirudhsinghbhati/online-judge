// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7hg1YM1MmPnHP_NCMUtsN-YuFXlWM-eQ",
  authDomain: "auth-fd4aa.firebaseapp.com",
  projectId: "auth-fd4aa",
  storageBucket: "auth-fd4aa.firebasestorage.app",
  messagingSenderId: "850536568305",
  appId: "1:850536568305:web:6b31e0519effe9672be050",
  measurementId: "G-Z0LBFQPY1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
