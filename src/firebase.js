import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8oBlX8FWgQkvVS09yWVJpYaPqHwsEwFM",
  authDomain: "medulaespinal-app.firebaseapp.com",
  projectId: "medulaespinal-app",
  storageBucket: "medulaespinal-app.firebasestorage.app",
  messagingSenderId: "991529262290",
  appId: "1:991529262290:web:1ccf9223ec8ff421e4a10b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
