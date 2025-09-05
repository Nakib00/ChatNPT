const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const chatContainer = document.getElementById('chat-container');
const welcomeScreen = document.getElementById('welcome-screen');

const threadId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

// Auto-resize textarea
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 128) + 'px';

    // Enable/disable send button
    const hasText = this.value.trim().length > 0;
    sendButton.disabled = !hasText;
    sendButton.classList.toggle('send-button-disabled', !hasText);
    sendButton.classList.toggle('bg-blue-600', hasText);
    sendButton.classList.toggle('hover:bg-blue-700', hasText);
});

// Send message function
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Hide welcome screen
    welcomeScreen.style.display = 'none';

    // Add user message
    addMessage(message, 'user');

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendButton.disabled = true;
    sendButton.classList.add('send-button-disabled');
    sendButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');

    // Show typing indicator while waiting for response
    addTypingIndicator();

    try {
        // Send message to server
        const response = await fetch('http://localhost:3001/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ threadId, message })
        });

        // Use a better error check
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator and add AI response
        removeTypingIndicator();
        addMessage(data.message, 'assistant');
    } catch (error) {
        // console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Sorry, there was an error processing your request. Please check the console for details.', 'assistant');
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-fade-in');

    if (sender === 'user') {
        messageDiv.innerHTML = `
                    <div class="flex justify-end">
                        <div class="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-xs md:max-w-md lg:max-w-lg shadow-lg">
                            <p class="text-sm">${escapeHtml(text)}</p>
                        </div>
                    </div>
                `;
    } else {
        messageDiv.innerHTML = `
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                            </svg>
                        </div>
                        <div class="bg-gray-700 rounded-2xl px-4 py-3 max-w-xs md:max-w-md lg:max-w-2xl shadow-lg">
                            <p class="text-sm">${escapeHtml(text)}</p>
                        </div>
                    </div>
                `;
    }

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                        </svg>
                    </div>
                    <div class="bg-gray-700 rounded-2xl px-4 py-3 shadow-lg">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style="animation-delay: 0.2s"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style="animation-delay: 0.4s"></div>
                        </div>
                    </div>
                </div>
            `;
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Simple response generator (replace with actual AI integration)
function generateResponse(message) {
    const responses = [
        "I'm doing well, thank you for asking! How can I help you today?",
        "That's an interesting question! Let me think about that...",
        "I'd be happy to help you with that. Could you provide a bit more context?",
        "Thanks for reaching out! I'm here to assist you with whatever you need.",
        "That's a great question. Here's what I think about that topic..."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

function scrollToBottom() {
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100);
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Focus input on load
messageInput.focus();