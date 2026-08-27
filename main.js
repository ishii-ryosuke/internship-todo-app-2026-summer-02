import { db, auth } from './firebase-config.js';
import {
    collection,
    addDoc,
    onSnapshot, query, where,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

// XSS対策用HTMLエスケープ関数
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 優先度別のカードスタイル定義
const PRIORITY_STYLES = {
    1: { bg: 'bg-[#FFF0F0]', border: 'border-l-error' },            // 赤 (高)
    2: { bg: 'bg-[#FFF9E6]', border: 'border-l-primary-container' }, // 黄 (中)
    3: { bg: 'bg-[#F0FFF4]', border: 'border-l-secondary-fixed-dim' }  // 緑 (低)
};

// Simple Sidebar Toggle Logic
const profileBtn = document.getElementById('profile-btn');
const closeNavBtn = document.getElementById('close-nav');
const sideNav = document.getElementById('side-nav');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
    sideNav.classList.remove('translate-x-full');
    navOverlay.classList.remove('hidden');
    setTimeout(() => navOverlay.classList.add('opacity-100'), 10);
}

function closeNav() {
    sideNav.classList.add('translate-x-full');
    navOverlay.classList.remove('opacity-100');
    setTimeout(() => navOverlay.classList.add('hidden'), 300);
}

if (profileBtn) profileBtn.addEventListener('click', openNav);
if (closeNavBtn) closeNavBtn.addEventListener('click', closeNav);
if (navOverlay) navOverlay.addEventListener('click', closeNav);

// Logout Modal Logic
const logoutBtn = document.getElementById('logout-btn');
const logoutModal = document.getElementById('logout-modal');
const logoutOverlay = document.getElementById('logout-overlay');
const logoutConfirmBtn = document.getElementById('logout-confirm-btn');
const logoutCancelBtn = document.getElementById('logout-cancel-btn');

function openLogoutModal() {
    if (logoutModal) logoutModal.classList.remove('hidden');
}

function closeLogoutModal() {
    if (logoutModal) logoutModal.classList.add('hidden');
}

if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if (logoutCancelBtn) logoutCancelBtn.addEventListener('click', closeLogoutModal);
if (logoutOverlay) logoutOverlay.addEventListener('click', closeLogoutModal);
if (logoutConfirmBtn) {
    logoutConfirmBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// New Task Modal Logic
const addTaskFab = document.getElementById('add-task-fab');
const newTaskModal = document.getElementById('new-task-modal');
const newTaskOverlay = document.getElementById('new-task-overlay');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const priorityBtn = document.getElementById('priorityBtn');
const newTaskForm = document.getElementById('new-task-form');

function openNewTaskModal() {
    if (newTaskModal) newTaskModal.classList.remove('hidden');
}

function closeNewTaskModal() {
    if (newTaskModal) {
        newTaskModal.classList.add('hidden');
        if (newTaskForm) newTaskForm.reset();
        // Reset priority button to default green
        if (priorityBtn) {
            priorityBtn.className = 'w-8 h-8 rounded-full bg-green-500 flex-shrink-0 transition-colors duration-300 text-[10px] font-bold text-[#FFFFFF]';
            priorityBtn.style.backgroundColor = '';
            priorityBtn.textContent = '低';
        }
    }
}

if (addTaskFab) addTaskFab.addEventListener('click', openNewTaskModal);
if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeNewTaskModal);
if (newTaskOverlay) newTaskOverlay.addEventListener('click', closeNewTaskModal);

// Edit Task Modal Logic
const editTaskModal = document.getElementById('edit-task-modal');
const editTaskOverlay = document.getElementById('edit-task-overlay');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskNameInput = document.getElementById('editTaskName');
const editTaskContentInput = document.getElementById('editTaskContent');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const draftEditBtn = document.getElementById('draft-edit-btn');
const editPriorityBtn = document.getElementById('editPriorityBtn');

let currentEditingTaskId = null;

