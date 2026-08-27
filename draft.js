import { db, auth } from './firebase-config.js';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ============================================================
// DOM Elements
// ============================================================
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('empty-state');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectAllVisual = document.getElementById('selectAllVisual');
const selectAllLabel = document.getElementById('selectAllLabel');
const bulkActionsPanel = document.getElementById('bulkActionsPanel');
const bulkTrashBtn = document.getElementById('bulkTrashBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// Delete Modal
const deleteModal = document.getElementById('delete-modal');
const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const deleteModalMessage = document.getElementById('delete-modal-message');
const deleteModalCancelBtn = document.getElementById('delete-modal-cancel-btn');
const deleteModalConfirmBtn = document.getElementById('delete-modal-confirm-btn');

// Edit Modal
const editTaskModal = document.getElementById('edit-task-modal');
const editTaskOverlay = document.getElementById('edit-task-overlay');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskNameInput = document.getElementById('editTaskName');
const editTaskContentInput = document.getElementById('editTaskContent');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const draftSaveBtn = document.getElementById('draft-save-btn');
const editPriorityBtn = document.getElementById('editPriorityBtn');

// ============================================================
// State
// ============================================================
let pendingDeleteIds = [];
let currentEditingTaskId = null;
let unsubscribe = null;

// ============================================================
// Helpers
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// Bulk Actions State
// ============================================================
function updateBulkActionsState() {
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    const checkedCheckboxes = Array.from(taskCheckboxes).filter(cb => cb.checked);
    const anyChecked = checkedCheckboxes.length > 0;
    const allChecked = taskCheckboxes.length > 0 && checkedCheckboxes.length === taskCheckboxes.length;

    if (anyChecked) {
        bulkActionsPanel.classList.remove('opacity-50', 'pointer-events-none', 'translate-y-1');
        bulkActionsPanel.classList.add('opacity-100', 'translate-y-0');
    } else {
        bulkActionsPanel.classList.add('opacity-50', 'pointer-events-none', 'translate-y-1');
        bulkActionsPanel.classList.remove('opacity-100', 'translate-y-0');
    }

    selectAllCheckbox.checked = allChecked;
    if (allChecked) {
        selectAllVisual.classList.add('select-all-active');
        if (selectAllLabel) selectAllLabel.textContent = '全解除';
    } else {
        selectAllVisual.classList.remove('select-all-active');
        if (selectAllLabel) selectAllLabel.textContent = '全選択';
    }
}

// ============================================================
// Select All
// ============================================================
selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.task-checkbox').forEach(cb => { cb.checked = isChecked; });
    updateBulkActionsState();
});

// ============================================================
// Delete Modal
// ============================================================
function openDeleteModal(ids) {
    pendingDeleteIds = ids;
    if (deleteModalMessage) {
        deleteModalMessage.textContent = ids.length === 1
            ? 'この下書きを完全に削除しますか？この操作は取り消せません。'
            : `選択した ${ids.length} 件の下書きを完全削除しますか？この操作は取り消せません。`;
    }
    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    pendingDeleteIds = [];
}

if (deleteModalCancelBtn) deleteModalCancelBtn.addEventListener('click', closeDeleteModal);
if (deleteModalOverlay) deleteModalOverlay.addEventListener('click', closeDeleteModal);

// ============================================================
// Edit Modal
// ============================================================
function openEditModal(taskId, taskData) {
    currentEditingTaskId = taskId;
    if (editTaskNameInput) editTaskNameInput.value = taskData.name || '';
    if (editTaskContentInput) editTaskContentInput.value = taskData.content || '';
    if (editPriorityBtn) {
        const priority = taskData.priority || 'green';
        editPriorityBtn.className = `w-8 h-8 rounded-full bg-${priority}-500 flex-shrink-0 transition-colors duration-300`;
    }
    editTaskModal.classList.remove('hidden');
}

