import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDlXQYEzZaExLLQmp1zcfBLfg8WmFCAlLU",
    authDomain: "one-week-68c87.firebaseapp.com",
    projectId: "one-week-68c87",
    storageBucket: "one-week-68c87.firebasestorage.app",
    messagingSenderId: "31000679329",
    appId: "1:31000679329:web:777c6a2ecb61088d3bb1e0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);