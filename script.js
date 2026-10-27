let tg = window.Telegram.WebApp;
tg.expand();

let currentDate = new Date();
let selectedDate = new Date(); 

// Бази даних (зберігаються в пам'яті телефону)
let singleEvents = JSON.parse(localStorage.getItem('singleEvents')) || {}; 
let recurringEvents = JSON.parse(localStorage.getItem('recurringEvents')) || []; 

const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
const daysGrid = document.getElementById('daysGrid');
const monthYearLabel = document.getElementById('monthYear');

// Елементи модального вікна
const modal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const eventText = document.getElementById('eventText');
const eventTime = document.getElementById('eventTime');
const recurringOptions = document.getElementById('recurringOptions');
const wdButtons = document.querySelectorAll('.wd-btn');

let isCreatingRecurring = false;
let selectedWeekdays = [];

function saveData() {
    localStorage.setItem('singleEvents', JSON.stringify(singleEvents));
    localStorage.setItem('recurringEvents', JSON.stringify(recurringEvents));
}

function getDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getEventsForDay(date) {
    const dateStr = getDateString(date);
    const dayOfWeek = date.getDay(); 
    let dayEvents = [];
    
    // Звичайні події
    if (singleEvents[dateStr]) {
        dayEvents = singleEvents[dateStr].map(e => ({...e, isRecurring: false, originalDate: dateStr}));
    }
    
    // Циклічні події
    recurringEvents.forEach(rec => {
        if (rec.days.includes(dayOfWeek)) {
            dayEvents.push({
                time: rec.time,
                text: rec.text,
                isRecurring: true
            });
        }
    });
    
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
            
            const deleteBtn = !event.isRecurring ? `<button class="delete-btn" onclick="deleteEvent('${dateStr}', ${index})">✕</button>` : '';
            
            item.innerHTML = `
                <div class="event-content">
                    <span class="event-time">${event.time}</span>
                    <span>${event.text} ${event.isRecurring ? '<span class="event-recurring-badge">цикл</span>' : ''}</span>
                </div>
                ${deleteBtn}
            `;
            eventsList.appendChild(item);
        });
    }
}

window.deleteEvent = function(dateStr, index) {
    if(confirm("Видалити цю подію?")) {
        singleEvents[dateStr].splice(index, 1);
        if (singleEvents[dateStr].length === 0) delete singleEvents[dateStr];
        saveData();
        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
        renderCalendar();
        renderEvents();
    }
};

// --- МОДАЛЬНЕ ВІКНО ---
document.getElementById('addSingleBtn').onclick = () => {
    isCreatingRecurring = false;
    modalTitle.innerText = "Подія на " + selectedDate.getDate() + " число";
    recurringOptions.classList.add('hidden');
    eventText.value = '';
    modal.classList.add('active');
};

document.getElementById('addRecurringBtn').onclick = () => {
    isCreatingRecurring = true;
    modalTitle.innerText = "Циклічний розклад";
    recurringOptions.classList.remove('hidden');
    eventText.value = '';
    selectedWeekdays = [];
    wdButtons.forEach(btn => btn.classList.remove('selected'));
    modal.classList.add('active');
};

document.getElementById('cancelEventBtn').onclick = () => {
    modal.classList.remove('active');
};

wdButtons.forEach(btn => {
    btn.onclick = () => {
        const day = parseInt(btn.dataset.day);
        if (selectedWeekdays.includes(day)) {
            selectedWeekdays = selectedWeekdays.filter(d => d !== day);
            btn.classList.remove('selected');
        } else {
            selectedWeekdays.push(day);
            btn.classList.add('selected');
        }
    };
});

document.getElementById('saveEventBtn').onclick = () => {
    const text = eventText.value.trim();
    const time = eventTime.value;
    if (!text) return alert("Введіть назву події!");

    if (isCreatingRecurring) {
        if (selectedWeekdays.length === 0) return alert("Оберіть хоча б один день тижня!");
        recurringEvents.push({ text, time, days: selectedWeekdays });
    } else {
        const dateStr = getDateString(selectedDate);
        if (!singleEvents[dateStr]) singleEvents[dateStr] = [];
        singleEvents[dateStr].push({ text, time });
    }

    saveData();
    modal.classList.remove('active');
    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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