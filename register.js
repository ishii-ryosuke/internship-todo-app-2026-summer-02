// Firebase SDK のインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebaseの設定情報
const firebaseConfig = {
    apiKey: "AIzaSyDlXQYEzZaExLLQmp1zcfBLfg8WmFCAlLU",
    authDomain: "one-week-68c87.firebaseapp.com",
    projectId: "one-week-68c87",
    storageBucket: "one-week-68c87.firebasestorage.app",
    messagingSenderId: "31000679329",
    appId: "1:31000679329:web:777c6a2ecb61088d3bb1e0"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// DOM要素が読み込まれた後に処理を実行
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    // --- パスワードの表示/非表示切り替え ---
    const setupPasswordToggle = (inputId) => {
        const input = document.getElementById(inputId);
        const toggleBtn = input.nextElementSibling;
        if (toggleBtn && toggleBtn.tagName === 'BUTTON') {
            const icon = toggleBtn.querySelector('span');
            toggleBtn.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = 'visibility_off'; // アイコンを非表示マークに
                } else {
                    input.type = 'password';
                    icon.textContent = 'visibility'; // アイコンを表示マークに
                }
            });
        }
    };

    setupPasswordToggle('password');
    setupPasswordToggle('confirmPassword');

    // --- エラーメッセージ表示用の要素を作成してフォームに挿入 ---
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorMessageContainer = document.createElement('div');
    errorMessageContainer.className = 'text-error text-label-sm font-label-bold mb-2 hidden';
    // 送信ボタンの直前（パスワード再確認欄の下）に挿入
    form.insertBefore(errorMessageContainer, submitBtn);

    const showError = (message) => {
        if (!message) return;
        errorMessageContainer.textContent = message;
        errorMessageContainer.classList.remove('hidden');
    };

    const clearError = () => {
        errorMessageContainer.textContent = '';
        errorMessageContainer.classList.add('hidden');
    };

    // --- フォーム送信時のバリデーションと登録処理 ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        // フォーム入力値の取得
        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 1. 必須チェック
        if (!name || !email || !password || !confirmPassword) {
            showError('すべての項目を入力してください。');
            return;
        }

        // 2. メールアドレス形式チェック（末尾が .com であること）
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/i;
        if (!emailRegex.test(email)) {
            showError('メールアドレスは正しい形式（末尾が .com）で入力してください。');
            return;
        }

        // 3. パスワード要件チェック（英数字混在で8文字以上）
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            showError('パスワードは英字と数字を両方含む、8文字以上で入力してください。');
            return;
        }

        // 4. パスワード一致チェック
        if (password !== confirmPassword) {
            showError('パスワードが一致しません。');
            return;
        }

        // 送信中のUI処理（二重送信防止）
        submitBtn.disabled = true;
        const btnTextSpan = submitBtn.querySelector('span:first-child');
        const originalText = btnTextSpan.textContent;
        btnTextSpan.textContent = 'アカウント作成中...';
        submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

        try {
            // 1. Firebase Authenticationでユーザーを作成
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Firestoreにユーザー情報を保存（パスワードは保存しない）
            await setDoc(doc(db, "users", user.uid), {
                UserID: user.uid,
                name: name,
                email: email,
                createdAt: serverTimestamp()
            });

            // 成功時はメイン画面へ直接遷移
            window.location.href = '/main.html';

        } catch (error) {
            console.error('登録エラー:', error);
            if (error.code === 'auth/email-already-in-use') {
                showError('このメールアドレスは既に登録されています。');
            } else {
                showError('登録に失敗しました。通信環境や設定を確認してください。');
            }
        } finally {
            // ボタンを元の状態に戻す
            submitBtn.disabled = false;
            btnTextSpan.textContent = originalText;
            submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    });

    // --- Google アカウントでのログイン処理 ---
    const googleBtn = document.querySelectorAll('button[type="button"]')[2]; // 3番目のbuttonがGoogleログイン
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            clearError();
            
            // UIをローディング状態に
            googleBtn.disabled = true;
            googleBtn.classList.add('opacity-70', 'cursor-not-allowed');
            // 元のテキストを保存するのは構造が複雑なので省略し、シンプルに無効化だけ行います
            
            try {
                // Firebase AuthでGoogleログインポップアップを表示
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;

                // Firestoreにユーザー情報が存在しない場合は保存する
                await setDoc(doc(db, "users", user.uid), {
                    UserID: user.uid,
                    name: user.displayName || 'Google ユーザー',
                    email: user.email,
                    createdAt: serverTimestamp()
                }, { merge: true }); // 既存データがあれば上書き/統合

                // メイン画面へ遷移
                window.location.href = '/main.html';
                
            } catch (error) {
                console.error('Google Login Error:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showError('Googleログインに失敗しました。');
                }
            } finally {
                googleBtn.disabled = false;
                googleBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        });
    }
});