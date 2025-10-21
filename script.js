// PnCoder - AI Programming Assistant
class PnCoder {
    constructor() {
        // Use environment variables for API configuration
        this.apiKey = this.getEnvironmentVariable('OPENROUTER_API_KEY') || '';
        this.siteUrl = this.getEnvironmentVariable('SITE_URL') || window.location.origin;
        this.siteName = this.getEnvironmentVariable('SITE_NAME') || 'PnCoder';
        this.messages = JSON.parse(localStorage.getItem('pnCoder_messages') || '[]');
        
        this.initializeElements();
        this.bindEvents();
        this.renderMessages();
        this.updateCharCount();
        
        // Diagnostic logging
        console.log('PnCoder initialized with:');
        console.log('- API Key:', this.apiKey ? 'Present' : 'Missing');
        console.log('- Site URL:', this.siteUrl);
        console.log('- Site Name:', this.siteName);
        
        if (!this.apiKey) {
            console.warn('⚠️ API key not found! Please set OPENROUTER_API_KEY environment variable.');
        }
    }

    getEnvironmentVariable(name) {
        // Try to get from window object (set by Netlify)
        if (window[name]) {
            console.log(`Environment variable ${name} found in window object`);
            return window[name];
        }
        // Try to get from process.env (if available)
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            console.log(`Environment variable ${name} found in process.env`);
            return process.env[name];
        }
        // Fallback to empty string
        console.log(`Environment variable ${name} not found`);
        return '';
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearChatBtn = document.getElementById('clearChat');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.charCount = document.querySelector('.char-count');
    }

    bindEvents() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResizeTextarea();
            this.updateSendButton();
        });

        // Clear chat
        this.clearChatBtn.addEventListener('click', () => this.clearChat());

        // Example prompts
        document.querySelectorAll('.example-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.messageInput.value = e.target.dataset.prompt;
                this.updateCharCount();
                this.autoResizeTextarea();
                this.updateSendButton();
                this.messageInput.focus();
            });
        });
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/4000`;
        
        if (count > 3500) {
            this.charCount.style.color = '#dc3545';
        } else if (count > 3000) {
            this.charCount.style.color = '#ffc107';
        } else {
            this.charCount.style.color = '#6c757d';
        }
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        const hasApiKey = this.apiKey.trim().length > 0;
        this.sendBtn.disabled = !hasText || !hasApiKey;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.apiKey) {
            if (!this.apiKey) {
                this.showNotification('API key not configured. Please contact the administrator to set up the OPENROUTER_API_KEY environment variable.', 'error');
            }
            return;
        }

        // Add user message
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.updateCharCount();
        this.autoResizeTextarea();
        this.updateSendButton();

        // Show loading
        this.showLoading();

        try {
            const response = await this.callAPIWithRetry(message);
            this.addMessage('assistant', response);
        } catch (error) {
            console.error('API Error:', error);
            
            // If all models fail, provide a helpful fallback message
            if (error.message.includes('Rate limit exceeded') || error.message.includes('free-models-per-day')) {
                this.addMessage('assistant', `I've reached the daily limit for free models. This is normal for free tier usage.

**Solutions:**
• **Wait 24 hours** - Free limits reset daily
• **Try again later** - Limits may reset sooner
• **Contact administrator** - Consider upgrading to paid tier for higher limits

The application will automatically try different free models when available.`);
            } else if (error.message.includes('Provider returned error')) {
                this.addMessage('assistant', `I'm having trouble connecting to the AI service. This might be due to:
                
• **API key issues** - Please check your OPENROUTER_API_KEY environment variable
• **Model availability** - The free models might be temporarily unavailable
• **Rate limiting** - Please try again in a few moments

