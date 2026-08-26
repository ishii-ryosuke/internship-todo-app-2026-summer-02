// Firebase SDKのインポート（CDN経由）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const googleProvider = new GoogleAuthProvider();

// DOM要素の取得
const form = document.querySelector('form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = form.querySelector('button[type="submit"]');
const submitBtnText = submitBtn.querySelector('span'); // "ワークスペースにログイン"
const submitBtnIcon = submitBtn.querySelectorAll('span')[1]; // 矢印アイコン

const googleBtn = document.querySelector('button[type="button"]');
const googleBtnText = googleBtn.querySelector('span');

// エラーメッセージ表示用のコンテナ作成と配置
// フォームの送信ボタンのすぐ上に配置する
const errorMessageContainer = document.createElement('div');
errorMessageContainer.className = 'text-error text-label-sm font-label-bold mb-2 hidden';
form.insertBefore(errorMessageContainer, submitBtn);

/**
 * エラーメッセージを表示する関数
 */
const showError = (message) => {
    if (!message) return;
    errorMessageContainer.textContent = message;
    errorMessageContainer.classList.remove('hidden');
};

/**
 * エラーメッセージをクリアする関数
 */
const clearError = () => {
    errorMessageContainer.textContent = '';
    errorMessageContainer.classList.add('hidden');
};

/**
 * ボタンのローディング状態を切り替える関数
 */
const toggleLoading = (btn, textEl, isLoading, originalText, iconEl = null) => {
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
        btn.classList.remove('hover:scale-[1.02]', 'hover:shadow-md');
        textEl.textContent = 'ログイン中...';
        if (iconEl) iconEl.style.display = 'none';
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
        btn.classList.add('hover:scale-[1.02]', 'hover:shadow-md');
        textEl.textContent = originalText;
        if (iconEl) iconEl.style.display = 'block';
    }
};

/**
 * Firebaseのエラーコードに応じた日本語メッセージを返す関数
 */
const getErrorMessage = (error) => {
    switch (error.code) {
        case 'auth/invalid-email':
            return '無効なメールアドレス形式です。';
        case 'auth/user-disabled':
            return 'このユーザーアカウントは無効化されています。';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'メールアドレスまたはパスワードが間違っています。';
        case 'auth/too-many-requests':
            return 'ログイン失敗が続いたため、アカウントが一時的にロックされました。しばらく経ってから再度お試しください。';
        case 'auth/popup-closed-by-user':
            return null;
        default:
            return `ログインに失敗しました。(${error.code})`;
    }
};

// 1. メール/パスワード ログイン処理
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const originalText = submitBtnText.textContent;

    toggleLoading(submitBtn, submitBtnText, true, originalText, submitBtnIcon);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/main.html';
    } catch (error) {
        console.error('Email Login Error:', error);
        const msg = getErrorMessage(error);
        showError(msg);
        toggleLoading(submitBtn, submitBtnText, false, originalText, submitBtnIcon);
    }
});

// 2. Google アカウントログイン処理
googleBtn.addEventListener('click', async () => {
    clearError();
    const originalText = googleBtnText.textContent;

    toggleLoading(googleBtn, googleBtnText, true, originalText);

    try {
        await signInWithPopup(auth, googleProvider);
        window.location.href = '/main.html';
    } catch (error) {
        console.error('Google Login Error:', error);
        const msg = getErrorMessage(error);
        showError(msg);
        toggleLoading(googleBtn, googleBtnText, false, originalText);
    }
});
