const greeting = document.getElementById('greeting');
const button = document.getElementById('btn');

button.addEventListener('click', () => {
    greeting.textContent = 'Hellow world！';
});