function openEditTaskModal(taskId, taskData) {
    currentEditingTaskId = taskId;
    if (editTaskNameInput) editTaskNameInput.value = taskData.name || '';
    if (editTaskContentInput) editTaskContentInput.value = taskData.content || '';
    // 優先度の初期値反映
    if (editPriorityBtn) {
        const priority = taskData.priority || 3;
        editPriorityBtn.className = 'w-8 h-8 rounded-full flex-shrink-0 transition-colors duration-300 text-[10px] font-bold text-[#FFFFFF]';
        if (priority === 1) {
            editPriorityBtn.classList.add('bg-red-500');
            editPriorityBtn.textContent = '高';
        } else if (priority === 2) {
            editPriorityBtn.classList.add('bg-yellow-500');
            editPriorityBtn.textContent = '中';
        } else {
            editPriorityBtn.classList.add('bg-green-500');
            editPriorityBtn.textContent = '低';
        }
    }
    if (editTaskModal) editTaskModal.classList.remove('hidden');
}

function closeEditTaskModal() {
    if (editTaskModal) editTaskModal.classList.add('hidden');
    currentEditingTaskId = null;
    if (editTaskForm) editTaskForm.reset();
    if (editPriorityBtn) {
        editPriorityBtn.className = 'w-8 h-8 rounded-full bg-green-500 flex-shrink-0 transition-colors duration-300 text-[10px] font-bold text-[#FFFFFF]';
        editPriorityBtn.textContent = '低';
    }
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditTaskModal);
if (editTaskOverlay) editTaskOverlay.addEventListener('click', closeEditTaskModal);

// 優先度トグル（編集モーダル用）
if (editPriorityBtn) {
    editPriorityBtn.addEventListener('click', () => {
        if (editPriorityBtn.textContent === '低') {
            editPriorityBtn.classList.remove('bg-green-500');
            editPriorityBtn.classList.add('bg-yellow-500');
            editPriorityBtn.textContent = '中';
        } else if (editPriorityBtn.textContent === '中') {
            editPriorityBtn.classList.remove('bg-yellow-500');
            editPriorityBtn.classList.add('bg-red-500');
            editPriorityBtn.textContent = '高';
        } else {
            editPriorityBtn.classList.remove('bg-red-500');
            editPriorityBtn.classList.add('bg-green-500');
            editPriorityBtn.textContent = '低';
        }
    });
}

// 編集モーダルの下書き保存ボタン
if (draftEditBtn) {
    draftEditBtn.addEventListener('click', async () => {
        if (!currentEditingTaskId) return;
        const newName = editTaskNameInput?.value.trim() || '無題の下書き';
        const newContent = editTaskContentInput?.value.trim() || '';
        let priority = 3;
        if (editPriorityBtn) {
            if (editPriorityBtn.textContent.trim() === '高') priority = 1;
            else if (editPriorityBtn.textContent.trim() === '中') priority = 2;
        }
        try {
            await updateDoc(doc(db, "task", currentEditingTaskId), {
                name: newName,
                content: newContent,
                priority: priority,
                status: 'draft',
                updatedAt: serverTimestamp()
            });
            closeEditTaskModal();
        } catch (error) {
            console.error("Error saving draft: ", error);
            alert("下書きの保存に失敗しました。");
        }
    });
}

// 「完了」ボタン：Firestore updateDoc
if (editTaskForm) {
    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditingTaskId) return;
        const newName = editTaskNameInput?.value.trim();
        const newContent = editTaskContentInput?.value.trim();
        let priority = 3;
        if (editPriorityBtn) {
            if (editPriorityBtn.textContent === '高') priority = 1;
            else if (editPriorityBtn.textContent === '中') priority = 2;
        }
        try {
            await updateDoc(doc(db, "task", currentEditingTaskId), {
                name: newName,
                content: newContent,
                priority: priority,
                status: 'published',
                updatedAt: serverTimestamp()
            });
            closeEditTaskModal();
        } catch (error) {
            console.error("Error updating task: ", error);
            alert("タスクの更新に失敗しました。");
        }
    });
}

// Priority Toggle Logic (Visual only)
if (priorityBtn) {
    priorityBtn.addEventListener('click', () => {
        const currentText = priorityBtn.textContent.trim();
        if (priorityBtn.textContent === '低') {
            priorityBtn.classList.remove('bg-green-500');
            priorityBtn.classList.add('bg-yellow-500');
            priorityBtn.textContent = '中';
        } else if (priorityBtn.textContent === '中') {
            priorityBtn.classList.remove('bg-yellow-500');
            priorityBtn.classList.add('bg-red-500');
            priorityBtn.textContent = '高';
        } else {
            priorityBtn.classList.remove('bg-red-500');
            priorityBtn.classList.add('bg-green-500');
            priorityBtn.textContent = '低';
        }
    });
}