function closeEditModal() {
    editTaskModal.classList.add('hidden');
    currentEditingTaskId = null;
    if (editTaskForm) editTaskForm.reset();
    if (editPriorityBtn) {
        editPriorityBtn.className = 'w-8 h-8 rounded-full bg-green-500 flex-shrink-0 transition-colors duration-300';
    }
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
if (editTaskOverlay) editTaskOverlay.addEventListener('click', closeEditModal);

// Priority toggle in edit modal
if (editPriorityBtn) {
    editPriorityBtn.addEventListener('click', () => {
        if (editPriorityBtn.classList.contains('bg-green-500')) {
            editPriorityBtn.classList.replace('bg-green-500', 'bg-yellow-500');
        } else if (editPriorityBtn.classList.contains('bg-yellow-500')) {
            editPriorityBtn.classList.replace('bg-yellow-500', 'bg-red-500');
        } else {
            editPriorityBtn.classList.replace('bg-red-500', 'bg-green-500');
        }
    });
}

// Draft save button — update draft task without publishing
if (draftSaveBtn) {
    draftSaveBtn.addEventListener('click', async () => {
        if (!currentEditingTaskId) return;
        const newName = editTaskNameInput?.value.trim() || '無題の下書き';
        const newContent = editTaskContentInput?.value.trim() || '';
        let priority = 'green';
        if (editPriorityBtn) {
            if (editPriorityBtn.classList.contains('bg-yellow-500')) priority = 'yellow';
            else if (editPriorityBtn.classList.contains('bg-red-500')) priority = 'red';
        }
        try {
            await updateDoc(doc(db, 'task', currentEditingTaskId), {
                name: newName,
                content: newContent,
                priority: priority,
                status: 'draft',
                updatedAt: serverTimestamp()
            });
            closeEditModal();
        } catch (error) {
            console.error('Error saving draft task:', error);
            alert('下書きの保存に失敗しました。');
        }
    });
}

// Complete (submit) — publish task (status: 'published')
if (editTaskForm) {
    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditingTaskId) return;

        const newName = editTaskNameInput?.value.trim();
        const newContent = editTaskContentInput?.value.trim();
        let priority = 'green';
        if (editPriorityBtn) {
            if (editPriorityBtn.classList.contains('bg-yellow-500')) priority = 'yellow';
            else if (editPriorityBtn.classList.contains('bg-red-500')) priority = 'red';
        }

        try {
            await updateDoc(doc(db, 'task', currentEditingTaskId), {
                name: newName,
                content: newContent,
                priority: priority,
                status: 'published',
                updatedAt: serverTimestamp()
            });
            closeEditModal();
        } catch (error) {
            console.error('Error publishing task from draft:', error);
            alert('タスクの更新・完了に失敗しました。');
        }
    });
}

// ============================================================
// Bulk Trash (ゴミ箱へ送る — 論理削除)
// ============================================================
async function moveToTrash(ids) {
    if (!ids || ids.length === 0) return;
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.update(doc(db, 'task', id), {
                isDeleted: true,
                deletedAt: serverTimestamp()
            });
        });
        await batch.commit();
    } catch (error) {
        console.error('Error moving to trash:', error);
        alert('ゴミ箱への移動に失敗しました。');
    }
}

if (bulkTrashBtn) {
    bulkTrashBtn.addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.task-checkbox:checked')).map(cb => cb.value);
        if (selected.length > 0) {
            await moveToTrash(selected);
        }
    });
}

// ============================================================
// Bulk Permanent Delete (完全削除)
// ============================================================
async function executePermanentDelete(ids) {
    if (!ids || ids.length === 0) return;
    try {
        if (ids.length === 1) {
            await deleteDoc(doc(db, 'task', ids[0]));
        } else {
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'task', id)));
            await batch.commit();
        }
        closeDeleteModal();
    } catch (error) {
        console.error('Error permanently deleting tasks:', error);
        alert('完全削除に失敗しました。');
    }
}

