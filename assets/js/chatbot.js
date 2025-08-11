// function toggleChatbot() {
//   const container = document.getElementById('chatbot-container');
//   container.classList.toggle('hidden');
// }

// async function sendMessage() {
//   const input = document.getElementById('chatbot-input');
//   const messages = document.getElementById('chatbot-messages');
//   const userMsg = input.value.trim();
//   if (!userMsg) return;

//   // Show user message
//   // messages.innerHTML += `<div><strong>You:</strong> ${userMsg}</div>`;
//   function linkify(text) {
//   // URLs
//   text = text.replace(/(https?:\/\/[^\s,!?()]+[^\s,!?()])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
//   // Emails
//   text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/g, '<a href="mailto:$1">$1</a>');
//   // Phone numbers
//   text = text.replace(/(\+91[\s\d-]{10,})/g, '<a href="tel:$1">$1</a>');
//   return text;
// }

//   input.value = "";

//   // Load chat history
//   let chatHistory = sessionStorage.getItem("chatHistory") || "";

//   const payload = {
//     message: userMsg,
//     history: chatHistory
//   };

//   // Call backend (we'll set this up next)
//   const res = await fetch("http://127.0.0.1:8000/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload)
//   });

//   const data = await res.json();

//   // Update chat
//   // messages.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
//   messages.innerHTML += `<div><strong>Bot:</strong> ${linkify(data.reply)}</div>`;
//   sessionStorage.setItem("chatHistory", data.updatedHistory);
// }


function toggleChat() {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.classList.toggle('hidden');
}

async function sendMessage(event) {
  event.preventDefault();
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  addMessage('user', message);
  input.value = '';

  try {
    const response = await fetch('https://my-portfolio-website-bot-backend.onrender.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    addMessage('bot', data.reply);
  } catch (err) {
    addMessage('bot', '⚠️ Failed to get response. Check server.');
  }
}

function convertToBulletListIfNeeded(message) {
  // Split into lines
  const lines = message.trim().split('\n');

  // Detect if all lines start with bullet-like syntax
  const isBulletList = lines.every(line => /^(\*|-|\d+\.)\s+/.test(line));

  if (!isBulletList) return message;

  const listItems = lines.map(line => {
    const cleaned = line.replace(/^(\*|-|\d+\.)\s+/, '');
    return `<li>${cleaned}</li>`;
  });

  return `<ul>${listItems.join('')}</ul>`;
}

// function addMessage(sender, text) {
//   const msgContainer = document.getElementById('chat-messages');
//   const bubble = document.createElement('div');
//   bubble.className = sender;

//   // Auto format bullets if needed
//   const formatted = convertToBulletListIfNeeded(text);

//   // Linkify links and emails
//   const linkified = formatted
//     .replace(
//       /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
//       `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
//     )
//     .replace(
//       /(https?:\/\/[^\s<]+)/g,
//       `<a href="$1" target="_blank" class="chat-link">$1</a>`
//     );

//   // 🔥 Wrap linkified content in a div to preserve bubble styling
//   const innerWrapper = document.createElement('div');
//   innerWrapper.className = 'bot-message'; // optional, for better control
//   innerWrapper.innerHTML = linkified;

//   bubble.appendChild(innerWrapper);
//   msgContainer.appendChild(bubble);
//   msgContainer.scrollTop = msgContainer.scrollHeight;
// }


// function addMessage(sender, text) {
//   const msgContainer = document.getElementById('chat-messages');
  
//   const wrapper = document.createElement('div');
//   wrapper.className = `chat-message-wrapper ${sender}`;

//   const msgBubble = document.createElement('div');
//   msgBubble.className = `${sender}-message`;

//   const formattedText = convertToBulletListIfNeeded(text);

//   const linkified = formattedText
//     .replace(
//       /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
//       `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
//     )
//     .replace(
//       /(https?:\/\/[^\s<]+)/g,
//       `<a href="$1" target="_blank" class="chat-link">$1</a>`
//     );

//   msgBubble.innerHTML = linkified;

//   const avatar = document.createElement('img');
//   avatar.src = sender === 'user' 
//     ? './assets/images/user.png'   // your path
//     : './assets/images/hero.png';   // your bot icon
//   avatar.alt = `${sender} avatar`;
//   avatar.className = 'chat-avatar';

//   wrapper.appendChild(msgBubble);
//   wrapper.appendChild(avatar);

//   msgContainer.appendChild(wrapper);
//   msgContainer.scrollTop = msgContainer.scrollHeight;
// }


function addMessage(sender, text) {
  const msgContainer = document.getElementById('chat-messages');

  const wrapper = document.createElement('div');
  wrapper.className = `chat-message-wrapper ${sender}`;

  const avatar = document.createElement('img');
  avatar.src = sender === 'user'
    ? './assets/images/user.png'
    : './assets/images/hero.png';
  avatar.alt = `${sender} avatar`;
  avatar.className = 'chat-avatar';

  const msgBubble = document.createElement('div');
  msgBubble.className = `${sender}-message`;

  // Format content
  const formattedText = convertToBulletListIfNeeded(text);
  const linkified = formattedText
    .replace(
      /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
    )
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      `<a href="$1" target="_blank" class="chat-link">$1</a>`
    );

  msgBubble.innerHTML = linkified;

  // Arrange order based on sender
  if (sender === 'user') {
    wrapper.appendChild(avatar);
    wrapper.appendChild(msgBubble);
  } else {
    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);
  }

  msgContainer.appendChild(wrapper);
  msgContainer.scrollTop = msgContainer.scrollHeight;
}