// Firebase Integration - Add Task
if (newTaskForm) {
    newTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskContent = document.getElementById('taskContent').value;

        // 優先度ボタンのテキストから数値を取得（1: 高, 2: 中, 3: 低）
        let priority = 3; // デフォルト: 緑（低）
        if (priorityBtn) {
            if (priorityBtn.textContent.trim() === '高') priority = 1;
            else if (priorityBtn.textContent.trim() === '中') priority = 2;
        }

        try {
            if (!auth.currentUser) return; // Prevent adding if not logged in

            await addDoc(collection(db, "task"), {
                name: taskName,
                content: taskContent,
                priority: priority,
                status: 'published',
                isDeleted: false,
                isCompleted: false,
                createdAt: new Date(),
                userId: auth.currentUser.uid
            });
            closeNewTaskModal();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("タスクの追加に失敗しました。");
        }
    });
}

// 新規タスクモーダルの下書き保存ボタン
const draftTaskBtn = document.getElementById('draft-task-btn');
if (draftTaskBtn) {
    draftTaskBtn.addEventListener('click', async () => {
        const taskName = document.getElementById('taskName')?.value?.trim() || '無題の下書き';
        const taskContent = document.getElementById('taskContent')?.value?.trim() || '';

        // 優先度ボタンのテキストから数値を取得（1: 高, 2: 中, 3: 低）
        let priority = 3;
        if (priorityBtn) {
            if (priorityBtn.textContent.trim() === '高') priority = 1;
            else if (priorityBtn.textContent.trim() === '中') priority = 2;
        }

        try {
            if (!auth.currentUser) return;

            await addDoc(collection(db, "task"), {
                name: taskName,
                content: taskContent,
                priority: priority,
                status: 'draft',
                isDeleted: false,
                createdAt: new Date(),
                userId: auth.currentUser.uid
            });
            closeNewTaskModal();
        } catch (error) {
            console.error("Error saving draft task: ", error);
            alert("下書きの保存に失敗しました。");
        }
    });
}

// 全ての開いているメニューを閉じ、カードのz-indexを初期化
function closeAllTaskMenus() {
    document.querySelectorAll('.task-dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
    });
    document.querySelectorAll('.dynamic-task').forEach(task => {
        task.classList.remove('z-30');
    });
}

// メニュー外クリック時に閉じる
document.addEventListener('click', (e) => {
    if (!e.target.closest('.task-menu-container')) {
        closeAllTaskMenus();
    }
});

// 編集処理ハンドラー（編集モーダルを開く）
function handleEditTask(taskId, taskData) {
    closeAllTaskMenus();
    openEditTaskModal(taskId, taskData);
}

