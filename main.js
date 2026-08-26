import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
            priorityBtn.className = 'w-8 h-8 rounded-full bg-green-500 flex-shrink-0 transition-colors duration-300';
        }
    }
}

if (addTaskFab) addTaskFab.addEventListener('click', openNewTaskModal);
if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeNewTaskModal);
if (newTaskOverlay) newTaskOverlay.addEventListener('click', closeNewTaskModal);

// Priority Toggle Logic (Visual only)
if (priorityBtn) {
    priorityBtn.addEventListener('click', () => {
        if (priorityBtn.classList.contains('bg-green-500')) {
            priorityBtn.classList.remove('bg-green-500');
            priorityBtn.classList.add('bg-yellow-500');
        } else if (priorityBtn.classList.contains('bg-yellow-500')) {
            priorityBtn.classList.remove('bg-yellow-500');
            priorityBtn.classList.add('bg-red-500');
        } else {
            priorityBtn.classList.remove('bg-red-500');
            priorityBtn.classList.add('bg-green-500');
        }
    });
}

// Firebase Integration
if (newTaskForm) {
    newTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskContent = document.getElementById('taskContent').value;
        
        try {
            await addDoc(collection(db, "task"), {
                name: taskName,
                content: taskContent,
                createdAt: new Date()
            });
            closeNewTaskModal();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("タスクの追加に失敗しました。");
        }
    });
}

// Real-time listener for tasks
const taskListContainer = document.getElementById('task-list-container');
if (taskListContainer) {
    onSnapshot(collection(db, "task"), (snapshot) => {
        const dynamicTasks = taskListContainer.querySelectorAll('.dynamic-task');
        dynamicTasks.forEach(task => task.remove());

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            const article = document.createElement('article');
            article.className = "dynamic-task bg-[#F0FFF4] rounded-lg p-4 flex items-start gap-4 task-card-shadow relative overflow-hidden group hover:opacity-90 transition-colors border-l-4 border-l-secondary-fixed-dim hover:scale-[1.02] cursor-pointer fade-in-up";
            
            article.innerHTML = `
                <div class="pt-1">
                    <span class="material-symbols-outlined text-tertiary">task_alt</span>
                </div>
                <div class="flex-grow">
                    <div class="flex items-center gap-2 mb-1">
                        <label class="font-body-lg text-body-lg text-on-surface font-semibold cursor-pointer block group-has-[:checked]:line-through group-has-[:checked]:text-tertiary">
                            ${data.name}
                        </label>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <span class="text-sm text-on-surface-variant">${data.content}</span>
                    </div>
                </div>
                <button class="self-center ml-auto text-on-surface-variant hover:bg-surface-variant p-1 rounded-full transition-colors">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
            `;
            
            taskListContainer.appendChild(article);
        });
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (logoutModal && !logoutModal.classList.contains('hidden')) closeLogoutModal();
        if (newTaskModal && !newTaskModal.classList.contains('hidden')) closeNewTaskModal();
    }
});