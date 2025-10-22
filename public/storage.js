  const socket = io();
  const login = document.getElementById('login');
  const chat = document.getElementById('chat');
  const usernameInput = document.getElementById('username');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const chatWindow = document.getElementById('chatWindow');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const replyPreview = document.getElementById('replyPreview');
  const replyText = document.getElementById('replyText');
  const usersDiv = document.getElementById('users');
  const emojiBtn = document.getElementById('emojiToggle');
  const emojiPicker = document.getElementById('emojiPicker');

  // --- New Global Variables ---
  let currentUser = '';
  let replyData = null;

  // --- Initial Page Load & User Check ---
  const savedName = localStorage.getItem('username');
  if (savedName) {
    currentUser = savedName;
    socket.emit('join', currentUser);
  } else {
    login.style.display = 'flex';
  }

  // --- Event Listeners ---
  loginBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    const notifSound = document.getElementById("notifSound");
    notifSound.play().then(() => notifSound.pause()).catch(() => {});
    currentUser = name;
    socket.emit('join', name);
  };

  sendBtn.onclick = sendMessage;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // --- Functions ---
  function autoScroll() {
    const cw = document.getElementById('chatWindow');
    cw.scrollTop = cw.scrollHeight;
  }

  function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    const data = { sender: currentUser, message, replyTo: replyData };
    socket.emit('chat message', data);
    appendMessage(data, true);
    input.value = '';
    resizeInput();
    cancelReply();
  }

  function appendMessage(data, isMe) {
    const container = document.createElement('div');
    container.className = 'message-container';

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMe ? 'me' : 'other'}`;

    if (!isMe) {
      const label = document.createElement('div');
      label.className = 'username-label';
      label.textContent = data.sender;
      label.onclick = () => insertMention(data.sender);
      msgDiv.appendChild(label);
    }

    if (data.replyTo) {
      const replyBlock = document.createElement('div');
      replyBlock.className = 'reply-block';
      replyBlock.textContent = `${data.replyTo.sender}: ${data.replyTo.message}`;
      msgDiv.appendChild(replyBlock);
    }

    const messageText = document.createElement('div');
    const formatted = data.message.replace(/@([^@:]+):/g, (_, name) => {
      return `<span class="mention" data-user="${name}">@${name}:</span>`;
    });
    messageText.innerHTML = formatted;
    msgDiv.appendChild(messageText);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-btn';
    menuBtn.textContent = '⋮';

    const menu = document.createElement('div');
    menu.className = 'message-menu';

    const replyBtn = document.createElement('button');
    replyBtn.textContent = 'Reply';
    replyBtn.onclick = () => {
      setReply(data.sender, data.message);
      menu.style.display = 'none';
    };
    menu.appendChild(replyBtn);

    if (isMe) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = () => container.remove();
      menu.appendChild(delBtn);
    }

    menuBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.message-menu').forEach(m => m.style.display = 'none');
      menu.style.display = 'flex';
    };

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    container.appendChild(msgDiv);
    container.appendChild(menuBtn);
    container.appendChild(menu);
    chatWindow.appendChild(container);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    setTimeout(() => {
      messageText.querySelectorAll('.mention').forEach(m => {
        m.onclick = () => insertMention(m.dataset.user);
      });
    }, 0);
  }

  function setReply(sender, message) {
    replyData = { sender, message };
    replyText.textContent = `Replying to ${sender}: ${message}`;
    replyPreview.style.display = 'block';
  }

  function cancelReply() {
    replyData = null;
    replyPreview.style.display = 'none';
    replyText.textContent = '';
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }

  input.addEventListener('input', resizeInput);

  function insertMention(name) {
    const mention = `@${name}: `;
    if (!input.value.includes(mention)) {
      input.value += mention;
      input.focus();
      resizeInput();
    }
  }

  function toggleUsers() {
    const overlay = document.getElementById('userOverlay');
    const overlayUsers = document.getElementById('overlayUsers');
    overlayUsers.innerHTML = usersDiv.innerHTML;
    overlay.style.display = 'flex';
  }

  function closeUserOverlay() {
    document.getElementById('userOverlay').style.display = 'none';
  }
  
  function toggleDropdown() {
    var dropdown = document.getElementById("roomsDropdown");
    dropdown.style.display = (dropdown.style.display === "block") ? "none" : "block";
  }

  function insertAtCursor(textarea, emoji) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);

    textarea.value = textBefore + emoji + textAfter;
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
    resizeInput();
  }

  // --- Socket.IO Event Handlers ---

  socket.on('duplicate', () => {
    loginError.textContent = '❌ Username already taken. Try another.';
  });

  socket.on('joined', () => {
    login.style.display = 'none';
    chat.style.display = 'flex';
    localStorage.setItem('username', currentUser);
  });

  socket.on('chat message', data => {
    if (data.sender !== currentUser) {
      appendMessage(data, false);
      const sound = document.getElementById("notifSound");
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn("Audio play blocked", err);
        });
      }
    }
    autoScroll();
  });

  socket.on('history', (history) => {
    chatWindow.innerHTML = '';
    history.forEach(data => appendMessage(data, data.sender === currentUser));
    autoScroll();
  });

  socket.on('user list', (users) => {
    usersDiv.innerHTML = '';
    users.forEach(name => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = name.charAt(0).toUpperCase();
      const userName = document.createElement('div');
      userName.className = 'user-name';
      userName.textContent = name;
      userItem.appendChild(avatar);
      userItem.appendChild(userName);
      usersDiv.appendChild(userItem);
    });
  });

  // New event listener to handle chat clearing from the server
  socket.on('chat cleared', () => {
    chatWindow.innerHTML = '';
    appendMessage({
      sender: 'System',
      message: 'The chat has been cleared for the new day!'
    }, false);
  });