// 論理削除（ゴミ箱へ移動）処理
async function handleDeleteTask(taskId) {
    try {
        await updateDoc(doc(db, "task", taskId), {
            isDeleted: true,
            deletedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error soft-deleting task: ", error);
        alert("タスクをゴミ箱へ移動できませんでした。");
    }
}

// Real-time listener for tasks
const taskListContainer = document.getElementById('task-list-container');
const completedTaskListContainer = document.getElementById('completed-task-list-container');

if (taskListContainer && completedTaskListContainer) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const q = query(collection(db, "task"), where("userId", "==", user.uid));
            onSnapshot(q, (snapshot) => {
                // 既存の動的タスクをクリア
                taskListContainer.querySelectorAll('.dynamic-task').forEach(task => task.remove());
                completedTaskListContainer.querySelectorAll('.dynamic-task').forEach(task => task.remove());

                // ドキュメントを配列化して優先度順にソート（赤1→黄2→緑3）
                const tasks = [];
                snapshot.forEach((taskDoc) => {
                    tasks.push(taskDoc);
                });
                tasks.sort((a, b) => (a.data().priority || 3) - (b.data().priority || 3));

                tasks.forEach((taskDoc) => {
                    const data = taskDoc.data();
                    const taskId = taskDoc.id;

                    // ゴミ箱に入っているタスク（isDeleted: true）および下書き（status: 'draft'）は除外
                    if (data.isDeleted === true || data.status === 'draft') return;

                    const priority = data.priority || 3;
                    const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES[3];

                    const isCompleted = data.isCompleted || false;

                    // ゴミ箱に入っているタスク（isDeleted: true）は除外
                    if (data.isDeleted === true) return;

                    const article = document.createElement('article');
                    article.dataset.taskId = taskId;
                    article.dataset.isCompleted = isCompleted;

                    if (isCompleted) {
                        article.className = "dynamic-task bg-surface-container rounded-lg p-4 flex items-center gap-4 opacity-75 cursor-pointer task-card completed hover:opacity-90 transition-colors hover:scale-[1.02] relative group";
                    } else {
                        article.className = `dynamic-task ${style.bg} rounded-lg p-4 flex items-center gap-4 task-card-shadow relative group hover:opacity-90 transition-colors border-l-4 ${style.border} hover:scale-[1.02] cursor-pointer fade-in-up task-card`;
                    }

                    article.dataset.content = data.content || '';
                    article.dataset.priority = priority;
                    if (data.createdAt) {
                        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                        article.dataset.createdAt = date.toLocaleString('ja-JP');
                    }

                    // アイコンとタイトルのスタイルを完了状態に応じて変更
                    const iconClass = isCompleted ? "text-error icon-fill" : "text-tertiary";
                    const titleClass = isCompleted ? "text-tertiary line-through" : "text-on-surface";

                    article.innerHTML = `
                        <div>
                            <span class="material-symbols-outlined ${iconClass} task-icon">crown</span>
                        </div>
                        <div class="flex-grow min-w-0">
                            <span class="font-body-lg text-body-lg font-semibold block task-title break-all ${titleClass}" style="overflow-wrap: anywhere;">
                                ${escapeHtml(data.name || '無題のタスク')}
                            </span>
                        </div>
                        
                <!-- Three-dot Menu Container (z-index managed) -->
                <div class="relative self-center ml-auto task-menu-container flex-shrink-0">
                    <button type="button" class="task-menu-btn text-on-surface-variant hover:bg-surface-variant p-1 rounded-full transition-colors flex items-center justify-center" aria-label="タスク操作メニュー">
                                <span class="material-symbols-outlined">more_vert</span>
                            </button>
                            <!-- Dropdown Menu (z-50, shadow-xl) -->
                    <div class="task-dropdown-menu hidden absolute right-0 top-full mt-1 w-32 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 py-1 z-50">
                        <button type="button" class="task-edit-btn w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                            編集
                        </button>
                        <button type="button" class="task-delete-btn w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/40 flex items-center gap-2 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                            削除
                        </button>
                    </div>
                </div>
            `;

                    // イベントリスナーの登録
                    const menuBtn = article.querySelector('.task-menu-btn');
                    const dropdownMenu = article.querySelector('.task-dropdown-menu');
                    const editBtn = article.querySelector('.task-edit-btn');
                    const deleteBtn = article.querySelector('.task-delete-btn');

                    // メニュー開閉（開くカードを最前面 z-30 に引き上げる）
                    menuBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isHidden = dropdownMenu.classList.contains('hidden');
                        closeAllTaskMenus();
                        if (isHidden) {
                            dropdownMenu.classList.remove('hidden');
                            article.classList.add('z-30');
                        }
                    });

                    // 編集ボタン押下
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        closeAllTaskMenus();
                        handleEditTask(taskId, data);
                    });

                    // 削除ボタン押下（ゴミ箱移動）
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        closeAllTaskMenus();
                        await handleDeleteTask(taskId);
                    });

                    if (isCompleted) {
                        completedTaskListContainer.appendChild(article);
                    } else {
                        taskListContainer.appendChild(article);
                    }
                });
            });
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (logoutModal && !logoutModal.classList.contains('hidden')) closeLogoutModal();
        if (newTaskModal && !newTaskModal.classList.contains('hidden')) closeNewTaskModal();
        if (editTaskModal && !editTaskModal.classList.contains('hidden')) closeEditTaskModal();
        if (taskDetailsModal && !taskDetailsModal.classList.contains('hidden')) closeTaskDetailsModal();
        const settingsModalEl = document.getElementById('settings-modal');
        if (settingsModalEl && !settingsModalEl.classList.contains('hidden')) {
            settingsModalEl.classList.add('hidden');
        }
        closeAllTaskMenus();
    }
});