Please contact the administrator to verify the API configuration.`);
            } else {
                this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
            }
        } finally {
            this.hideLoading();
        }
    }

    async callAPI(message) {
        console.log('API Key:', this.apiKey ? 'Present' : 'Missing');
        console.log('Site URL:', this.siteUrl);
        console.log('Site Name:', this.siteName);
        
        // Prepare messages with proper context management
        const systemMessage = {
            role: 'system',
            content: 'You are PnCoder, a helpful AI programming assistant. You help users with programming questions, code reviews, debugging, and building applications. Always provide clear, well-formatted code examples and explanations.'
        };
        
        // Limit context to avoid token limits
        const recentMessages = this.messages.slice(-8); // Reduced from 10 to 8
        const userMessage = {
            role: 'user',
            content: message
        };
        
        const allMessages = [systemMessage, ...recentMessages, userMessage];
        
        // Calculate approximate token count (rough estimate: 1 token ≈ 4 characters)
        const totalChars = allMessages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        console.log('Estimated tokens:', estimatedTokens);
        
        // Adjust max_tokens based on context
        const maxTokens = Math.min(2000, Math.max(500, 4000 - estimatedTokens));
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': this.siteUrl || window.location.origin,
                'X-Title': this.siteName || 'PnCoder',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen/qwen3-coder:free',
                messages: allMessages,
                max_tokens: maxTokens,
                temperature: 0.7,
                stream: false,
                // Add additional parameters for better compatibility
                top_p: 0.9,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);
            
            // Handle specific error cases
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OPENROUTER_API_KEY environment variable.');
            } else if (response.status === 403) {
                throw new Error('API access forbidden. Please check your API key permissions.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a few moments.');
            } else if (response.status === 400) {
                throw new Error(`Bad request: ${errorData.error?.message || 'Invalid request parameters'}`);
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        // Check if response has the expected structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response structure:', data);
            throw new Error('Invalid response format from API');
        }
        
        return data.choices[0].message.content;
    }

    async callAPIWithRetry(message, maxRetries = 2) {
        // Use multiple free models with better availability
        const models = [
            'microsoft/phi-3-mini-128k-instruct:free',
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemma-2-2b-it:free',
            'tngtech/deepseek-r1t2-chimera:free'
        ];
        
        for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
            const currentModel = models[modelIndex];
            console.log(`Trying model: ${currentModel}`);
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`API attempt ${attempt}/${maxRetries} with model ${currentModel}`);
                    return await this.callAPIWithModel(message, currentModel);
                } catch (error) {
                    console.error(`API attempt ${attempt} failed with model ${currentModel}:`, error);
                    
                    // Don't retry for certain errors
                    if (error.message.includes('Invalid API key') || 
                        error.message.includes('API access forbidden') ||
                        error.message.includes('Bad request')) {
                        throw error;
                    }
                    
                    // For rate limit errors, try next model immediately
                    if (error.message.includes('Rate limit exceeded') || 
                        error.message.includes('free-models-per-day')) {
                        console.log(`Rate limit hit for ${currentModel}, trying next model...`);
                        break; // Try next model immediately
                    }
                    
                    // If this is the last attempt for this model, try next model
                    if (attempt === maxRetries) {
                        if (modelIndex < models.length - 1) {
                            console.log(`Model ${currentModel} failed, trying next model...`);
                            break; // Try next model
                        } else {
                            throw error; // All models failed
                        }
                    } else {
                        // Wait before retry (exponential backoff)
                        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
        }
    }

    async callAPIWithModel(message, model) {
        // Prepare messages with proper context management
        const systemMessage = {
            role: 'system',
            content: 'You are PnCoder, a helpful AI programming assistant. You help users with programming questions, code reviews, debugging, and building applications. Always provide clear, well-formatted code examples and explanations.'
        };
        
        // Limit context to avoid token limits
        const recentMessages = this.messages.slice(-8);
        const userMessage = {
            role: 'user',
            content: message
        };
        
        const allMessages = [systemMessage, ...recentMessages, userMessage];
        
        // Calculate approximate token count
        const totalChars = allMessages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        // Adjust max_tokens based on context
        const maxTokens = Math.min(2000, Math.max(500, 4000 - estimatedTokens));
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': this.siteUrl || window.location.origin,
                'X-Title': this.siteName || 'PnCoder',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                max_tokens: maxTokens,
                temperature: 0.7,
                stream: false,
                top_p: 0.9,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);
            
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OPENROUTER_API_KEY environment variable.');
            } else if (response.status === 403) {
                throw new Error('API access forbidden. Please check your API key permissions.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a few moments.');
            } else if (response.status === 400) {
                throw new Error(`Bad request: ${errorData.error?.message || 'Invalid request parameters'}`);
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response structure:', data);
            throw new Error('Invalid response format from API');
        }
        
        return data.choices[0].message.content;
    }

    addMessage(role, content) {
        const message = { role, content, timestamp: Date.now() };
        this.messages.push(message);
        this.saveMessages();
        this.renderMessages();
    }

    renderMessages() {
        // Clear welcome message if we have messages
        if (this.messages.length > 0) {
            this.chatMessages.innerHTML = '';
        } else {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i class="fas fa-robot"></i>
                        <h2>Welcome to PnCoder</h2>
                        <p>Your AI programming assistant powered by Qwen3 Coder. Ask me to build something, explain code, or help with programming questions!</p>
                        <div class="example-prompts">
                            <h3>Try asking:</h3>
                            <div class="prompt-examples">
                                <button class="example-prompt" data-prompt="Create a React component for a todo list">Create a React component for a todo list</button>
                                <button class="example-prompt" data-prompt="Explain how async/await works in JavaScript">Explain async/await in JavaScript</button>
                                <button class="example-prompt" data-prompt="Help me debug this Python function">Help me debug a Python function</button>
                                <button class="example-prompt" data-prompt="Build a REST API with Node.js and Express">Build a REST API with Node.js</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Re-bind example prompt events
            document.querySelectorAll('.example-prompt').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.messageInput.value = e.target.dataset.prompt;
                    this.updateCharCount();
                    this.autoResizeTextarea();
                    this.updateSendButton();
                    this.messageInput.focus();
                });
            });
            return;
        }

        // Render messages
        this.messages.forEach((message, index) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.role}-message`;
            
            const avatar = message.role === 'user' ? 'fas fa-user' : 'fas fa-robot';
            const formattedContent = this.formatMessageContent(message.content);
            
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="${avatar}"></i>
                </div>
                <div class="message-content">
                    ${formattedContent}
                </div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    formatMessageContent(content) {
        // Enhanced markdown-like formatting to HTML with better code handling
        let formatted = content;
        
        // Handle code blocks with language specification
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<div class="code-block">
                <div class="code-header">
                    <span class="code-language">${language}</span>
                    <button class="copy-code-btn" onclick="navigator.clipboard.writeText(\`${code.trim()}\`)">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>
            </div>`;
        });
        
        // Handle inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // Handle bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Handle line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.messages = [];
            this.saveMessages();
            this.renderMessages();
            this.showNotification('Chat cleared successfully!', 'success');
        }
    }


    saveMessages() {
        localStorage.setItem('pnCoder_messages', JSON.stringify(this.messages));
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#667eea'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

}

// Add CSS for notifications
const notificationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PnCoder();
});
