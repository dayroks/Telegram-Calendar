let tg = window.Telegram.WebApp;
tg.expand();

let currentDate = new Date();
let selectedDate = new Date(); 

let singleEvents = JSON.parse(localStorage.getItem('singleEvents')) || {}; 
let cycles = JSON.parse(localStorage.getItem('cycles')) || []; 
let activeCycleId = localStorage.getItem('activeCycleId') || null;

const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
const daysGrid = document.getElementById('daysGrid');
const monthYearLabel = document.getElementById('monthYear');

function saveData() {
    localStorage.setItem('singleEvents', JSON.stringify(singleEvents));
    localStorage.setItem('cycles', JSON.stringify(cycles));
    localStorage.setItem('activeCycleId', activeCycleId);
}

function getDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getEventsForDay(date) {
    const dateStr = getDateString(date);
    const dayOfWeek = date.getDay(); 
    let dayEvents = [];
    
    if (singleEvents[dateStr]) {
        dayEvents = singleEvents[dateStr].map(e => ({...e, isRecurring: false, originalDate: dateStr}));
    }
    
    const activeCycle = cycles.find(c => c.id === activeCycleId);
    if (activeCycle && activeCycle.schedule[dayOfWeek]) {
        activeCycle.schedule[dayOfWeek].forEach(ev => {
            dayEvents.push({ time: ev.time, text: ev.text, isRecurring: true, cycleName: activeCycle.name });
        });
    }
    
    return dayEvents.sort((a, b) => a.time.localeCompare(b.time));
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearLabel.innerText = `${monthNames[month]} ${year}`;
    daysGrid.innerHTML = '';

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        daysGrid.innerHTML += `<div class="day empty"></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const dateStr = getDateString(dateObj);
        
        let classes = 'day';
        if (dateStr === getDateString(new Date())) classes += ' today';
        if (dateStr === getDateString(selectedDate)) classes += ' selected';

        const dayEvents = getEventsForDay(dateObj);
        
        let dotsHtml = '<div class="dots-container">';
        let hasSingle = dayEvents.some(e => !e.isRecurring);
        let hasRecurring = dayEvents.some(e => e.isRecurring);
        
        if (hasSingle) dotsHtml += '<div class="dot regular"></div>';
        if (hasRecurring) dotsHtml += '<div class="dot recurring"></div>';
        dotsHtml += '</div>';

        const dayDiv = document.createElement('div');
        dayDiv.className = classes;
        dayDiv.innerHTML = `<span>${i}</span>${dayEvents.length > 0 ? dotsHtml : ''}`;
        
        dayDiv.onclick = () => {
            selectedDate = dateObj;
            if(tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
            renderCalendar();
            renderEvents();
        };
        daysGrid.appendChild(dayDiv);
    }
}

function renderEvents() {
    const dateStr = getDateString(selectedDate);
    const day = selectedDate.getDate();
    const month = monthNames[selectedDate.getMonth()];
    document.getElementById('eventsDate').innerText = `${day} ${month}`;

    const eventsList = document.getElementById('eventsList');
    const dayEvents = getEventsForDay(selectedDate);

    eventsList.innerHTML = '';
    if (dayEvents.length === 0) {
        eventsList.innerHTML = '<div style="color: var(--hint-color); text-align: center; padding: 10px; font-size:14px;">Немає подій</div>';
    } else {
        dayEvents.forEach((event, index) => {
            const item = document.createElement('div');
            item.className = 'event-item';
            const deleteBtn = !event.isRecurring ? `<button class="delete-btn" onclick="askDeleteEvent('${dateStr}', ${index})">✕</button>` : '';
            
            item.innerHTML = `
                <div class="event-content">
                    <span class="event-time">${event.time}</span>
                    <span>${event.text} ${event.isRecurring ? `<span class="event-recurring-badge" title="${event.cycleName}">цикл</span>` : ''}</span>
                </div>
                ${deleteBtn}
            `;
            eventsList.appendChild(item);
        });
    }
}

// --- КАСТОМНЕ ПІДТВЕРДЖЕННЯ (Замість confirm) ---
const confirmModal = document.getElementById('confirmModal');
let confirmAction = null;

function showConfirm(title, text, onYes) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmText').innerText = text;
    confirmAction = onYes;
    confirmModal.classList.add('active');
}

document.getElementById('confirmYesBtn').onclick = () => {
    if (confirmAction) confirmAction();
    confirmModal.classList.remove('active');
};
document.getElementById('confirmNoBtn').onclick = () => {
    confirmModal.classList.remove('active');
};

window.askDeleteEvent = function(dateStr, index) {
    showConfirm("Видалити подію?", "Вона зникне з календаря.", () => {
        singleEvents[dateStr].splice(index, 1);
        if (singleEvents[dateStr].length === 0) delete singleEvents[dateStr];
        saveData(); renderCalendar(); renderEvents();
    });
};

// --- ЗВИЧАЙНА ПОДІЯ ---
const singleEventModal = document.getElementById('singleEventModal');
document.getElementById('addSingleBtn').onclick = () => {
    document.getElementById('modalTitle').innerText = "Подія на " + selectedDate.getDate() + " число";
    document.getElementById('eventText').value = '';
    singleEventModal.classList.add('active');
};
document.getElementById('cancelSingleEventBtn').onclick = () => singleEventModal.classList.remove('active');
document.getElementById('saveSingleEventBtn').onclick = () => {
    const text = document.getElementById('eventText').value.trim();
    const time = document.getElementById('eventTime').value;
    if (!text) return alert("Введіть назву!"); // Можна теж замінити на кастомне, але хай буде
    const dateStr = getDateString(selectedDate);
    if (!singleEvents[dateStr]) singleEvents[dateStr] = [];
    singleEvents[dateStr].push({ text, time });
    saveData(); singleEventModal.classList.remove('active'); renderCalendar(); renderEvents();
};

// --- МЕНЕДЖЕР ЦИКЛІВ ---
const manageCyclesModal = document.getElementById('manageCyclesModal');
const cycleEditorModal = document.getElementById('cycleEditorModal');
const cyclesListDiv = document.getElementById('cyclesList');

document.getElementById('openManageCyclesBtn').onclick = () => { renderCyclesList(); manageCyclesModal.classList.add('active'); };
document.getElementById('closeManageCyclesBtn').onclick = () => manageCyclesModal.classList.remove('active');

function renderCyclesList() {
    cyclesListDiv.innerHTML = '';
    if (cycles.length === 0) {
        cyclesListDiv.innerHTML = '<div style="color: var(--hint-color); text-align:center; font-size:14px; padding:10px;">У вас ще немає розкладів</div>';
    }
    cycles.forEach(cycle => {
        const isActive = cycle.id === activeCycleId;
        const div = document.createElement('div');
        div.className = 'cycle-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="radio" name="activeCycle" ${isActive ? 'checked' : ''} onchange="setActiveCycle('${cycle.id}')">
                <span>${cycle.name}</span>
            </div>
            <div class="cycle-actions">
                <button onclick="editCycle('${cycle.id}')">✏️</button>
                <button onclick="askDeleteCycle('${cycle.id}')">🗑️</button>
            </div>
        `;
        cyclesListDiv.appendChild(div);
    });
}

