import { firebaseConfig } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {

  // --- Configuration Check ---
  const isFirebaseActive = 
    firebaseConfig && 
    firebaseConfig.projectId && 
    !firebaseConfig.projectId.startsWith('YOUR_');

  // --- State Variables ---
  let currentUser = 'Priya'; // Active user identity
  let activeAssignee = ''; // Holds selected assignee during task compose
  let tasks = [];
  let previousTasksState = []; // Used to track changes for notification triggers
  let isInitialLoad = true; // Prevents spamming notifications for old tasks on boot

  // Local Mode Sync Channel
  let localChannel = null;

  // Firebase references
  let auth = null;
  let db = null;
  let firestoreUnsubscribe = null;

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
    const myTasks = tasks.filter(t => t.assignee === currentUser);
    
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
    const sentTasks = tasks.filter(t => t.sender === currentUser);
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


  // ==========================================================================
  // 1. GLOBAL MODE IMPLEMENTATION (Firebase Firestore + Auth)
  // ==========================================================================
  
  if (isFirebaseActive) {
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
      loginStatusMsg.textContent = 'Connection error. Check internet link.';
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

      } else {
        // Sign-out states
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        tasks = [];
        previousTasksState = [];
        renderDashboard();
        
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

  } 
  
  // ==========================================================================
  // 2. LOCAL FALLBACK MODE IMPLEMENTATION (LocalStorage + BroadcastChannel)
  // ==========================================================================
  
  else {
    console.log('Booting in Local Offline Fallback Mode');
    loginStatusMsg.innerHTML = 'Workspace ready. <span style="font-weight:700; color: #2E7D32;">Local Mode Active.</span>';
    
    // Customize login card for local simulation
    const submitBtn = loginForm.querySelector('.login-submit-btn');
    submitBtn.textContent = 'Enter Local Board';
    loginEmail.placeholder = 'Username (Priya, Purva, or Bijal)';
    loginPassword.placeholder = 'Local Password (e.g. rhythm123)';
    
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

      // Load initial state
      loadLocalTasks();
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
      renderDashboard();
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

    // Sync over local BroadcastChannel
    localChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      loadLocalTasks();
      checkForTaskStateUpdates();
    };
  }

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

});
