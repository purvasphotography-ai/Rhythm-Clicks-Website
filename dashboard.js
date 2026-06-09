import { firebaseConfig } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {

  // --- Configuration Check ---
  const isFirebaseActive = 
    firebaseConfig && 
    firebaseConfig.projectId && 
    !firebaseConfig.projectId.startsWith('YOUR_');

  // Local Mode Sync Channel
  let localChannel = null;

  // --- State Variables ---
  let currentUser = 'Priya'; // Active user identity
  let activeAssignee = ''; // Holds selected assignee during task compose
  let tasks = [];
  let previousTasksState = []; // Used to track changes for notification triggers
  let isInitialLoad = true; // Prevents spamming notifications for old tasks on boot

  // Firebase references
  let auth = null;
  let db = null;
  let firestoreUnsubscribe = null;
  let galleriesUnsubscribe = null;
  let contactsUnsubscribe = null;
  let galleries = [];
  let contacts = [];
  let searchFilter = '';

  // --- UI Elements ---
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginStatusMsg = document.getElementById('login-status-msg');
  const dashboardApp = document.getElementById('dashboard-app');
  const identityPillsContainer = document.getElementById('identity-pills-container');
  const identityPills = document.querySelectorAll('.identity-pill');
  const assigneePills = document.querySelectorAll('.assignee-pill');
  const myTasksList = document.getElementById('my-tasks-list');
  const sentTasksList = document.getElementById('sent-tasks-list');
  const myTaskCount = document.getElementById('my-task-count');
  const taskForm = document.getElementById('task-form');
  const taskText = document.getElementById('task-text');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplayLabel = document.getElementById('user-display-label');
  
  // Settings Modal Elements
  const settingsModal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const changePasswordForm = document.getElementById('change-password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const settingsStatusMsg = document.getElementById('settings-status-msg');

  // --- Web Audio API Chime Synth ---
  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;

      if (type === 'new_task') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'task_complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.log('Audio autoplay blocked or unsupported:', e);
    }
  };

  // --- Toast Notifications System ---
  const toastsContainer = document.getElementById('toasts-container');

  const showToast = (message, icon = '🔔', soundType = null) => {
    if (!toastsContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">${message}</div>
      <button class="toast-close">&times;</button>
    `;

    toastsContainer.appendChild(toast);
    toast.offsetHeight; // force reflow
    toast.classList.add('show');

    if (soundType) {
      playSound(soundType);
    }

    const autoRemove = setTimeout(() => {
      removeToast(toast);
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoRemove);
      removeToast(toast);
    });
  };

  const removeToast = (toast) => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  };

  // Helper to prevent HTML injection XSS
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Determine user identity from email address
  const getIdentityFromEmail = (email) => {
    const cleanEmail = email.toLowerCase();
    if (cleanEmail.includes('priya')) return 'Priya';
    if (cleanEmail.includes('purva')) return 'Purva';
    if (cleanEmail.includes('bijal')) return 'Bijal';
    return 'Priya'; // Default fallback
  };

  const getUserAvatarClass = (user) => {
    if (user === 'Priya') return 'priya-dot';
    if (user === 'Purva') return 'purva-dot';
    return 'bijal-dot';
  };

  // --- Rendering Functions ---

  const renderMyTasks = () => {
    if (!myTasksList) return;
    const myTasks = tasks.filter(t => {
      const matchesUser = t.assignee === currentUser;
      const matchesSearch = !searchFilter || 
        t.text.toLowerCase().includes(searchFilter) || 
        t.sender.toLowerCase().includes(searchFilter);
      return matchesUser && matchesSearch;
    });
    
    myTasks.sort((a, b) => {
      if (a.status === b.status) {
        return b.timestamp - a.timestamp;
      }
      return a.status === 'pending' ? -1 : 1;
    });

    myTaskCount.textContent = myTasks.filter(t => t.status === 'pending').length;

    if (myTasks.length === 0) {
      myTasksList.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">☕</div>
          <p>All caught up! No tasks assigned to you right now.</p>
        </li>
      `;
      return;
    }

    myTasksList.innerHTML = myTasks.map(task => {
      const isChecked = task.status === 'completed';
      const senderInitial = task.sender.substring(0, 2);
      const avatarClass = getUserAvatarClass(task.sender);
      const timeStr = new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(task.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return `
        <li class="task-item ${isChecked ? 'checked' : ''} from-${task.sender.toLowerCase()}" data-id="${task.id}">
          <div class="task-checkbox-wrapper">
            <div class="custom-checkbox" data-id="${task.id}" role="checkbox" aria-checked="${isChecked}"></div>
          </div>
          <div class="task-details">
            <p class="task-desc">${escapeHtml(task.text)}</p>
            <div class="task-meta">
              <span class="avatar-dot small ${avatarClass}" title="Assigned by ${task.sender}">${senderInitial}</span>
              <span>From ${task.sender}</span>
              <span>•</span>
              <span>${dateStr} ${timeStr}</span>
            </div>
          </div>
        </li>
      `;
    }).join('');

    myTasksList.querySelectorAll('.custom-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => {
        const taskId = e.target.getAttribute('data-id');
        toggleTaskCompletion(taskId);
      });
    });
  };

  const renderSentTasks = () => {
    if (!sentTasksList) return;
    const sentTasks = tasks.filter(t => {
      const matchesUser = t.sender === currentUser;
      const matchesSearch = !searchFilter || 
        t.text.toLowerCase().includes(searchFilter) || 
        t.assignee.toLowerCase().includes(searchFilter);
      return matchesUser && matchesSearch;
    });
    sentTasks.sort((a, b) => b.timestamp - a.timestamp);

    if (sentTasks.length === 0) {
      sentTasksList.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">📋</div>
          <p>You haven't assigned any tasks to others yet.</p>
        </li>
      `;
      return;
    }

    sentTasksList.innerHTML = sentTasks.map(task => {
      const isCompleted = task.status === 'completed';
      const assigneeInitial = task.assignee.substring(0, 2);
      const avatarClass = getUserAvatarClass(task.assignee);
      const timeStr = new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <li class="task-item ${isCompleted ? 'checked' : ''} to-${task.assignee.toLowerCase()}" data-id="${task.id}">
          <div class="task-details">
            <p class="task-desc">${escapeHtml(task.text)}</p>
            <div class="task-meta">
              <span class="avatar-dot small ${avatarClass}" title="Assigned to ${task.assignee}">${assigneeInitial}</span>
              <span>To ${task.assignee}</span>
              <span>•</span>
              <span>${timeStr}</span>
              <span>•</span>
              <span class="status-badge ${task.status}">${task.status}</span>
            </div>
          </div>
          <button class="btn-delete-task" data-id="${task.id}" title="Delete task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </li>
      `;
    }).join('');

    sentTasksList.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-task');
        const taskId = button.getAttribute('data-id');
        deleteTask(taskId);
      });
    });
  };

  const renderDashboard = () => {
    renderMyTasks();
    renderSentTasks();
  };

  const renderGalleries = () => {
    const listArrived = document.getElementById('list-arrived');
    const listSelected = document.getElementById('list-selected');
    const listEdited = document.getElementById('list-edited');
    const listDelivered = document.getElementById('list-delivered');

    const countArrived = document.getElementById('count-arrived');
    const countSelected = document.getElementById('count-selected');
    const countEdited = document.getElementById('count-edited');
    const countDelivered = document.getElementById('count-delivered');

    if (!listArrived || !listSelected || !listEdited || !listDelivered) return;

    listArrived.innerHTML = '';
    listSelected.innerHTML = '';
    listEdited.innerHTML = '';
    listDelivered.innerHTML = '';

    let arrivedCount = 0;
    let selectedCount = 0;
    let editedCount = 0;
    let deliveredCount = 0;

    const filteredGalleries = galleries.filter(g => {
      return !searchFilter || 
        g.clientName.toLowerCase().includes(searchFilter) || 
        (g.notes && g.notes.toLowerCase().includes(searchFilter));
    });

    filteredGalleries.forEach(gallery => {
      const dateStr = new Date(gallery.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeStr = new Date(gallery.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let actionBtn = '';
      if (gallery.status === 'arrived') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="selected" title="Mark selected on PC">Selected ➡️</button>`;
        arrivedCount++;
      } else if (gallery.status === 'selected') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="edited" title="Mark edited by Priya">Edited ➡️</button>`;
        selectedCount++;
      } else if (gallery.status === 'edited') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="delivered" title="Mark delivered to client">Delivered ✓</button>`;
        editedCount++;
      } else if (gallery.status === 'delivered') {
        deliveredCount++;
      }

      // Build workflow phase timeline
      let timelineHtml = `
        <div class="gallery-timestamps-timeline">
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Arrived</span>
            <span class="gallery-timestamp-val">${dateStr} • ${timeStr}</span>
          </div>
      `;
      if (gallery.selectionDate) {
        const sDate = new Date(gallery.selectionDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const sTime = new Date(gallery.selectionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Selected</span>
            <span class="gallery-timestamp-val">${sDate} • ${sTime}</span>
          </div>
        `;
      }
      if (gallery.editedDate) {
        const eDate = new Date(gallery.editedDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const eTime = new Date(gallery.editedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Edited</span>
            <span class="gallery-timestamp-val">${eDate} • ${eTime}</span>
          </div>
        `;
      }
      if (gallery.deliveredDate) {
        const dDate = new Date(gallery.deliveredDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const dTime = new Date(gallery.deliveredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Delivered</span>
            <span class="gallery-timestamp-val">${dDate} • ${dTime}</span>
          </div>
        `;
      }
      timelineHtml += `</div>`;

      const item = document.createElement('li');
      item.className = 'gallery-card';
      item.innerHTML = `
        <h4 class="gallery-title">${escapeHtml(gallery.clientName)}</h4>
        ${timelineHtml}
        ${gallery.notes ? `<p class="gallery-notes" style="margin-top: 4px;">${escapeHtml(gallery.notes)}</p>` : ''}
        <div class="gallery-actions">
          ${actionBtn}
          <button class="btn-edit-gallery" data-id="${gallery.id}" title="Edit gallery" style="margin-right: 0.25rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-gallery" data-id="${gallery.id}" title="Delete gallery">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;

      if (gallery.status === 'arrived') {
        listArrived.appendChild(item);
      } else if (gallery.status === 'selected') {
        listSelected.appendChild(item);
      } else if (gallery.status === 'edited') {
        listEdited.appendChild(item);
      } else if (gallery.status === 'delivered') {
        listDelivered.appendChild(item);
      }
    });

    if (countArrived) countArrived.textContent = arrivedCount;
    if (countSelected) countSelected.textContent = selectedCount;
    if (countEdited) countEdited.textContent = editedCount;
    if (countDelivered) countDelivered.textContent = deliveredCount;

    // Attach listeners
    document.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const nextStatus = e.target.getAttribute('data-status');
        window.moveGallery(id, nextStatus);
      });
    });

    document.querySelectorAll('.btn-delete-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-gallery');
        const id = button.getAttribute('data-id');
        window.deleteGallery(id);
      });
    });

    // Attach edit listeners
    document.querySelectorAll('.btn-edit-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-gallery');
        const id = button.getAttribute('data-id');
        const gallery = galleries.find(g => g.id === id);
        if (gallery) {
          document.getElementById('edit-gallery-id').value = gallery.id;
          document.getElementById('edit-gallery-client-name').value = gallery.clientName;
          document.getElementById('edit-gallery-notes-input').value = gallery.notes || '';
          document.getElementById('edit-gallery-status-select').value = gallery.status;
          
          const editGalleryModal = document.getElementById('edit-gallery-modal');
          editGalleryModal.style.display = 'flex';
          editGalleryModal.offsetHeight; // force reflow
          editGalleryModal.classList.remove('hidden');
        }
      });
    });
  };

  const setupAutocomplete = (inputEl, autocompleteListEl) => {
    if (!inputEl || !autocompleteListEl) return;

    const renderAutocompleteDropdown = (query) => {
      const q = query.toLowerCase().trim();
      if (!q) {
        autocompleteListEl.innerHTML = '';
        autocompleteListEl.classList.remove('show');
        return;
      }

      // Filter contacts whose name includes the query
      const matches = contacts.filter(c => c.name.toLowerCase().includes(q));

      if (matches.length === 0) {
        autocompleteListEl.innerHTML = '';
        autocompleteListEl.classList.remove('show');
        return;
      }

      autocompleteListEl.innerHTML = matches.map(c => `
        <li class="autocomplete-item" data-value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</li>
      `).join('');
      autocompleteListEl.classList.add('show');

      // Attach click events to the items
      autocompleteListEl.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', (e) => {
          inputEl.value = e.target.getAttribute('data-value');
          autocompleteListEl.innerHTML = '';
          autocompleteListEl.classList.remove('show');
        });
      });
    };

    // Listeners
    inputEl.addEventListener('input', (e) => {
      renderAutocompleteDropdown(e.target.value);
    });

    inputEl.addEventListener('focus', (e) => {
      renderAutocompleteDropdown(e.target.value);
    });

    // Close on blur (with a small timeout so click triggers first)
    inputEl.addEventListener('blur', () => {
      setTimeout(() => {
        autocompleteListEl.classList.remove('show');
      }, 250);
    });
  };

  const renderContacts = () => {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filteredContacts = contacts.filter(c => {
      return !searchFilter ||
        c.name.toLowerCase().includes(searchFilter) ||
        c.phone.toLowerCase().includes(searchFilter) ||
        (c.email && c.email.toLowerCase().includes(searchFilter)) ||
        (c.notes && c.notes.toLowerCase().includes(searchFilter));
    });

    if (filteredContacts.length === 0) {
      grid.innerHTML = `
        <li class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">👥</div>
          <p>${searchFilter ? 'No contacts match your search.' : 'No client contacts saved yet.'}</p>
        </li>
      `;
      return;
    }

    grid.innerHTML = filteredContacts.map(contact => {
      const initial = contact.name.substring(0, 1).toUpperCase();
      
      return `
        <li class="contact-card" data-id="${contact.id}">
          <div class="contact-card-header">
            <div class="contact-avatar">${initial}</div>
            <h3 class="gallery-title" style="margin: 0;">${escapeHtml(contact.name)}</h3>
          </div>
          <div class="contact-details-box">
            <div class="contact-detail-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <a href="tel:${contact.phone}">${escapeHtml(contact.phone)}</a>
            </div>
            ${contact.email ? `
            <div class="contact-detail-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <a href="mailto:${contact.email}">${escapeHtml(contact.email)}</a>
            </div>` : ''}
            ${contact.notes ? `
            <div class="contact-detail-row" style="align-items: flex-start;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 2px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span style="font-size: 0.8rem; word-break: break-word;">${escapeHtml(contact.notes)}</span>
            </div>` : ''}
          </div>
          <div class="contact-card-actions">
            <button class="btn-edit-contact" data-id="${contact.id}" title="Edit contact" style="margin-right: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-delete-gallery btn-delete-contact" data-id="${contact.id}" title="Delete contact">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');

    // Attach delete listeners
    grid.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-contact');
        const id = button.getAttribute('data-id');
        window.deleteContact(id);
      });
    });

    // Attach edit listeners
    grid.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-contact');
        const id = button.getAttribute('data-id');
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          document.getElementById('edit-contact-id').value = contact.id;
          document.getElementById('edit-contact-name').value = contact.name;
          document.getElementById('edit-contact-phone').value = contact.phone;
          document.getElementById('edit-contact-email').value = contact.email || '';
          document.getElementById('edit-contact-notes').value = contact.notes || '';
          
          const editContactModal = document.getElementById('edit-contact-modal');
          editContactModal.style.display = 'flex';
          editContactModal.offsetHeight; // force reflow
          editContactModal.classList.remove('hidden');
        }
      });
    });
  };

  // --- Notification Event Trigger Engine ---
  const checkForTaskStateUpdates = () => {
    if (isInitialLoad) {
      isInitialLoad = false;
      previousTasksState = JSON.parse(JSON.stringify(tasks));
      return;
    }

    tasks.forEach(task => {
      const oldTask = previousTasksState.find(t => t.id === task.id);

      if (!oldTask) {
        // A new task was added globally!
        // If assigned to us and created in the last 30 seconds
        if (task.assignee === currentUser && task.sender !== currentUser && (Date.now() - task.timestamp < 30000)) {
          showToast(`<strong>${task.sender}</strong> sent you a task: "${task.text.substring(0, 30)}..."`, '📥', 'new_task');
        }
      } else {
        // An existing task status changed!
        if (oldTask.status === 'pending' && task.status === 'completed') {
          // If we are the sender, notify us that the assignee checked it off
          if (task.sender === currentUser && task.assignee !== currentUser) {
            showToast(`<strong>${task.assignee}</strong> completed your task: "${task.text.substring(0, 30)}..."`, '✓', 'task_complete');
          }
        }
      }
    });

    previousTasksState = JSON.parse(JSON.stringify(tasks));
  };


  if (isFirebaseActive) {
    // ==========================================================================
    // 1. GLOBAL MODE IMPLEMENTATION (Firebase Firestore + Auth)
    // ==========================================================================
    
    console.log('Booting in Secure Global Mode (Firebase active)');
    loginStatusMsg.textContent = 'Enter studio credentials to sign in.';

    // Dynamic Module Imports of Firebase Web SDKs
    let firebaseApp, firebaseFirestore, firebaseAuth;
    try {
      firebaseApp = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      firebaseAuth = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    } catch (err) {
      console.error('Failed to import Firebase modules from CDN:', err);
      loginStatusMsg.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Connection error. Check internet link.</span>';
      return;
    }

    const app = firebaseApp.initializeApp(firebaseConfig);
    auth = firebaseAuth.getAuth(app);
    db = firebaseFirestore.getFirestore(app);

    // Setup Auth Listener
    firebaseAuth.onAuthStateChanged(auth, (user) => {
      if (user) {
        // Auth success!
        currentUser = getIdentityFromEmail(user.email);
        console.log(`Authenticated securely as ${currentUser} (${user.email})`);

        // Update UI states
        loginOverlay.classList.add('hidden');
        dashboardApp.style.display = 'flex';
        logoutBtn.style.display = 'block';
        userDisplayLabel.textContent = `Viewing secure board:`;

        // Configure workspace selector (disable switching to other users' views)
        identityPills.forEach(pill => {
          const pillUser = pill.getAttribute('data-user');
          if (pillUser === currentUser) {
            pill.classList.add('active');
            pill.style.display = 'inline-flex';
          } else {
            pill.classList.remove('active');
            pill.style.display = 'none'; // Lock views
          }
        });

        // Initialize compose assignees options
        assigneePills.forEach(pill => {
          const name = pill.getAttribute('data-assignee');
          if (name === currentUser) {
            pill.style.display = 'none';
            pill.classList.remove('active');
          } else {
            pill.style.display = 'inline-flex';
          }
        });

        // Pick default assignee
        const defAssignee = Array.from(assigneePills).find(p => p.getAttribute('data-assignee') !== currentUser);
        if (defAssignee) {
          activeAssignee = defAssignee.getAttribute('data-assignee');
          assigneePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-assignee') === activeAssignee));
        }

        // Setup Firestore Snapshots Listener
        if (firestoreUnsubscribe) firestoreUnsubscribe();
        
        const tasksQuery = firebaseFirestore.query(
          firebaseFirestore.collection(db, "tasks"), 
          firebaseFirestore.orderBy("timestamp", "asc")
        );

        isInitialLoad = true;
        firestoreUnsubscribe = firebaseFirestore.onSnapshot(tasksQuery, (snapshot) => {
          tasks = [];
          snapshot.forEach(doc => {
            tasks.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          renderDashboard();
          checkForTaskStateUpdates();
        }, (error) => {
          console.error('Firestore subscription error:', error);
          showToast('Database access denied. Verify permissions.', '⚠️');
        });

        // Setup Firestore Galleries Snapshots Listener
        if (galleriesUnsubscribe) galleriesUnsubscribe();

        const galleriesQuery = firebaseFirestore.query(
          firebaseFirestore.collection(db, "galleries"),
          firebaseFirestore.orderBy("timestamp", "asc")
        );

        galleriesUnsubscribe = firebaseFirestore.onSnapshot(galleriesQuery, (snapshot) => {
          galleries = [];
          snapshot.forEach(doc => {
            galleries.push({
              id: doc.id,
              ...doc.data()
            });
          });
          renderGalleries();
        }, (error) => {
          console.error('Firestore galleries subscription error:', error);
        });

        // Setup Firestore Contacts Snapshots Listener
        if (contactsUnsubscribe) contactsUnsubscribe();

        const contactsQuery = firebaseFirestore.query(
          firebaseFirestore.collection(db, "contacts"),
          firebaseFirestore.orderBy("name", "asc")
        );

        contactsUnsubscribe = firebaseFirestore.onSnapshot(contactsQuery, (snapshot) => {
          contacts = [];
          snapshot.forEach(doc => {
            contacts.push({
              id: doc.id,
              ...doc.data()
            });
          });
          renderContacts();
        }, (error) => {
          console.error('Firestore contacts subscription error:', error);
        });

      } else {
        // Sign-out states
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        if (galleriesUnsubscribe) {
          galleriesUnsubscribe();
          galleriesUnsubscribe = null;
        }
        if (contactsUnsubscribe) {
          contactsUnsubscribe();
          contactsUnsubscribe = null;
        }
        tasks = [];
        previousTasksState = [];
        galleries = [];
        contacts = [];
        renderDashboard();
        renderGalleries();
        renderContacts();
        
        loginOverlay.classList.remove('hidden');
        dashboardApp.style.display = 'none';
        logoutBtn.style.display = 'none';
      }
    });

    // Form sign-in submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      loginStatusMsg.textContent = 'Verifying credentials...';

      firebaseAuth.signInWithEmailAndPassword(auth, email, password)
        .then(() => {
          loginForm.reset();
        })
        .catch((error) => {
          console.error('Sign-in failed:', error);
          loginStatusMsg.innerHTML = '<span style="color: #d32f2f;">Invalid email address or password.</span>';
          showToast('Login failed. Please check credentials.', '❌');
        });
    });

    // Logout trigger
    logoutBtn.addEventListener('click', () => {
      firebaseAuth.signOut(auth)
        .then(() => {
          showToast('Signed out cleanly', '🔒');
        })
        .catch(err => console.error('Sign out error:', err));
    });

    // Add task
    window.addTask = async (text, assignee) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "tasks"), {
          text: text.trim(),
          sender: currentUser,
          assignee: assignee,
          status: 'pending',
          timestamp: Date.now()
        });
        showToast(`Task assigned to <strong>${assignee}</strong>`, '📤');
      } catch (err) {
        console.error('Failed to add task to Firestore:', err);
        showToast('Failed to save task. Try again.', '⚠️');
      }
    };

    // Complete task
    window.toggleTaskCompletion = async (id) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';

      try {
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "tasks", id), {
          status: newStatus
        });
        if (newStatus === 'completed') {
          showToast(`Completed task: "${task.text.substring(0, 20)}..."`, '✓', 'task_complete');
        }
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    };

    // Delete task
    window.deleteTask = async (id) => {
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "tasks", id));
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    };

    // Clear completed tasks
    clearCompletedBtn.addEventListener('click', async () => {
      const completedSentTasks = tasks.filter(t => t.sender === currentUser && t.status === 'completed');
      if (completedSentTasks.length === 0) {
        showToast('No completed sent tasks to clear.', 'ℹ️');
        return;
      }

      try {
        const batch = firebaseFirestore.writeBatch(db);
        completedSentTasks.forEach(task => {
          const docRef = firebaseFirestore.doc(db, "tasks", task.id);
          batch.delete(docRef);
        });

        await batch.commit();
        showToast(`Cleared ${completedSentTasks.length} completed tasks from logs`, '🧹');
      } catch (err) {
        console.error('Batch delete failed:', err);
        showToast('Failed to clear logs.', '⚠️');
      }
    });

    // Handle Password Update for Firebase
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = newPasswordInput.value;
      const confirmPass = confirmPasswordInput.value;
      
      if (newPass !== confirmPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">New passwords do not match.</span>';
        return;
      }
      if (newPass.length < 6) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Password must be at least 6 characters.</span>';
        return;
      }
      
      settingsStatusMsg.textContent = 'Updating password globally...';
      try {
        await firebaseAuth.updatePassword(auth.currentUser, newPass);
        showToast('Password updated globally!', '🔑');
        
        // Hide modal
        settingsModal.classList.add('hidden');
        setTimeout(() => settingsModal.style.display = 'none', 400);
      } catch (error) {
        console.error('Firebase password update failed:', error);
        if (error.code === 'auth/requires-recent-login') {
          settingsStatusMsg.innerHTML = '<span style="color: #d32f2f; font-weight: 500;">Security timeout. Please Logout and Log back in to update password.</span>';
          showToast('Logout and login required for security.', '⚠️');
        } else {
          settingsStatusMsg.innerHTML = `<span style="color: #d32f2f;">${error.message}</span>`;
        }
      }
    });

    // --- Assign form submit actions ---
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskText.value;
        if (!text.trim() || !activeAssignee) return;

        window.addTask(text, activeAssignee);
        taskText.value = '';
      });
    }

    // --- Gallery database actions ---
    window.addGallery = async (clientName, notes) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "galleries"), {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: 'arrived',
          timestamp: Date.now(),
          selectionDate: null,
          editedDate: null,
          deliveredDate: null
        });
        showToast(`Gallery <strong>${clientName}</strong> registered`, '📸');
      } catch (err) {
        console.error('Failed to add gallery:', err);
        showToast('Failed to register gallery. Try again.', '⚠️');
      }
    };

    window.moveGallery = async (id, nextStatus) => {
      try {
        const existing = galleries.find(g => g.id === id);
        const updateFields = { status: nextStatus };
        if (existing) {
          if (nextStatus === 'selected') {
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
          } else if (nextStatus === 'edited') {
            updateFields.deliveredDate = null;
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
            if (!existing.editedDate) updateFields.editedDate = Date.now();
          } else if (nextStatus === 'delivered') {
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
            if (!existing.editedDate) updateFields.editedDate = Date.now();
            if (!existing.deliveredDate) updateFields.deliveredDate = Date.now();
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "galleries", id), updateFields);
        showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
      } catch (err) {
        console.error('Failed to update gallery status:', err);
      }
    };

    window.updateGallery = async (id, clientName, notes, status) => {
      try {
        const existing = galleries.find(g => g.id === id);
        const updateFields = {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: status
        };
        if (existing) {
          if (status === 'arrived') {
            updateFields.selectionDate = null;
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
          } else if (status === 'selected') {
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
          } else if (status === 'edited') {
            updateFields.deliveredDate = null;
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
            if (!existing.editedDate) updateFields.editedDate = Date.now();
          } else if (status === 'delivered') {
            if (!existing.selectionDate) updateFields.selectionDate = Date.now();
            if (!existing.editedDate) updateFields.editedDate = Date.now();
            if (!existing.deliveredDate) updateFields.deliveredDate = Date.now();
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "galleries", id), updateFields);
        showToast(`Gallery updated`, '📝');
      } catch (err) {
        console.error('Failed to update gallery:', err);
      }
    };

    window.deleteGallery = async (id) => {
      if (!confirm('Are you sure you want to delete this gallery entry?')) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "galleries", id));
        showToast('Gallery entry deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete gallery:', err);
      }
    };

    window.addContact = async (name, phone, email, notes) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "contacts"), {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          timestamp: Date.now()
        });
        showToast(`Contact <strong>${name}</strong> saved`, '👥');
      } catch (err) {
        console.error('Failed to add contact:', err);
        showToast('Failed to save contact. Try again.', '⚠️');
      }
    };

    window.updateContact = async (id, name, phone, email, notes) => {
      try {
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "contacts", id), {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim()
        });
        showToast(`Contact <strong>${name}</strong> updated`, '👥');
      } catch (err) {
        console.error('Failed to update contact:', err);
        showToast('Failed to update contact. Try again.', '⚠️');
      }
    };

    window.deleteContact = async (id) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "contacts", id));
        showToast('Contact deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete contact:', err);
      }
    };
  }
  // ==========================================================================
  // 2. LOCAL FALLBACK MODE IMPLEMENTATION (LocalStorage + BroadcastChannel)
  // ==========================================================================
  else {
    console.log('Booting in Local Offline Fallback Mode');
    loginStatusMsg.innerHTML = 'Workspace ready. <span style="font-weight:700; color: #2E7D32;">Local Mode Active.</span>';
    
    // Customize login card for local simulation
    const submitBtn = loginForm.querySelector('.login-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Enter Local Board';
    loginEmail.placeholder = 'Enter email address';
    loginPassword.placeholder = 'Enter password';
    
    // Define local passwords loader/saver for testing offline
    const getLocalAccounts = () => {
      const stored = localStorage.getItem('rhythm_clicks_local_accounts');
      return stored ? JSON.parse(stored) : {
        'priya': 'rhythm123',
        'purva': 'rhythm123',
        'bijal': 'rhythm123'
      };
    };

    // Enable Local Channel
    localChannel = new BroadcastChannel('rhythm_clicks_workflow_channel');

    const loadLocalTasks = () => {
      const raw = localStorage.getItem('rhythm_clicks_tasks');
      tasks = raw ? JSON.parse(raw) : [];
      renderDashboard();
    };

    const saveLocalTasks = () => {
      localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(tasks));
    };

    const loadLocalGalleries = () => {
      const raw = localStorage.getItem('rhythm_clicks_galleries');
      galleries = raw ? JSON.parse(raw) : [];
      renderGalleries();
    };

    const saveLocalGalleries = () => {
      localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(galleries));
    };

    const loadLocalContacts = () => {
      const raw = localStorage.getItem('rhythm_clicks_contacts');
      contacts = raw ? JSON.parse(raw) : [];
      renderContacts();
    };

    const saveLocalContacts = () => {
      localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(contacts));
    };

    // Handle Local Login Submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = loginEmail.value.trim().toLowerCase();
      const passwordVal = loginPassword.value;

      // Identify user key
      let userKey = '';
      if (val.includes('priya')) userKey = 'priya';
      else if (val.includes('purva')) userKey = 'purva';
      else if (val.includes('bijal')) userKey = 'bijal';

      // Validate passcode using local accounts persistence
      const accounts = getLocalAccounts();
      if (!userKey || accounts[userKey] !== passwordVal) {
        loginStatusMsg.innerHTML = '<span style="color: #d32f2f;">Invalid password for local user.</span>';
        showToast('Incorrect password.', '❌');
        return;
      }
      
      currentUser = userKey === 'priya' ? 'Priya' : (userKey === 'purva' ? 'Purva' : 'Bijal');

      loginOverlay.classList.add('hidden');
      dashboardApp.style.display = 'flex';
      logoutBtn.style.display = 'block';
      userDisplayLabel.textContent = `Viewing local board:`;

      // Load initial state
      loadLocalTasks();
      loadLocalGalleries();
      loadLocalContacts();
      isInitialLoad = true;
      checkForTaskStateUpdates();

      // Configure manual identity switcher pills (Locked to logged in user)
      identityPills.forEach(pill => {
        const pillUser = pill.getAttribute('data-user');
        if (pillUser === currentUser) {
          pill.style.display = 'inline-flex';
          pill.classList.add('active');
        } else {
          pill.style.display = 'none';
          pill.classList.remove('active');
        }
      });

      // Update compose assignees options
      selectIdentity(currentUser);
      loginForm.reset();
      showToast(`Logged into local board as <strong>${currentUser}</strong>`, '🔒');
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
      loginOverlay.classList.remove('hidden');
      dashboardApp.style.display = 'none';
      logoutBtn.style.display = 'none';
      tasks = [];
      galleries = [];
      contacts = [];
      renderDashboard();
      renderGalleries();
      renderContacts();
    });

    // Handle Local Password Update
    changePasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPass = currentPasswordInput.value;
      const newPass = newPasswordInput.value;
      const confirmPass = confirmPasswordInput.value;

      const accounts = getLocalAccounts();
      const userKey = currentUser.toLowerCase();

      if (accounts[userKey] !== currentPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Incorrect current password.</span>';
        showToast('Verification failed.', '❌');
        return;
      }
      if (newPass !== confirmPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">New passwords do not match.</span>';
        return;
      }
      if (newPass.length < 6) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Password must be at least 6 characters.</span>';
        return;
      }

      accounts[userKey] = newPass;
      localStorage.setItem('rhythm_clicks_local_accounts', JSON.stringify(accounts));
      
      showToast('Password updated locally!', '🔑');
      settingsModal.classList.add('hidden');
      setTimeout(() => settingsModal.style.display = 'none', 400);
    });

    // Dynamic Identity switcher support (Local offline only)
    const selectIdentity = (name) => {
      currentUser = name;
      identityPills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-user') === name);
      });

      assigneePills.forEach(pill => {
        const pName = pill.getAttribute('data-assignee');
        if (pName === currentUser) {
          pill.style.display = 'none';
          pill.classList.remove('active');
        } else {
          pill.style.display = 'inline-flex';
        }
      });

      const nextAssignee = Array.from(assigneePills).find(p => p.getAttribute('data-assignee') !== currentUser);
      if (nextAssignee) {
        selectAssignee(nextAssignee.getAttribute('data-assignee'));
      }
      renderDashboard();
    };

    const selectAssignee = (name) => {
      activeAssignee = name;
      assigneePills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-assignee') === name);
      });
    };

    identityPills.forEach(pill => {
      pill.addEventListener('click', () => {
        selectIdentity(pill.getAttribute('data-user'));
      });
    });

    assigneePills.forEach(pill => {
      pill.addEventListener('click', () => {
        selectAssignee(pill.getAttribute('data-assignee'));
      });
    });

    // Custom Tasks operations mapping for Local mode
    window.addTask = (text, assignee) => {
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        text: text.trim(),
        sender: currentUser,
        assignee: assignee,
        status: 'pending',
        timestamp: Date.now()
      };

      tasks.push(newTask);
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'ADD_TASK',
        task: newTask
      });

      showToast(`Task assigned to <strong>${assignee}</strong>`, '📤');
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    window.toggleTaskCompletion = (id) => {
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return;

      const task = tasks[taskIndex];
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      
      task.status = newStatus;
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'COMPLETE_TASK',
        taskId: id,
        completedBy: currentUser,
        newStatus: newStatus
      });

      if (newStatus === 'completed') {
        showToast(`Completed task: "${task.text.substring(0, 20)}..."`, '✓', 'task_complete');
      }
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    window.deleteTask = (id) => {
      tasks = tasks.filter(t => t.id !== id);
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'DELETE_TASK',
        taskId: id
      });
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    clearCompletedBtn.addEventListener('click', () => {
      const beforeCount = tasks.length;
      const deletedIds = tasks
        .filter(t => t.sender === currentUser && t.status === 'completed')
        .map(t => t.id);

      if (deletedIds.length === 0) {
        showToast('No completed sent tasks to clear.', 'ℹ️');
        return;
      }

      tasks = tasks.filter(t => !(t.sender === currentUser && t.status === 'completed'));
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'CLEAR_COMPLETED',
        deletedIds: deletedIds
      });

      showToast(`Cleared ${deletedIds.length} completed tasks from logs`, '🧹');
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    });

    // Custom Galleries operations mapping for Local mode
    window.addGallery = (clientName, notes) => {
      const newGallery = {
        id: 'gallery_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clientName: clientName.trim(),
        notes: notes.trim(),
        status: 'arrived',
        timestamp: Date.now(),
        selectionDate: null,
        editedDate: null,
        deliveredDate: null
      };

      galleries.push(newGallery);
      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'ADD_GALLERY',
        gallery: newGallery
      });

      showToast(`Gallery <strong>${clientName}</strong> registered`, '📸');
    };

    window.moveGallery = (id, nextStatus) => {
      const galleryIndex = galleries.findIndex(g => g.id === id);
      if (galleryIndex === -1) return;

      const existing = galleries[galleryIndex];
      existing.status = nextStatus;
      if (nextStatus === 'selected') {
        existing.editedDate = null;
        existing.deliveredDate = null;
        if (!existing.selectionDate) existing.selectionDate = Date.now();
      } else if (nextStatus === 'edited') {
        existing.deliveredDate = null;
        if (!existing.selectionDate) existing.selectionDate = Date.now();
        if (!existing.editedDate) existing.editedDate = Date.now();
      } else if (nextStatus === 'delivered') {
        if (!existing.selectionDate) existing.selectionDate = Date.now();
        if (!existing.editedDate) existing.editedDate = Date.now();
        if (!existing.deliveredDate) existing.deliveredDate = Date.now();
      }

      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'MOVE_GALLERY',
        galleryId: id,
        nextStatus: nextStatus
      });

      showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
    };

    window.updateGallery = (id, clientName, notes, status) => {
      const gIndex = galleries.findIndex(g => g.id === id);
      if (gIndex === -1) return;

      const existing = galleries[gIndex];
      existing.clientName = clientName.trim();
      existing.notes = notes.trim();
      existing.status = status;

      if (status === 'arrived') {
        existing.selectionDate = null;
        existing.editedDate = null;
        existing.deliveredDate = null;
      } else if (status === 'selected') {
        existing.editedDate = null;
        existing.deliveredDate = null;
        if (!existing.selectionDate) existing.selectionDate = Date.now();
      } else if (status === 'edited') {
        existing.deliveredDate = null;
        if (!existing.selectionDate) existing.selectionDate = Date.now();
        if (!existing.editedDate) existing.editedDate = Date.now();
      } else if (status === 'delivered') {
        if (!existing.selectionDate) existing.selectionDate = Date.now();
        if (!existing.editedDate) existing.editedDate = Date.now();
        if (!existing.deliveredDate) existing.deliveredDate = Date.now();
      }

      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'UPDATE_GALLERY',
        gallery: existing
      });

      showToast(`Gallery updated`, '📝');
    };

    window.deleteGallery = (id) => {
      if (!confirm('Are you sure you want to delete this gallery entry?')) return;
      galleries = galleries.filter(g => g.id !== id);
      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'DELETE_GALLERY',
        galleryId: id
      });

      showToast('Gallery entry deleted', '🧹');
    };

    window.addContact = (name, phone, email, notes) => {
      const newContact = {
        id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        timestamp: Date.now()
      };

      contacts.push(newContact);
      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'ADD_CONTACT',
        contact: newContact
      });

      showToast(`Contact <strong>${name}</strong> saved`, '👥');
    };

    window.updateContact = (id, name, phone, email, notes) => {
      const cIndex = contacts.findIndex(c => c.id === id);
      if (cIndex === -1) return;

      const existing = contacts[cIndex];
      existing.name = name.trim();
      existing.phone = phone.trim();
      existing.email = email.trim();
      existing.notes = notes.trim();

      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'UPDATE_CONTACT',
        contact: existing
      });

      showToast(`Contact <strong>${name}</strong> updated`, '👥');
    };

    window.deleteContact = (id) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      contacts = contacts.filter(c => c.id !== id);
      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'DELETE_CONTACT',
        contactId: id
      });

      showToast('Contact deleted', '🧹');
    };

    // Sync over local BroadcastChannel
    localChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      loadLocalTasks();
      loadLocalGalleries();
      loadLocalContacts();
      checkForTaskStateUpdates();
    };
  }

  // --- Tab switching listeners ---
  const tabTasks = document.getElementById('tab-tasks');
  const tabGalleries = document.getElementById('tab-galleries');
  const tabContacts = document.getElementById('tab-contacts');
  const tasksSection = document.getElementById('tasks-section');
  const galleriesSection = document.getElementById('galleries-section');
  const contactsSection = document.getElementById('contacts-section');

  if (tabTasks && tabGalleries && tabContacts && tasksSection && galleriesSection && contactsSection) {
    tabTasks.addEventListener('click', () => {
      tabTasks.classList.add('active');
      tabGalleries.classList.remove('active');
      tabContacts.classList.remove('active');
      tasksSection.classList.add('active');
      galleriesSection.classList.remove('active');
      contactsSection.classList.remove('active');
    });

    tabGalleries.addEventListener('click', () => {
      tabGalleries.classList.add('active');
      tabTasks.classList.remove('active');
      tabContacts.classList.remove('active');
      galleriesSection.classList.add('active');
      tasksSection.classList.remove('active');
      contactsSection.classList.remove('active');
    });

    tabContacts.addEventListener('click', () => {
      tabContacts.classList.add('active');
      tabTasks.classList.remove('active');
      tabGalleries.classList.remove('active');
      contactsSection.classList.add('active');
      tasksSection.classList.remove('active');
      galleriesSection.classList.remove('active');
    });
  }

  // --- Add Contact Modal Display Handlers ---
  const contactModal = document.getElementById('contact-modal');
  const addContactBtn = document.getElementById('add-contact-btn');
  const closeContactBtn = document.getElementById('close-contact-btn');
  const addContactForm = document.getElementById('add-contact-form');
  const contactName = document.getElementById('contact-name');
  const contactPhone = document.getElementById('contact-phone');
  const contactEmail = document.getElementById('contact-email');
  const contactNotes = document.getElementById('contact-notes');
  const contactStatusMsg = document.getElementById('contact-status-msg');

  if (addContactBtn) {
    addContactBtn.addEventListener('click', () => {
      addContactForm.reset();
      contactStatusMsg.textContent = 'Add a new client to the studio database.';
      contactModal.style.display = 'flex';
      contactModal.offsetHeight; // force reflow
      contactModal.classList.remove('hidden');
    });
  }

  const closeContact = () => {
    contactModal.classList.add('hidden');
    setTimeout(() => {
      contactModal.style.display = 'none';
    }, 400);
  };

  if (closeContactBtn) {
    closeContactBtn.addEventListener('click', closeContact);
  }

  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) {
        closeContact();
      }
    });
  }

  if (addContactForm) {
    addContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = contactName.value;
      const phone = contactPhone.value;
      const email = contactEmail.value;
      const notes = contactNotes.value;
      if (!name.trim() || !phone.trim()) return;

      await window.addContact(name, phone, email, notes);
      closeContact();
    });
  }

  // --- Global Search Input ---
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      renderDashboard();
      renderGalleries();
      renderContacts();
    });
  }

  // --- Add Gallery Modal Display Handlers ---
  const galleryModal = document.getElementById('gallery-modal');
  const addGalleryBtn = document.getElementById('add-gallery-btn');
  const closeGalleryBtn = document.getElementById('close-gallery-btn');
  const addGalleryForm = document.getElementById('add-gallery-form');
  const galleryClientName = document.getElementById('gallery-client-name');
  const galleryNotesInput = document.getElementById('gallery-notes-input');
  const galleryStatusMsg = document.getElementById('gallery-status-msg');

  if (addGalleryBtn) {
    addGalleryBtn.addEventListener('click', () => {
      addGalleryForm.reset();
      galleryStatusMsg.textContent = 'This gallery will enter the "Arrived" column.';
      galleryModal.style.display = 'flex';
      galleryModal.offsetHeight; // force reflow
      galleryModal.classList.remove('hidden');
    });
  }

  const closeGallery = () => {
    galleryModal.classList.add('hidden');
    setTimeout(() => {
      galleryModal.style.display = 'none';
    }, 400);
  };

  if (closeGalleryBtn) {
    closeGalleryBtn.addEventListener('click', closeGallery);
  }

  if (galleryModal) {
    galleryModal.addEventListener('click', (e) => {
      if (e.target === galleryModal) {
        closeGallery();
      }
    });
  }

  if (addGalleryForm) {
    addGalleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = galleryClientName.value;
      const notes = galleryNotesInput.value;
      if (!name.trim()) return;

      await window.addGallery(name, notes);
      closeGallery();
    });
  }

  // --- Edit Gallery Modal Display Handlers ---
  const editGalleryModal = document.getElementById('edit-gallery-modal');
  const closeEditGalleryBtn = document.getElementById('close-edit-gallery-btn');
  const editGalleryForm = document.getElementById('edit-gallery-form');
  const editGalleryId = document.getElementById('edit-gallery-id');
  const editGalleryClientName = document.getElementById('edit-gallery-client-name');
  const editGalleryNotesInput = document.getElementById('edit-gallery-notes-input');
  const editGalleryStatusSelect = document.getElementById('edit-gallery-status-select');

  const closeEditGallery = () => {
    editGalleryModal.classList.add('hidden');
    setTimeout(() => {
      editGalleryModal.style.display = 'none';
    }, 400);
  };

  if (closeEditGalleryBtn) {
    closeEditGalleryBtn.addEventListener('click', closeEditGallery);
  }

  if (editGalleryModal) {
    editGalleryModal.addEventListener('click', (e) => {
      if (e.target === editGalleryModal) {
        closeEditGallery();
      }
    });
  }

  if (editGalleryForm) {
    editGalleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editGalleryId.value;
      const name = editGalleryClientName.value;
      const notes = editGalleryNotesInput.value;
      const status = editGalleryStatusSelect.value;
      if (!name.trim()) return;

      await window.updateGallery(id, name, notes, status);
      closeEditGallery();
    });
  }

  // --- Edit Contact Modal Display Handlers ---
  const editContactModal = document.getElementById('edit-contact-modal');
  const closeEditContactBtn = document.getElementById('close-edit-contact-btn');
  const editContactForm = document.getElementById('edit-contact-form');
  const editContactId = document.getElementById('edit-contact-id');
  const editContactName = document.getElementById('edit-contact-name');
  const editContactPhone = document.getElementById('edit-contact-phone');
  const editContactEmail = document.getElementById('edit-contact-email');
  const editContactNotes = document.getElementById('edit-contact-notes');

  const closeEditContact = () => {
    editContactModal.classList.add('hidden');
    setTimeout(() => {
      editContactModal.style.display = 'none';
    }, 400);
  };

  if (closeEditContactBtn) {
    closeEditContactBtn.addEventListener('click', closeEditContact);
  }

  if (editContactModal) {
    editContactModal.addEventListener('click', (e) => {
      if (e.target === editContactModal) {
        closeEditContact();
      }
    });
  }

  if (editContactForm) {
    editContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editContactId.value;
      const name = editContactName.value;
      const phone = editContactPhone.value;
      const email = editContactEmail.value;
      const notes = editContactNotes.value;
      if (!name.trim() || !phone.trim()) return;

      await window.updateContact(id, name, phone, email, notes);
      closeEditContact();
    });
  }

  // --- Settings Modal Display Handlers ---
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      changePasswordForm.reset();
      settingsStatusMsg.textContent = 'Modify your workspace password.';
      settingsModal.style.display = 'flex';
      settingsModal.offsetHeight; // force reflow
      settingsModal.classList.remove('hidden');
    });
  }

  const closeSettings = () => {
    settingsModal.classList.add('hidden');
    setTimeout(() => {
      settingsModal.style.display = 'none';
    }, 400);
  };

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });
  }

  // Initialize Custom Autocompletes for Client Name fields
  const galleryClientNameAutocomplete = document.getElementById('gallery-client-name-autocomplete');
  const editGalleryClientNameAutocomplete = document.getElementById('edit-gallery-client-name-autocomplete');
  setupAutocomplete(galleryClientName, galleryClientNameAutocomplete);
  setupAutocomplete(editGalleryClientName, editGalleryClientNameAutocomplete);

});