window.setActiveCycle = function(id) {
    activeCycleId = id;
    saveData(); renderCalendar(); renderEvents();
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
};

window.askDeleteCycle = function(id) {
    showConfirm("Видалити розклад?", "Всі події з цього циклу зникнуть з календаря.", () => {
        cycles = cycles.filter(c => c.id !== id);
        if (activeCycleId === id) activeCycleId = null;
        saveData(); renderCyclesList(); renderCalendar(); renderEvents();
    });
};

// --- РЕДАКТОР ЦИКЛУ ---
let editingCycle = null;
let currentEditorDay = 1;

document.getElementById('createNewCycleBtn').onclick = () => {
    editingCycle = { id: Date.now().toString(), name: '', schedule: {0:[],1:[],2:[],3:[],4:[],5:[],6:[]} };
    openCycleEditor();
};

window.editCycle = function(id) {
    editingCycle = JSON.parse(JSON.stringify(cycles.find(c => c.id === id))); 
    openCycleEditor();
};

function openCycleEditor() {
    manageCyclesModal.classList.remove('active');
    cycleEditorModal.classList.add('active');
    document.getElementById('cycleNameInput').value = editingCycle.name;
    document.getElementById('cycleEditorTitle').innerText = editingCycle.name ? 'Редагування: ' + editingCycle.name : 'Новий розклад';
    currentEditorDay = 1; 
    updateEditorTabs();
    renderEditorEvents();
}