// Task Details Modal Logic
const taskDetailsModal = document.getElementById('task-details-modal');
const taskDetailsOverlay = document.getElementById('task-details-overlay');
const closeTaskDetailsBtn = document.getElementById('close-task-details-btn');
const taskDetailsTitle = document.getElementById('task-details-title');
const taskDetailsDate = document.getElementById('task-details-date');
const taskDetailsContent = document.getElementById('task-details-content');
const taskDetailsModalContent = document.getElementById('task-details-modal-content');
const taskDetailsPriorityIndicator = document.getElementById('task-details-priority-indicator');

function openTaskDetailsModal(title, content, dateStr, priorityNum) {
    if (taskDetailsTitle) taskDetailsTitle.textContent = title;
    if (taskDetailsContent) taskDetailsContent.textContent = content || '詳細なし';
    if (taskDetailsDate) taskDetailsDate.textContent = dateStr || '';

    if (taskDetailsModalContent && taskDetailsPriorityIndicator) {
        const priority = priorityNum || 3;
        const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES[3];
        taskDetailsModalContent.className = `relative z-10 w-full max-w-2xl rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-8 overflow-hidden transition-all duration-300 mx-4 ${style.bg}`;
        taskDetailsPriorityIndicator.className = `absolute left-0 top-0 bottom-0 w-1 ${style.border.replace('border-l-', 'bg-')}`;
    }

    if (taskDetailsModal) taskDetailsModal.classList.remove('hidden');
}

function closeTaskDetailsModal() {
    if (taskDetailsModal) taskDetailsModal.classList.add('hidden');
}

if (closeTaskDetailsBtn) closeTaskDetailsBtn.addEventListener('click', closeTaskDetailsModal);
if (taskDetailsOverlay) taskDetailsOverlay.addEventListener('click', closeTaskDetailsModal);

// Event Delegation for Task Actions
document.addEventListener('click', async (e) => {
    // 1. Task Completion Toggle (Crown icon)
    const crownIcon = e.target.closest('.task-icon');
    if (crownIcon && crownIcon.textContent.trim() === 'crown') {
        e.stopPropagation();
        const article = crownIcon.closest('article');
        if (article) {
            const taskId = article.dataset.taskId;
            if (taskId) {
                const isCompleted = article.dataset.isCompleted === 'true';
                try {
                    // Firestoreのデータを更新（リアルタイムリスナーが反応して自動で移動します）
                    await updateDoc(doc(db, "task", taskId), {
                        isCompleted: !isCompleted
                    });
                } catch (error) {
                    console.error("Error updating task status:", error);
                }
            } else {
                // taskIdがないダミータスク用のフォールバック処理
                article.classList.toggle('completed');
                crownIcon.classList.toggle('icon-fill');
                crownIcon.classList.toggle('text-error');
                crownIcon.classList.toggle('text-tertiary');
                const title = article.querySelector('.task-title');
                if (title) {
                    title.classList.toggle('line-through');
                    title.classList.toggle('text-tertiary');
                    title.classList.toggle('text-on-surface');
                }
            }
        }
        return; // Don't open modal if clicking crown
    }

    // 2. More Options Button
    const moreBtn = e.target.closest('button');
    if (moreBtn && moreBtn.querySelector('.material-symbols-outlined')?.textContent === 'more_vert') {
        e.stopPropagation();
        // Handle more options menu here in the future
        return; // Don't open modal if clicking more button
    }

    // 3. Open Task Details
    const taskCard = e.target.closest('.task-card');
    if (taskCard) {
        const title = taskCard.querySelector('.task-title')?.textContent || '';
        const content = taskCard.dataset.content || '詳細なし';
        const dateStr = taskCard.dataset.createdAt || '';
        const priority = parseInt(taskCard.dataset.priority) || 3;
        openTaskDetailsModal(title, content, dateStr, priority);
    }
});

// ===== Settings Modal Logic =====
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const settingsForm = document.getElementById('settings-form');
const settingsMessage = document.getElementById('settings-message');

const settingsNameInput = document.getElementById('settings-name');
const settingsEmailInput = document.getElementById('settings-email');
const settingsCurrentPassword = document.getElementById('settings-current-password');
const settingsNewPassword = document.getElementById('settings-new-password');
const settingsConfirmPassword = document.getElementById('settings-confirm-password');

