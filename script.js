(function(){
    const board = document.getElementById('itinerary-board');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalList = document.getElementById('modal-itinerary-list');
    const modalClose = document.getElementById('modal-close');
    const notesTextarea = document.getElementById('notes');
    const photoUpload = document.getElementById('photo-upload');
    const photoPreviews = document.getElementById('photo-previews');
    const datePicker = document.getElementById('date-picker');

    // Budget tracker elements
    const budgetForm = document.getElementById('budget-form');
    const budgetDaySelect = document.getElementById('budget-day');
    const expenseDescInput = document.getElementById('expense-desc');
    const expenseAmountInput = document.getElementById('expense-amount');
    const budgetList = document.getElementById('budget-list');
    const budgetTotalElem = document.getElementById('budget-total');

    let draggedElem = null;
    let placeholder = null;

    // Updated itinerary with timeslots
    const itineraries = {
      1: {
        title: 'Day 1: Arrival and City Tour',
        tasks: [
          { time: "09:00", task: 'Check-in at hotel and refresh' },
          { time: "11:00", task: 'Guided city tour visiting landmarks and markets' },
          { time: "18:30", task: 'Optional welcome dinner at local restaurant' }
        ]
      },
      2: {
        title: 'Day 2: Museum Visit',
        tasks: [
          { time: "08:00", task: 'Breakfast at the hotel' },
          { time: "09:30", task: 'Explore famous museums' },
          { time: "14:00", task: 'Optional workshops in the afternoon' }
        ]
      },
      3: {
        title: 'Day 3: Beach and Relaxation',
        tasks: [
          { time: "10:00", task: 'Leisurely morning' },
          { time: "12:00", task: 'Beach activities and water sports' },
          { time: "19:00", task: 'Evening bonfire and barbecue' }
        ]
      },
      4: {
        title: 'Day 4: Hiking and Nature Walk',
        tasks: [
          { time: "06:00", task: 'Early morning scenic hike' },
          { time: "09:30", task: 'Guided nature walk on flora and fauna' },
          { time: "13:00", task: 'Picnic lunch outdoors' }
        ]
      },
      5: {
        title: 'Day 5: Shopping and Departure',
        tasks: [
          { time: "08:00", task: 'Morning for last-minute shopping or sightseeing' },
          { time: "12:00", task: 'Pack and check-out from hotel' },
          { time: "15:00", task: 'Transport to airport for departure' }
        ]
      }
    };

    // Utility functions --------------------------------------------------
    function createPlaceholder(height) {
      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.style.height = height + 'px';
      return ph;
    }

    function formatDate(date) {
      return date.toISOString().slice(0,10);
    }

    // Load stored date or default to today
    function loadDate(day) {
      const storedDate = localStorage.getItem(`date-day-${day}`);
      if(storedDate) return storedDate;
      return formatDate(new Date());
    }
    function saveDate(day, date) {
      localStorage.setItem(`date-day-${day}`, date);
    }

    // Notes
    function loadNotes(day) {
      const saved = localStorage.getItem(`notes-day-${day}`);
      notesTextarea.value = saved || '';
    }
    function saveNotes(day) {
      localStorage.setItem(`notes-day-${day}`, notesTextarea.value);
    }

    // Media storage
    function loadPhotos(day) {
      photoPreviews.innerHTML = '';
      const items = JSON.parse(localStorage.getItem(`media-day-${day}`) || '[]');
      items.forEach(item => {
        if(item.type === 'image'){
          const img = document.createElement('img');
          img.src = item.data;
          img.alt = "Uploaded photo";
          photoPreviews.appendChild(img);
        } else if(item.type === 'video'){
          const video = document.createElement('video');
          video.src = item.data;
          video.controls = true;
          video.title = "Uploaded video";
          photoPreviews.appendChild(video);
        }
      });
    }
    function savePhotos(day, mediaArray) {
      localStorage.setItem(`media-day-${day}`, JSON.stringify(mediaArray));
    }
    function readFilesAndPreview(files) {
      const mediaItems = [];
      const promises = [];
      Array.from(files).forEach(file => {
        if(!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
        const reader = new FileReader();
        const promise = new Promise(resolve => {
          reader.onload = e => {
            mediaItems.push({type: file.type.startsWith('image/') ? 'image' : 'video', data: e.target.result});
            resolve();
          };
        });
        promises.push(promise);
        reader.readAsDataURL(file);
      });
      return Promise.all(promises).then(() => mediaItems);
    }

    // Render tasks with time slots
    function renderTasks(dayInfo) {
      modalList.innerHTML = '';
      dayInfo.tasks.forEach(({time, task}) => {
        const li = document.createElement('li');
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time-slot';
        timeSpan.textContent = time;
        li.appendChild(timeSpan);
        li.append(task);
        modalList.appendChild(li);
      });
    }

    // Drag & Drop Logic --------------------------------------------------
    board.addEventListener('dragstart', (e) => {
      if (e.target && e.target.classList.contains('day-plan')) {
        draggedElem = e.target;
        draggedElem.classList.add('dragging');
        placeholder = createPlaceholder(draggedElem.offsetHeight);
        draggedElem.parentNode.insertBefore(placeholder, draggedElem.nextSibling);
        setTimeout(() => {
          draggedElem.style.display = 'none';
        }, 0);
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    board.addEventListener('dragend', (e) => {
      if(draggedElem) {
        draggedElem.classList.remove('dragging');
        draggedElem.style.display = 'flex';
        if(placeholder) {
          board.insertBefore(draggedElem, placeholder);
          placeholder.remove();
          placeholder = null;
        }
        draggedElem = null;
      }
    });

    board.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedElem) return;
      let afterElement = getDragAfterElement(board, e.clientY);
      if (afterElement === null) {
        if (placeholder && placeholder.nextSibling !== null) {
          board.insertBefore(placeholder, null);
        }
      } else {
        if(placeholder !== null && afterElement !== placeholder.nextSibling) {
          board.insertBefore(placeholder, afterElement);
        }
      }
    });

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.day-plan:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if(offset < 0 && offset > closest.offset) {
          return {offset: offset, element: child};
        } else {
          return closest;
        }
      }, {offset: Number.NEGATIVE_INFINITY}).element || null;
    }

    // Open modal on click -------------------------------------------
    board.addEventListener('click', e => {
      const target = e.target.closest('.day-plan');
      if (target && !target.classList.contains('dragging')) {
        const dayNum = target.getAttribute('data-day');
        if(!dayNum) return;
        const info = itineraries[dayNum];
        if(!info) return;

        modalTitle.textContent = info.title;
        renderTasks(info);

        datePicker.value = loadDate(dayNum);
        loadNotes(dayNum);
        loadPhotos(dayNum);

        modal.setAttribute('data-current-day', dayNum);
        budgetDaySelect.value = dayNum;
        renderBudgetList(dayNum);

        photoUpload.value = '';
        modal.classList.add('show');
        modalClose.focus();
      }
    });

    // Save notes on input
    notesTextarea.addEventListener('input', () => {
      const dayNum = modal.getAttribute('data-current-day');
      if(dayNum) saveNotes(dayNum);
    });
    // Save date on change
    datePicker.addEventListener('change', () => {
      const dayNum = modal.getAttribute('data-current-day');
      if(dayNum && datePicker.value) {
        saveDate(dayNum, datePicker.value);
      }
    });

    // Handle media upload & preview
    photoUpload.addEventListener('change', () => {
      const dayNum = modal.getAttribute('data-current-day');
      if(!dayNum) return;
      const files = photoUpload.files;
      if(files.length === 0) return;

      readFilesAndPreview(files).then(newMediaItems => {
        newMediaItems.forEach(item => {
          let el;
          if(item.type === 'image') {
            el = document.createElement('img');
            el.src = item.data;
            el.alt = "Uploaded photo";
          } else if(item.type === 'video') {
            el = document.createElement('video');
            el.src = item.data;
            el.controls = true;
            el.title = "Uploaded video";
          }
          if(el) photoPreviews.appendChild(el);
        });

        const existingMedia = JSON.parse(localStorage.getItem(`media-day-${dayNum}`) || '[]');
        const combinedMedia = existingMedia.concat(newMediaItems);
        savePhotos(dayNum, combinedMedia);
        photoUpload.value = '';
      });
    });

    // Modal close logic
    modalClose.addEventListener('click', () => {
      modal.classList.remove('show');
      modal.removeAttribute('data-current-day');
    });
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.classList.remove('show');
        modal.removeAttribute('data-current-day');
      }
    });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && modal.classList.contains('show')) {
        modal.classList.remove('show');
        modal.removeAttribute('data-current-day');
      }
    });

    // Vacation Budget Tracker functionality ---------------------------------
    // Storage key: expenses are stored as array of { day: Number, desc: String, amount: Number }

    function getExpenses() {
      return JSON.parse(localStorage.getItem('vacation-expenses') || '[]');
    }
    function saveExpenses(expenses) {
      localStorage.setItem('vacation-expenses', JSON.stringify(expenses));
    }
    function renderBudgetList(dayFilter = null) {
      let expenses = getExpenses();
      if(dayFilter) {
        expenses = expenses.filter(e=> e.day === Number(dayFilter));
      }
      budgetList.innerHTML = expenses.length === 0
        ? '<li>No expenses recorded.</li>'
        : expenses.map(e =>
            `<li><span>Day ${e.day}:</span> ${e.desc}<span>$${e.amount.toFixed(2)}</span></li>`
          ).join('');
      const total = expenses.reduce((sum,e)=> sum + e.amount, 0);
      budgetTotalElem.textContent = `Total Spent${dayFilter ? ' on Day '+dayFilter : ''}: $${total.toFixed(2)}`;
    }

    budgetForm.addEventListener('submit', e => {
      e.preventDefault();
      const day = Number(budgetDaySelect.value);
      const desc = expenseDescInput.value.trim();
      const amount = parseFloat(expenseAmountInput.value);
      if(!day || !desc || isNaN(amount) || amount < 0) {
        alert('Please enter valid day, description and amount.');
        return;
      }
      const expenses = getExpenses();
      expenses.push({day, desc, amount});
      saveExpenses(expenses);

      // Reset form input
      expenseDescInput.value = '';
      expenseAmountInput.value = '';
      budgetDaySelect.value = day; // keep same day selected

      // Refresh expense list and total
      renderBudgetList(day);
    });

    // Update expense list when changing day selection to filter expenses
    budgetDaySelect.addEventListener('change', () => {
      renderBudgetList(budgetDaySelect.value);
    });

    // Initial render with no filter (all expenses)
    renderBudgetList();

  })();