function updateEditorTabs() {
    document.querySelectorAll('#cycleDaysTabs .wd-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.day) === currentEditorDay);
    });
}

document.querySelectorAll('#cycleDaysTabs .wd-btn').forEach(btn => {
    btn.onclick = () => {
        currentEditorDay = parseInt(btn.dataset.day);
        updateEditorTabs();
        renderEditorEvents();
    };
});

function renderEditorEvents() {
    const container = document.getElementById('dayEventsEditor');
    container.innerHTML = '';
    const dayEvents = editingCycle.schedule[currentEditorDay] || [];
    
    if (dayEvents.length === 0) {
        container.innerHTML = '<div style="color:var(--hint-color); font-size:12px; text-align:center; padding-top:20px;">Немає подій</div>';
    }

    dayEvents.forEach((ev, index) => {
        const div = document.createElement('div');
        div.className = 'event-item';
        div.innerHTML = `
            <div class="event-content">
                <span class="event-time">${ev.time}</span>
                <span>${ev.text}</span>
            </div>
            <button class="delete-btn" onclick="removeEditorEvent(${index})">✕</button>
        `;
        container.appendChild(div);
    });
}

window.removeEditorEvent = function(index) {
    editingCycle.schedule[currentEditorDay].splice(index, 1);
    renderEditorEvents();
};

// --- ДОДАВАННЯ ПОДІЇ В ЦИКЛ (Замість prompt) ---
const addCycleEventModal = document.getElementById('addCycleEventModal');

document.getElementById('addEventToCycleBtn').onclick = () => {
    document.getElementById('cycleEventText').value = '';
    addCycleEventModal.classList.add('active');
};

document.getElementById('cancelCycleEventBtn').onclick = () => addCycleEventModal.classList.remove('active');

document.getElementById('saveCycleEventBtn').onclick = () => {
    const text = document.getElementById('cycleEventText').value.trim();
    const time = document.getElementById('cycleEventTime').value;
    if (!text) return alert("Введіть назву події!");
    
    if (!editingCycle.schedule[currentEditorDay]) editingCycle.schedule[currentEditorDay] = [];
    editingCycle.schedule[currentEditorDay].push({ time, text });
    
    addCycleEventModal.classList.remove('active');
    renderEditorEvents();
};

document.getElementById('cancelCycleBtn').onclick = () => {
    cycleEditorModal.classList.remove('active');
    manageCyclesModal.classList.add('active');
};

document.getElementById('saveCycleBtn').onclick = () => {
    const name = document.getElementById('cycleNameInput').value.trim();
    if (!name) return alert("Введіть назву розкладу!");
    
    editingCycle.name = name;
    
    const existingIndex = cycles.findIndex(c => c.id === editingCycle.id);
    if (existingIndex !== -1) {
        cycles[existingIndex] = editingCycle; 
    } else {
        cycles.push(editingCycle); 
        if (!activeCycleId) activeCycleId = editingCycle.id; 
    }
    
    saveData();
    cycleEditorModal.classList.remove('active');
    manageCyclesModal.classList.add('active');
    renderCyclesList();
    renderCalendar();
    renderEvents();
};

document.getElementById('prevBtn').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
};
document.getElementById('nextBtn').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
};

// Старт
renderCalendar();
renderEvents();
