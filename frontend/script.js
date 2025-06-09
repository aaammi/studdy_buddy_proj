function showMessage(text, sender) {
  const container = document.getElementById("messages");
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  msgDiv.textContent = text;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const msg = input.value.trim();
  if (!msg) return;

  showMessage(msg, 'user');
  input.value = '';

  // Temporarily fake response in English
  setTimeout(() => {
    showMessage("Example task: Write a function that finds the factorial of a number.", 'bot');
  }, 500);
}

function removeMessage(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// Event listener for Enter key
document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// Event listener for Send button
document.getElementById("send-btn").addEventListener("click", sendMessage);