if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.task-checkbox:checked')).map(cb => cb.value);
        if (selected.length > 0) {
            openDeleteModal(selected);
        }
    });
}

if (deleteModalConfirmBtn) {
    deleteModalConfirmBtn.addEventListener('click', async () => {
        if (pendingDeleteIds.length > 0) {
            await executePermanentDelete(pendingDeleteIds);
        }
    });
}

// Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (deleteModal && !deleteModal.classList.contains('hidden')) closeDeleteModal();
        if (editTaskModal && !editTaskModal.classList.contains('hidden')) closeEditModal();
    }
});

// ============================================================
// Render empty state
// ============================================================
function renderEmptyState() {
    taskList.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant opacity-60';
    empty.innerHTML = `
        <span class="material-symbols-outlined text-[64px]">draft</span>
        <p class="font-body-lg">下書きはありません</p>
    `;
    taskList.appendChild(empty);
    updateBulkActionsState();
}

// ============================================================
// Firestore real-time listener (filtered by logged-in user)
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }

    if (!user) {
        renderEmptyState();
        return;
    }

    const draftQuery = query(
        collection(db, 'task'),
        where('userId', '==', user.uid),
        where('status', '==', 'draft'),
        where('isDeleted', '==', false)
    );

    unsubscribe = onSnapshot(draftQuery, (snapshot) => {
        if (snapshot.empty) {
            renderEmptyState();
            return;
        }

        taskList.innerHTML = '';

        snapshot.forEach((taskDoc) => {
            const data = taskDoc.data();
            const docId = taskDoc.id;

            const card = document.createElement('article');
            card.className = 'bg-[#F0FFF4] rounded-lg p-4 flex items-center gap-4 task-card-shadow relative group hover:opacity-90 transition-colors border-l-4 border-l-secondary-fixed-dim hover:scale-[1.02] cursor-pointer fade-in-up';
            card.dataset.id = docId;

            // Priority color mapping
            const priorityBorderMap = { red: 'border-l-error', yellow: 'border-l-primary-container', green: 'border-l-secondary-fixed-dim' };
            const priorityBgMap = { red: 'bg-[#FFF0F0]', yellow: 'bg-[#FFF9E6]', green: 'bg-[#F0FFF4]' };
            const priority = data.priority || 'green';
            card.className = card.className
                .replace('border-l-secondary-fixed-dim', priorityBorderMap[priority] || 'border-l-secondary-fixed-dim')
                .replace('bg-[#F0FFF4]', priorityBgMap[priority] || 'bg-[#F0FFF4]');

            card.innerHTML = `
                <!-- Checkbox -->
                <label class="flex items-center cursor-pointer select-none custom-checkbox-container flex-shrink-0">
                    <input type="checkbox" class="sr-only task-checkbox" value="${docId}">
                    <div class="relative w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center group-hover:border-primary transition-colors custom-checkbox-fill">
                        <span class="material-symbols-outlined text-on-primary text-[16px] opacity-0 scale-50 transition-all duration-200" style="font-variation-settings: 'wght' 600;">check</span>
                    </div>
                </label>

                <!-- Task Title -->
                <div class="flex-grow min-w-0">
                    <span class="font-body-lg text-body-lg text-on-surface font-semibold block break-words">${escapeHtml(data.name || '無題のタスク')}</span>
                </div>

                <!-- Edit Button (アイコン + 「編集」テキスト) -->
                <button type="button" class="draft-edit-btn self-center flex-shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-bold text-sm hover:bg-surface-variant hover:border-outline active:scale-95 transition-all flex items-center gap-1.5 shadow-sm" aria-label="編集">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                    <span>編集</span>
                </button>
            `;

            // Checkbox listener
            const checkbox = card.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => updateBulkActionsState());

            // Edit button listener
            const editBtn = card.querySelector('.draft-edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(docId, data);
            });

            taskList.appendChild(card);
        });

        updateBulkActionsState();
    }, (error) => {
        console.error('Firestore listener error:', error);
    });
});
