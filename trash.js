import { db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const taskList = document.getElementById('taskList');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectAllVisual = document.getElementById('selectAllVisual');
const selectAllLabel = document.getElementById('selectAllLabel');
const bulkActionsPanel = document.getElementById('bulkActionsPanel');
const bulkRestoreBtn = document.getElementById('bulkRestoreBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const deleteModalMessage = document.getElementById('delete-modal-message');
const deleteModalCancelBtn = document.getElementById('delete-modal-cancel-btn');
const deleteModalConfirmBtn = document.getElementById('delete-modal-confirm-btn');

// Pending deletion state
let pendingDeleteIds = [];

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Update bulk actions panel and select-all checkbox state
function updateBulkActionsState() {
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    const checkedCheckboxes = Array.from(taskCheckboxes).filter(cb => cb.checked);
    const anyChecked = checkedCheckboxes.length > 0;
    const allChecked = taskCheckboxes.length > 0 && checkedCheckboxes.length === taskCheckboxes.length;

    // Toggle bulk actions panel visibility/interaction
    if (anyChecked) {
        bulkActionsPanel.classList.remove('opacity-50', 'pointer-events-none', 'translate-y-1');
        bulkActionsPanel.classList.add('opacity-100', 'translate-y-0');
    } else {
        bulkActionsPanel.classList.add('opacity-50', 'pointer-events-none', 'translate-y-1');
        bulkActionsPanel.classList.remove('opacity-100', 'translate-y-0');
    }

    // Toggle select all visual & text
    selectAllCheckbox.checked = allChecked;
    if (allChecked) {
        selectAllVisual.classList.add('select-all-active');
        if (selectAllLabel) selectAllLabel.textContent = '全解除';
    } else {
        selectAllVisual.classList.remove('select-all-active');
        if (selectAllLabel) selectAllLabel.textContent = '全選択';
    }
}

// Confirmation Modal Handlers
function openDeleteModal(ids) {
    pendingDeleteIds = ids;
    if (ids.length === 1) {
        deleteModalMessage.textContent = 'このタスクを完全に削除しますか？この操作を実行するとデータは復元できなくなります。';
    } else {
        deleteModalMessage.textContent = `選択した ${ids.length} 件のタスクを完全に削除しますか？この操作を実行するとデータは復元できなくなります。`;
    }
    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    pendingDeleteIds = [];
}

// Restore multiple tasks in batch
async function restoreTasksBulk(ids) {
    if (!ids || ids.length === 0) return;
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.update(doc(db, "task", id), { isDeleted: false });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error restoring tasks in bulk: ", error);
        alert("タスクの復元に失敗しました。");
    }
}

// Delete tasks in batch
async function executeDelete(ids) {
    if (!ids || ids.length === 0) return;
    try {
        if (ids.length === 1) {
            await deleteDoc(doc(db, "task", ids[0]));
        } else {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.delete(doc(db, "task", id));
            });
            await batch.commit();
        }
        closeDeleteModal();
    } catch (error) {
        console.error("Error permanently deleting tasks: ", error);
        alert("タスクの完全削除に失敗しました。");
    }
}

// Render empty state
function renderEmptyState() {
    taskList.innerHTML = `
        <div class="flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant opacity-60">
            <span class="material-symbols-outlined text-[64px]">delete_outline</span>
            <p class="font-body-lg">ゴミ箱は空です</p>
        </div>
    `;
    updateBulkActionsState();
}

// Event Listeners for Select All
selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    taskCheckboxes.forEach(cb => {
        cb.checked = isChecked;
    });
    updateBulkActionsState();
});

// Event Listeners for Bulk Actions
if (bulkRestoreBtn) {
    bulkRestoreBtn.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.task-checkbox:checked');
        const ids = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (ids.length > 0) {
            await restoreTasksBulk(ids);
        }
    });
}

if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', () => {
        const selectedCheckboxes = document.querySelectorAll('.task-checkbox:checked');
        const ids = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (ids.length > 0) {
            openDeleteModal(ids);
        }
    });
}

// Modal Event Listeners
if (deleteModalCancelBtn) deleteModalCancelBtn.addEventListener('click', closeDeleteModal);
if (deleteModalOverlay) deleteModalOverlay.addEventListener('click', closeDeleteModal);
if (deleteModalConfirmBtn) {
    deleteModalConfirmBtn.addEventListener('click', async () => {
        if (pendingDeleteIds.length > 0) {
            await executeDelete(pendingDeleteIds);
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && deleteModal && !deleteModal.classList.contains('hidden')) {
        closeDeleteModal();
    }
});

// Real-time Firestore Listener for Trash items
const trashQuery = query(collection(db, "task"), where("isDeleted", "==", true));

onSnapshot(trashQuery, (snapshot) => {
    if (snapshot.empty) {
        renderEmptyState();
        return;
    }

    taskList.innerHTML = '';

    snapshot.forEach((taskDoc) => {
        const data = taskDoc.data();
        const docId = taskDoc.id;

        // Auto-delete logic (30 days)
        let remainingDays = 30; // default if deletedAt is not available
        let isExpired = false;

        if (data.deletedAt) {
            const deletedTime = data.deletedAt.toDate ? data.deletedAt.toDate().getTime() : new Date(data.deletedAt).getTime();
            const now = Date.now();
            const diffMs = now - deletedTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            remainingDays = 30 - diffDays;
            if (remainingDays <= 0) {
                isExpired = true;
            }
        }

        if (isExpired) {
            // フロントエンド側での自動完全削除
            deleteDoc(doc(db, "task", docId)).catch(err => console.error("Auto delete failed", err));
            return; // 画面には表示しない
        }

        const remainingText = remainingDays > 0 ? `残り${remainingDays}日` : "本日中に削除";

        const card = document.createElement('article');
        card.className = "bg-surface-container-lowest rounded-xl p-4 md:p-5 flex items-start gap-4 task-card-shadow border border-outline-variant/30 hover:border-outline-variant transition-all fade-in-up group";
        card.dataset.id = docId;

        card.innerHTML = `
            <!-- Custom Checkbox -->
            <label class="pt-1 flex items-center cursor-pointer select-none custom-checkbox-container flex-shrink-0">
                <input type="checkbox" class="sr-only task-checkbox" value="${docId}">
                <div class="relative w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center group-hover:border-primary transition-colors custom-checkbox-fill">
                    <span class="material-symbols-outlined text-on-primary text-[16px] opacity-0 scale-50 transition-all duration-200" style="font-variation-settings: 'wght' 600;">check</span>
                </div>
            </label>

            <!-- Task Content -->
            <div class="flex-grow min-w-0">
                <h3 class="font-body-lg text-body-lg text-on-surface font-semibold break-words">${escapeHtml(data.name || '無題のタスク')}</h3>
                ${data.content ? `<p class="text-sm text-on-surface-variant mt-1 break-words">${escapeHtml(data.content)}</p>` : ''}
            </div>
            
            <!-- Remaining days -->
            <div class="flex-shrink-0 text-right self-center">
                <span class="inline-flex items-center gap-1 text-xs font-label-sm px-2 py-1 bg-surface-variant text-on-surface-variant rounded-md shadow-sm">
                    <span class="material-symbols-outlined text-[14px]">schedule</span>
                    ${remainingText}
                </span>
            </div>
        `;

        // Checkbox change listener
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            updateBulkActionsState();
        });

        taskList.appendChild(card);
    });

    updateBulkActionsState();
}, (error) => {
    console.error("Firestore listener error: ", error);
});