// メッセージ表示ヘルパー
function showSettingsMessage(message, isError = true) {
    if (!settingsMessage) return;
    settingsMessage.textContent = message;
    settingsMessage.classList.remove('hidden', 'bg-error-container', 'text-on-error-container', 'bg-green-100', 'text-green-800');
    if (isError) {
        settingsMessage.classList.add('bg-error-container', 'text-on-error-container');
    } else {
        settingsMessage.classList.add('bg-green-100', 'text-green-800');
    }
}

function clearSettingsMessage() {
    if (!settingsMessage) return;
    settingsMessage.textContent = '';
    settingsMessage.classList.add('hidden');
}

// モーダルを開く（ユーザー情報をロード）
async function openSettingsModal() {
    clearSettingsMessage();
    // パスワードフィールドをリセット
    if (settingsCurrentPassword) settingsCurrentPassword.value = '';
    if (settingsNewPassword) settingsNewPassword.value = '';
    if (settingsConfirmPassword) settingsConfirmPassword.value = '';

    const user = auth.currentUser;
    if (!user) return;

    // メールアドレスを表示
    if (settingsEmailInput) settingsEmailInput.value = user.email || '';

    // Firestoreからユーザー名を取得
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (settingsNameInput) settingsNameInput.value = userData.name || '';
        }
    } catch (error) {
        console.error('ユーザー情報の取得に失敗:', error);
    }

    // サイドバーを閉じてモーダルを表示
    closeNav();
    if (settingsModal) settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    if (settingsModal) settingsModal.classList.add('hidden');
    clearSettingsMessage();
}

// イベントリスナーの登録
if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });
}
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', closeSettingsModal);
if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettingsModal);

// フォーム送信（保存処理）
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearSettingsMessage();

        const user = auth.currentUser;
        if (!user) return;

        const newName = settingsNameInput ? settingsNameInput.value.trim() : '';
        const currentPw = settingsCurrentPassword ? settingsCurrentPassword.value : '';
        const newPw = settingsNewPassword ? settingsNewPassword.value : '';
        const confirmPw = settingsConfirmPassword ? settingsConfirmPassword.value : '';

        // 名前の必須チェック
        if (!newName) {
            showSettingsMessage('お名前を入力してください。');
            return;
        }

        // パスワード変更が入力されている場合のバリデーション
        const isPasswordChange = currentPw || newPw || confirmPw;
        if (isPasswordChange) {
            if (!currentPw) {
                showSettingsMessage('現在のパスワードを入力してください。');
                return;
            }
            if (!newPw) {
                showSettingsMessage('新しいパスワードを入力してください。');
                return;
            }
            // パスワード要件チェック（英数字混在で8文字以上）
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPw)) {
                showSettingsMessage('新しいパスワードは英字と数字を両方含む、8文字以上で入力してください。');
                return;
            }
            if (newPw !== confirmPw) {
                showSettingsMessage('新しいパスワードが一致しません。');
                return;
            }
        }

        // 保存ボタンの無効化
        const saveBtn = document.getElementById('settings-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-70', 'cursor-not-allowed');
        }

        try {
            // 1. Firestoreの名前を更新
            await updateDoc(doc(db, "users", user.uid), {
                name: newName
            });

            // 2. パスワード変更が指定されている場合
            if (isPasswordChange) {
                // 再認証（セキュリティ上必須）
                const credential = EmailAuthProvider.credential(user.email, currentPw);
                await reauthenticateWithCredential(user, credential);
                // パスワード更新
                await updatePassword(user, newPw);
            }

            showSettingsMessage('設定を保存しました！', false);

            // パスワードフィールドをクリア
            if (settingsCurrentPassword) settingsCurrentPassword.value = '';
            if (settingsNewPassword) settingsNewPassword.value = '';
            if (settingsConfirmPassword) settingsConfirmPassword.value = '';

        } catch (error) {
            console.error('設定の保存に失敗:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showSettingsMessage('現在のパスワードが正しくありません。');
            } else if (error.code === 'auth/requires-recent-login') {
                showSettingsMessage('セキュリティのため、再度ログインしてからお試しください。');
            } else {
                showSettingsMessage('設定の保存に失敗しました。もう一度お試しください。');
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }
    });
}

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

setupPasswordToggle('settings-current-password');
setupPasswordToggle('settings-new-password');
setupPasswordToggle('settings-confirm-password');