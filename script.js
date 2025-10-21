// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const newChatBtn = document.getElementById('new-chat-btn');
const clearChatBtn = document.getElementById('clear-chat');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const sidebarResizer = document.getElementById('sidebar-resizer');
const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
const showSidebarBtn = document.getElementById('show-sidebar-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const modeDescriptionText = document.getElementById('mode-description-text');
const currentModeIndicator = document.getElementById('current-mode-indicator');
const currentModeIcon = document.getElementById('current-mode-icon');
const currentModeText = document.getElementById('current-mode-text');
const chatContainer = document.querySelector('.app-container');
const modeSwitchBtn = document.getElementById('mode-switch-btn');
const miniModeIndicator = document.getElementById('mini-mode-indicator');
const scrollToBottomBtn = document.getElementById('scroll-to-bottom');
const backToChatBtn = document.getElementById('back-to-chat');
const chatSearch = document.getElementById('chat-search');
const typingIndicator = document.getElementById('typing-indicator');

// Performance optimization variables
let searchDebounceTimer = null;
let resizeDebounceTimer = null;
let scrollThrottleTimer = null;
let messageRenderQueue = [];
let isRenderingMessages = false;
const MAX_MESSAGES_PER_BATCH = 10;
const RENDER_DELAY = 16; // ~60fps
 
// Initialize API key variable 
let apiKey = '';

// Performance utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Lazy loading for images and heavy content
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Memory management - cleanup old messages
function cleanupOldMessages() {
    const messages = document.querySelectorAll('.message');
    if (messages.length > 100) {
        const messagesToRemove = messages.length - 100;
        for (let i = 0; i < messagesToRemove; i++) {
            messages[i].remove();
        }
    }
}

// Advanced features: Message threading and conversation branching
let messageThreads = new Map();
let currentThreadId = null;

function createMessageThread(parentMessageId = null) {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageThreads.set(threadId, {
        id: threadId,
        parentId: parentMessageId,
        messages: [],
        createdAt: new Date().toISOString(),
        isActive: true
    });
    return threadId;
}

function addMessageToThread(threadId, message) {
    if (messageThreads.has(threadId)) {
        const thread = messageThreads.get(threadId);
        thread.messages.push({
            ...message,
            threadId: threadId,
            timestamp: new Date().toISOString()
        });
        messageThreads.set(threadId, thread);
    }
}

function getThreadMessages(threadId) {
    return messageThreads.get(threadId)?.messages || [];
}

function createBranchFromMessage(messageId) {
    const threadId = createMessageThread(messageId);
    currentThreadId = threadId;
    return threadId;
}

// Enhanced message rendering with threading support
function renderMessageWithThreading(message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isUser ? 'user' : 'bot'}`;
    messageElement.setAttribute('data-message-id', message.id || Date.now());
    
    if (message.threadId) {
        messageElement.setAttribute('data-thread-id', message.threadId);
        messageElement.classList.add('threaded-message');
    }
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? 'U' : 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMarkdown(message.content);
    
    // Add message actions
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.title = 'Copy message';
    copyBtn.addEventListener('click', () => copyMessage(messageElement));
    
    const branchBtn = document.createElement('button');
    branchBtn.className = 'message-action-btn branch-btn';
    branchBtn.innerHTML = '<i class="fas fa-code-branch"></i>';
    branchBtn.title = 'Create branch from this message';
    branchBtn.addEventListener('click', () => createBranchFromMessage(messageElement.dataset.messageId));
    
    const threadBtn = document.createElement('button');
    threadBtn.className = 'message-action-btn thread-btn';
    threadBtn.innerHTML = '<i class="fas fa-comments"></i>';
    threadBtn.title = 'View thread';
    threadBtn.addEventListener('click', () => showThreadView(message.threadId));
    
    actions.appendChild(copyBtn);
    if (!isUser) {
        actions.appendChild(branchBtn);
        if (message.threadId) {
            actions.appendChild(threadBtn);
        }
    }
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(content);
    messageElement.appendChild(actions);
    
    return messageElement;
}

// Thread view functionality
function showThreadView(threadId) {
    const thread = messageThreads.get(threadId);
    if (!thread) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal thread-modal';
    modal.innerHTML = `
        <div class="modal-content thread-content">
            <div class="modal-header">
                <h3>Message Thread</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="thread-messages">
                ${thread.messages.map(msg => `
                    <div class="thread-message">
                        <div class="thread-message-header">
                            <span class="thread-message-role">${msg.role}</span>
                            <span class="thread-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="thread-message-content">${formatMarkdown(msg.content)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('open');
}

// Enhanced error handling and user feedback systems
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.retryQueue = [];
        this.maxRetries = 3;
    }
    
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep only last 100 errors
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(-100);
        }
        
        console.error('Error logged:', errorEntry);
        this.showUserFriendlyError(error, context);
    }
    
    showUserFriendlyError(error, context = {}) {
        let userMessage = 'An unexpected error occurred.';
        let shouldRetry = false;
        
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            userMessage = 'Network connection failed. Please check your internet connection.';
            shouldRetry = true;
        } else if (error.message.includes('API key')) {
            userMessage = 'API configuration issue. Please contact your administrator.';
        } else if (error.message.includes('rate limit')) {
            userMessage = 'Too many requests. Please wait a moment before trying again.';
            shouldRetry = true;
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please try again.';
            shouldRetry = true;
        }
        
        this.showErrorToast(userMessage, shouldRetry, context);
    }
    
    showErrorToast(message, canRetry = false, context = {}) {
        const toast = document.createElement('div');
        toast.className = 'message-toast error';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                ${canRetry ? '<button class="retry-btn" onclick="errorHandler.retryLastAction()">Retry</button>' : ''}
            </div>
        `;
        
        document.body.appendChild(toast);
        toast.classList.add('visible');
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    retryLastAction() {
        if (this.retryQueue.length > 0) {
            const lastAction = this.retryQueue[this.retryQueue.length - 1];
            if (lastAction.retries < this.maxRetries) {
                lastAction.retries++;
                lastAction.function();
            }
        }
    }
    
    addRetryableAction(actionFunction) {
        this.retryQueue.push({
            function: actionFunction,
            retries: 0,
            timestamp: new Date().toISOString()
        });
    }
}

// Global error handler instance
const errorHandler = new ErrorHandler();

// Enhanced API call with better error handling
async function sendMessageToAPIWithRetry(message, retryCount = 0) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'PAKNING R1'
            },
            body: JSON.stringify({
                'model': 'qwen/qwen3-14b:free',
                'messages': message,
                'temperature': 0.7,
                'max_tokens': 4000,
                'stream': false
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        errorHandler.logError(error, { 
            message: message, 
            retryCount: retryCount,
            action: 'sendMessageToAPI'
        });
        
        if (retryCount < 3 && (error.message.includes('network') || error.message.includes('timeout'))) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return sendMessageToAPIWithRetry(message, retryCount + 1);
        }
        
        throw error;
    }
}

// Enhanced user feedback system
class UserFeedback {
    constructor() {
        this.feedbackQueue = [];
        this.isShowingFeedback = false;
    }
    
    showFeedback(type, message, duration = 3000, actions = []) {
        const feedback = {
            id: Date.now(),
            type: type,
            message: message,
            duration: duration,
            actions: actions,
            timestamp: new Date().toISOString()
        };
        
        this.feedbackQueue.push(feedback);
        this.processQueue();
    }
    
    processQueue() {
        if (this.isShowingFeedback || this.feedbackQueue.length === 0) return;
        
        this.isShowingFeedback = true;
        const feedback = this.feedbackQueue.shift();
        this.displayFeedback(feedback);
    }
    
    displayFeedback(feedback) {
        const toast = document.createElement('div');
        toast.className = `message-toast ${feedback.type}`;
        toast.setAttribute('data-feedback-id', feedback.id);
        
        const actionsHtml = feedback.actions.map(action => 
            `<button class="feedback-action-btn" onclick="${action.onclick}">${action.label}</button>`
        ).join('');
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getIconForType(feedback.type)}"></i>
                <span>${feedback.message}</span>
                ${actionsHtml}
            </div>
        `;
        
        document.body.appendChild(toast);
        toast.classList.add('visible');
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.remove();
                this.isShowingFeedback = false;
                this.processQueue();
            }, 300);
        }, feedback.duration);
    }
    
    getIconForType(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle',
            loading: 'spinner'
        };
        return icons[type] || 'info-circle';
    }
}

// Global user feedback instance
const userFeedback = new UserFeedback();

// Enhanced loading states
function showAdvancedLoadingState(message = 'Processing...') {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
            <div class="loading-progress">
                <div class="progress-bar"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
    
    // Simulate progress
    let progress = 0;
    const progressBar = loadingOverlay.querySelector('.progress-bar');
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) progress = 90;
        progressBar.style.width = `${progress}%`;
    }, 200);
    
    return {
        remove: () => {
            clearInterval(interval);
            progressBar.style.width = '100%';
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }
    };
}

// Enhanced data management system
class DataManager {
    constructor() {
        this.backupInterval = 5 * 60 * 1000; // 5 minutes
        this.syncInterval = 30 * 1000; // 30 seconds
        this.maxBackups = 10;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startBackupTimer();
        this.startSyncTimer();
        this.loadBackups();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingData();
            userFeedback.showFeedback('success', 'Connection restored. Syncing data...');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            userFeedback.showFeedback('warning', 'Connection lost. Data will sync when online.');
        });
        
        window.addEventListener('beforeunload', () => {
            this.createBackup();
        });
    }
    
    startBackupTimer() {
        setInterval(() => {
            this.createBackup();
        }, this.backupInterval);
    }
    
    startSyncTimer() {
        setInterval(() => {
            if (this.isOnline) {
                this.syncPendingData();
            }
        }, this.syncInterval);
    }
    
    createBackup() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                chats: chatSessions,
                settings: this.getCurrentSettings(),
                threads: Array.from(messageThreads.entries()),
                userPreferences: this.getUserPreferences()
            };
            
            const backups = this.getBackups();
            backups.push(backupData);
            
            // Keep only the most recent backups
            if (backups.length > this.maxBackups) {
                backups.splice(0, backups.length - this.maxBackups);
            }
            
            localStorage.setItem('pakningR1_backups', JSON.stringify(backups));
            
            // Also create a downloadable backup
            this.createDownloadableBackup(backupData);
            
        } catch (error) {
            errorHandler.logError(error, { action: 'createBackup' });
        }
    }
    
    getBackups() {
        try {
            const backups = localStorage.getItem('pakningR1_backups');
            return backups ? JSON.parse(backups) : [];
        } catch (error) {
            return [];
        }
    }
    
    loadBackups() {
        const backups = this.getBackups();
        if (backups.length > 0) {
            console.log(`Loaded ${backups.length} backups`);
        }
    }
    
    createDownloadableBackup(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Store the URL for potential download
        localStorage.setItem('pakningR1_latestBackup', url);
    }
    
    restoreFromBackup(backupIndex) {
        try {
            const backups = this.getBackups();
            if (backupIndex >= 0 && backupIndex < backups.length) {
                const backup = backups[backupIndex];
                
                // Restore chats
                if (backup.chats) {
                    chatSessions = backup.chats;
                    saveChatsToLocalStorage();
                }
                
                // Restore settings
                if (backup.settings) {
                    this.applySettings(backup.settings);
                }
                
                // Restore threads
                if (backup.threads) {
                    messageThreads = new Map(backup.threads);
                }
                
                userFeedback.showFeedback('success', 'Backup restored successfully!');
                return true;
            }
        } catch (error) {
            errorHandler.logError(error, { action: 'restoreFromBackup', backupIndex });
        }
        return false;
    }
    
    getCurrentSettings() {
        return {
            theme: localStorage.getItem('pakningR1_theme') || 'dark',
            fontSize: localStorage.getItem('pakningR1_fontSize') || 'medium',
            animationSpeed: localStorage.getItem('pakningR1_animationSpeed') || 'normal',
            autoScroll: localStorage.getItem('pakningR1_autoScroll') !== 'false',
            saveDrafts: localStorage.getItem('pakningR1_saveDrafts') !== 'false',
            showTimestamps: localStorage.getItem('pakningR1_showTimestamps') === 'true',
            sidebarWidth: localStorage.getItem('pakningR1_sidebarWidth') || '260',
            sidebarCollapsed: localStorage.getItem('pakningR1_sidebarCollapsed') === 'true'
        };
    }
    
    getUserPreferences() {
        return {
            mode: localStorage.getItem('mode') || 'default',
            preferredMode: localStorage.getItem('preferredMode') || 'web-mode',
            lastActiveSession: currentSessionId
        };
    }
    
    applySettings(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            localStorage.setItem(`pakningR1_${key}`, value);
        });
        
        // Apply theme
        if (settings.theme) {
            document.body.className = settings.theme === 'light' ? 'light-theme' : '';
        }
        
        // Apply other settings
        applySettings();
    }
    
    // Advanced search functionality
    searchMessages(query, options = {}) {
        const {
            caseSensitive = false,
            includeContent = true,
            includeMetadata = true,
            dateRange = null,
            mode = null
        } = options;
        
        const results = [];
        const searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        
        chatSessions.forEach(session => {
            if (mode && session.mode !== mode) return;
            
            session.messages.forEach(message => {
                if (message.role === 'system') return;
                
                let matches = false;
                const searchText = [];
                
                if (includeContent) {
                    searchText.push(message.content);
                }
                
                if (includeMetadata) {
                    searchText.push(session.title);
                    searchText.push(message.role);
                }
                
                const fullText = searchText.join(' ');
                if (searchRegex.test(fullText)) {
                    matches = true;
                }
                
                if (matches) {
                    results.push({
                        sessionId: session.id,
                        sessionTitle: session.title,
                        messageId: message.id || Date.now(),
                        content: message.content,
                        role: message.role,
                        timestamp: message.timestamp || session.created,
                        mode: session.mode
                    });
                }
            });
        });
        
        return results;
    }
    
    // Data synchronization
    syncPendingData() {
        if (!this.isOnline || this.pendingSync.length === 0) return;
        
        this.pendingSync.forEach(syncItem => {
            try {
                // Simulate sync to external service
                console.log('Syncing:', syncItem);
                // In a real implementation, this would sync to a cloud service
            } catch (error) {
                errorHandler.logError(error, { action: 'syncPendingData', syncItem });
            }
        });
        
        this.pendingSync = [];
    }
    
    addToSyncQueue(data) {
        this.pendingSync.push({
            timestamp: new Date().toISOString(),
            data: data
        });
    }
    
    // Data analytics
    getAnalytics() {
        const totalMessages = chatSessions.reduce((sum, session) => sum + session.messages.length, 0);
        const totalSessions = chatSessions.length;
        const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;
        
        const modeUsage = chatSessions.reduce((usage, session) => {
            usage[session.mode] = (usage[session.mode] || 0) + 1;
            return usage;
        }, {});
        
        const recentActivity = chatSessions
            .sort((a, b) => new Date(b.created) - new Date(a.created))
            .slice(0, 10)
            .map(session => ({
                title: session.title,
                created: session.created,
                messageCount: session.messages.length,
                mode: session.mode
            }));
        
        return {
            totalMessages,
            totalSessions,
            averageMessagesPerSession,
            modeUsage,
            recentActivity,
            lastBackup: this.getBackups().slice(-1)[0]?.timestamp
        };
    }
}

// Global data manager instance
const dataManager = new DataManager();
 
 // Function to initialize API key from Netlify environment variables
 async function initializeApiKey() {
     try {
         // Get API key from Netlify environment variables
         const envApiKey = await getEnvVar('API_KEY', '');
         console.log('Attempting to load API key from Netlify environment');
         
         if (envApiKey && envApiKey.trim() !== '') {
             console.log('API key successfully loaded from Netlify environment');
             apiKey = envApiKey;
         } else {
             console.log('No API key found in Netlify environment');
         }
     } catch (error) {
         console.error('Error initializing API key:', error);
     }
 }
 
 // Function to ensure API key is available
 async function ensureApiKey() {
     // If already have a valid key, just return
     if (hasValidApiKey()) {
         return;
     }
     
     console.log('API key not valid, attempting to reload from Netlify environment');
     
     // Try again to get from Netlify environment variables
     await initializeApiKey();
 }
 
 // Function to check if API key is valid
 function hasValidApiKey() {
     // If we have a placeholder, the key is not valid
     if (apiKey === 'NETLIFY_ENV_API_KEY_PLACEHOLDER' || 
         apiKey === '' || 
         !apiKey || 
         apiKey.trim() === '') {
         return false;
     }
     
     // Check for valid API key formats
     return (apiKey.startsWith('sk-') || 
            apiKey.startsWith('pk-') || 
            apiKey.startsWith('sk-or-v1-')) && 
            apiKey.length > 20;
 }
 
 // Handle API key form submission
 document.getElementById('apiKeyForm').addEventListener('submit', function(e) {
     e.preventDefault();
     showMessage('API keys can only be set via Netlify environment variables. Please contact your administrator.', 'error');
 });
 
 // API configuration
 const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
 
// Current expert mode
let currentMode = 'general';
 
// Expert AI Specialists
const expertModes = {
    general: {
        title: 'General Assistant',
        icon: 'user-tie',
        description: 'Versatile AI assistant for general questions and tasks.',
        systemPrompt: 'You are PAKNING R1, a professional AI assistant with broad knowledge across multiple domains. Provide helpful, accurate, and well-structured responses. Use clear formatting with markdown for headers, lists, and code blocks. Adapt your communication style to the user\'s needs and level of expertise.',
        thinkingSteps: [
            'Analyzing request',
            'Gathering relevant information',
            'Organizing response structure',
            'Formulating detailed answer'
        ],
        stepDelay: 600,
        totalDelay: 3000,
        temperature: 0.7,
        maxTokens: 2000
    },
    coding: {
        title: 'Code Expert',
        icon: 'code',
        description: 'Senior software engineer specializing in programming, algorithms, and system design.',
        systemPrompt: 'You are PAKNING R1 Code Expert, a senior software engineer with 15+ years of experience. You excel at:\n- Multiple programming languages (Python, JavaScript, Java, C++, Go, Rust, etc.)\n- Software architecture and design patterns\n- Algorithm optimization and data structures\n- Debugging and code review\n- System design and scalability\n- Best practices and clean code principles\n\nProvide detailed, production-ready code solutions with explanations. Include error handling, testing considerations, and performance optimizations. Use proper code formatting and comments.',
        thinkingSteps: [
            'Analyzing code requirements',
            'Evaluating technical approaches',
            'Designing optimal solution',
            'Implementing with best practices',
            'Adding error handling and testing'
        ],
        stepDelay: 800,
        totalDelay: 4000,
        temperature: 0.6,
        maxTokens: 3000
    },
    business: {
        title: 'Business Strategist',
        icon: 'chart-line',
        description: 'MBA-level business consultant specializing in strategy, marketing, and operations.',
        systemPrompt: 'You are PAKNING R1 Business Strategist, an experienced MBA consultant with expertise in:\n- Strategic planning and business development\n- Market analysis and competitive intelligence\n- Financial modeling and investment analysis\n- Marketing strategy and brand positioning\n- Operations optimization and process improvement\n- Leadership and organizational development\n\nProvide strategic insights with data-driven recommendations. Use frameworks like SWOT, Porter\'s Five Forces, and business model canvas when appropriate.',
        thinkingSteps: [
            'Analyzing business context',
            'Identifying key challenges',
            'Evaluating strategic options',
            'Developing recommendations',
            'Creating implementation plan'
        ],
        stepDelay: 700,
        totalDelay: 3500,
        temperature: 0.7,
        maxTokens: 2500
    },
    creative: {
        title: 'Creative Director',
        icon: 'palette',
        description: 'Creative professional specializing in design, writing, and artistic projects.',
        systemPrompt: 'You are PAKNING R1 Creative Director, a seasoned creative professional with expertise in:\n- Graphic design and visual communication\n- Creative writing and content strategy\n- Brand identity and storytelling\n- User experience and interface design\n- Photography and visual arts\n- Creative problem-solving and ideation\n\nProvide innovative, creative solutions with artistic flair. Use visual language and creative frameworks. Encourage experimentation and out-of-the-box thinking.',
        thinkingSteps: [
            'Understanding creative brief',
            'Exploring creative concepts',
            'Developing visual/verbal solutions',
            'Refining creative direction',
            'Presenting final concepts'
        ],
        stepDelay: 900,
        totalDelay: 4500,
        temperature: 0.8,
        maxTokens: 2500
    },
    research: {
        title: 'Research Scientist',
        icon: 'microscope',
        description: 'PhD-level researcher specializing in scientific analysis and data interpretation.',
        systemPrompt: 'You are PAKNING R1 Research Scientist, a PhD-level researcher with expertise in:\n- Scientific methodology and experimental design\n- Data analysis and statistical modeling\n- Literature review and research synthesis\n- Academic writing and publication\n- Critical thinking and evidence evaluation\n- Interdisciplinary research approaches\n\nProvide rigorous, evidence-based analysis with proper citations and methodology. Use scientific language and maintain academic standards.',
        thinkingSteps: [
            'Formulating research questions',
            'Reviewing existing literature',
            'Analyzing data and evidence',
            'Drawing scientific conclusions',
            'Preparing research findings'
        ],
        stepDelay: 1000,
        totalDelay: 5000,
        temperature: 0.6,
        maxTokens: 3000
    },
    health: {
        title: 'Health Advisor',
        icon: 'heartbeat',
        description: 'Medical professional specializing in health, wellness, and medical information.',
        systemPrompt: 'You are PAKNING R1 Health Advisor, a qualified medical professional with expertise in:\n- General health and wellness guidance\n- Medical information and symptom analysis\n- Nutrition and lifestyle recommendations\n- Mental health and stress management\n- Preventive care and health screening\n- Medical terminology and conditions\n\nProvide evidence-based health information while emphasizing the importance of professional medical consultation for serious conditions. Always include appropriate disclaimers.',
        thinkingSteps: [
            'Assessing health inquiry',
            'Gathering relevant medical information',
            'Analyzing symptoms and context',
            'Providing evidence-based guidance',
            'Recommending next steps'
        ],
        stepDelay: 800,
        totalDelay: 4000,
        temperature: 0.7,
        maxTokens: 2500
    },
    education: {
        title: 'Learning Coach',
        icon: 'graduation-cap',
        description: 'Educational specialist focusing on learning strategies and academic support.',
        systemPrompt: 'You are PAKNING R1 Learning Coach, an educational specialist with expertise in:\n- Learning methodologies and study techniques\n- Curriculum design and educational planning\n- Student assessment and progress tracking\n- Differentiated instruction and learning styles\n- Educational technology and tools\n- Academic writing and research skills\n\nProvide personalized learning strategies with clear explanations and practical examples. Adapt to different learning styles and academic levels.',
        thinkingSteps: [
            'Assessing learning needs',
            'Identifying knowledge gaps',
            'Designing learning approach',
            'Creating study materials',
            'Monitoring progress'
        ],
        stepDelay: 700,
        totalDelay: 3500,
        temperature: 0.7,
        maxTokens: 2500
    }
};
 
// Chat history for context
let messagesHistory = [
    {
        role: "system",
        content: expertModes.general.systemPrompt
    }
];
 
 // Chat sessions
 let chatSessions = [];
 let currentSessionId = null;
 let isWaitingForResponse = false;
 
// Function to set expert mode
function setExpertMode(mode) {
    // Check if the mode exists
    if (!expertModes[mode]) {
        console.error(`Expert mode ${mode} not found`);
        return;
    }
    
    // Update current mode
    currentMode = mode;
    
    // Update mode indicator
    const modeConfig = expertModes[mode];
    currentModeIcon.innerHTML = `<i class="fas fa-${modeConfig.icon}"></i>`;
    currentModeText.textContent = modeConfig.title;
    
    // Update mini mode indicator in the input area
    miniModeIndicator.textContent = modeConfig.title;
    
    // Add class to body to apply mode-specific styles
    document.body.classList.remove('general-mode', 'coding-mode', 'business-mode', 'creative-mode', 'research-mode', 'health-mode', 'education-mode');
    document.body.classList.add(`${mode}-mode`);
    
    // Update system prompt in messages history
    messagesHistory[0] = {
        role: "system",
        content: modeConfig.systemPrompt
    };
    
    // Update current session with new mode
    if (currentSessionId) {
        const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
            chatSessions[sessionIndex].mode = mode;
            saveChatsToLocalStorage();
        }
    }
    
    // Log mode change
    console.log(`Expert mode set to ${mode}: ${modeConfig.title}`);
}
 
 // Function to create a new chat session
 function createNewChat() {
     // Remove any existing new chat boxes
     const existingNewChats = document.querySelectorAll('.history-item');
     existingNewChats.forEach(chat => {
         if (chat.querySelector('span').textContent.startsWith('New Chat')) {
             chat.remove();
         }
     });
     
     // Generate a unique ID for this session
     currentSessionId = Date.now().toString();
     
     // Reset message history with current mode's system prompt
     messagesHistory = [
         {
             role: "system",
             content: reasoningModes[currentMode].systemPrompt
         }
     ];
     
     // Clear messages on screen
     chatMessages.innerHTML = '';
     
     // Add new chat to history sidebar with a placeholder title
     const defaultTitle = 'New Chat ' + formatDate(new Date());
     addNewChatToHistory(defaultTitle);
     
     // Focus on input
     userInput.focus();
 }
 
// Function to add a new chat to the history sidebar
function addNewChatToHistory(title) {
    // Create chat item for sidebar
    const historyItem = document.createElement('div');
    historyItem.classList.add('history-item');
    historyItem.dataset.id = currentSessionId;
    
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-comment');
    
    const chatNameSpan = document.createElement('span');
    chatNameSpan.classList.add('chat-name');
    chatNameSpan.textContent = title;
    chatNameSpan.title = 'Click to edit chat name';
    
    const editActions = document.createElement('div');
    editActions.classList.add('edit-actions');
    
    const saveBtn = document.createElement('button');
    saveBtn.classList.add('edit-action-btn', 'save');
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.title = 'Save changes';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('edit-action-btn', 'cancel');
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.title = 'Cancel editing';
    
    editActions.appendChild(saveBtn);
    editActions.appendChild(cancelBtn);
    
    historyItem.appendChild(icon);
    historyItem.appendChild(chatNameSpan);
    historyItem.appendChild(editActions);
    
    // Add click event for editing (single click on mobile, double click on desktop)
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        chatNameSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditingChatName(historyItem, currentSessionId);
        });
    } else {
        chatNameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startEditingChatName(historyItem, currentSessionId);
        });
    }
    
    // Add save/cancel event listeners
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveChatName(historyItem, currentSessionId);
    });
    
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelEditingChatName(historyItem, currentSessionId);
    });
    
    // Add to sidebar
    const chatHistory = document.querySelector('.chat-history');
    if (chatHistory) {
        // Remove 'active' class from all history items
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add 'active' class to this new item
        historyItem.classList.add('active');
        
        // Add to DOM - insert at the top for newest chats
        chatHistory.insertBefore(historyItem, chatHistory.firstChild);
    }
    
    // Store in chat sessions array
    chatSessions.push({
        id: currentSessionId,
        title: title,
        mode: currentMode,
        messages: [...messagesHistory],
        created: new Date().toISOString()
    });
    
    // Save to localStorage
    saveChatsToLocalStorage();
}
 
 // Function to save all chats to localStorage
 function saveChatsToLocalStorage() {
     try {
         localStorage.setItem('pakningR1_chatSessions', JSON.stringify(chatSessions));
     } catch (error) {
         console.error('Error saving chats to localStorage:', error);
     }
 }
 
// Function to load chats from localStorage
function loadChatsFromLocalStorage() {
    try {
        const savedChats = localStorage.getItem('pakningR1_chatSessions');
        if (savedChats) {
            chatSessions = JSON.parse(savedChats);
            
            // Remove any chats with "Cleared Chat" in the title
            chatSessions = chatSessions.filter(session => !session.title.includes('Cleared Chat'));
            
            // Save the cleaned up sessions back to storage
            saveChatsToLocalStorage();
            
            // Populate sidebar with saved chats
            renderChatHistory();
        }
    } catch (error) {
        console.error('Error loading chats from localStorage:', error);
    }
}

// Function to render chat history (with optional search filter)
function renderChatHistory(searchTerm = '') {
    const chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) return;
    
    chatHistory.innerHTML = ''; // Clear existing
    
    // Filter chats based on search term
    let filteredChats = chatSessions;
    if (searchTerm) {
        filteredChats = chatSessions.filter(session => 
            session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.messages.some(msg => 
                msg.content.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }
    
    // Sort chats by creation date (newest first)
    filteredChats.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    filteredChats.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.dataset.id = session.id;
        
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-comment');
        
        const chatNameSpan = document.createElement('span');
        chatNameSpan.classList.add('chat-name');
        chatNameSpan.textContent = session.title;
        chatNameSpan.title = 'Click to edit chat name';
        
        const editActions = document.createElement('div');
        editActions.classList.add('edit-actions');
        
        const saveBtn = document.createElement('button');
        saveBtn.classList.add('edit-action-btn', 'save');
        saveBtn.innerHTML = '<i class="fas fa-check"></i>';
        saveBtn.title = 'Save changes';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('edit-action-btn', 'cancel');
        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
        cancelBtn.title = 'Cancel editing';
        
        editActions.appendChild(saveBtn);
        editActions.appendChild(cancelBtn);
        
        historyItem.appendChild(icon);
        historyItem.appendChild(chatNameSpan);
        historyItem.appendChild(editActions);
        
        // Add click event for editing (single click on mobile, double click on desktop)
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            chatNameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                startEditingChatName(historyItem, session.id);
            });
        } else {
            chatNameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startEditingChatName(historyItem, session.id);
            });
        }
        
        // Add save/cancel event listeners
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveChatName(historyItem, session.id);
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelEditingChatName(historyItem, session.id);
        });
        
        chatHistory.appendChild(historyItem);
    });
    
    // Show no results message if search returns empty
    if (searchTerm && filteredChats.length === 0) {
        const noResults = document.createElement('div');
        noResults.classList.add('no-results');
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <span>No conversations found</span>
        `;
        chatHistory.appendChild(noResults);
    }
}
 
// Function to update chat title in sidebar and storage
function updateChatTitle(sessionId, newTitle) {
    // Update in storage
    const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
        chatSessions[sessionIndex].title = newTitle;
        saveChatsToLocalStorage();
        
        // Update in sidebar
        const historyItem = document.querySelector(`.history-item[data-id="${sessionId}"]`);
        if (historyItem) {
            const chatNameSpan = historyItem.querySelector('.chat-name');
            if (chatNameSpan) {
                chatNameSpan.textContent = newTitle;
            }
        }
        
        // Update document title if this is the current session
        if (sessionId === currentSessionId) {
            document.title = newTitle.length > 20 
                ? newTitle.substring(0, 20) + '...' 
                : newTitle + ' - PAKNING R1';
        }
    }
}
 
 // Function to format date
 function formatDate(date) {
     return date.toLocaleDateString('en-US', { 
         month: 'short', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
     });
 }
 
 // Format markdown content to HTML
 function formatMarkdown(text) {
     // Handle newlines properly first
     text = text.replace(/\r\n/g, '\n');
     
    // Handle code blocks (```lang...```)
    text = text.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, function(match, language, code) {
        // Sanitize code content
        code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const toolbar = `<div class="code-toolbar"><button class="copy-code-btn" data-language="${language || ''}"><i class="fas fa-copy"></i> Copy</button></div>`;
        return `<pre>${toolbar}<code class="language-${language}">${code}</code></pre>`;
    });
     
     // Handle inline code (`code`)
     text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
     
     // Handle headers
     text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
     text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
     text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
     
     // Handle bold and italic
     text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
     text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
     
     // Handle unordered lists
     text = text.replace(/^\s*[\-\*]\s+(.*)/gm, '<li>$1</li>');
     
     // Handle ordered lists
     text = text.replace(/^\s*(\d+)\.\s+(.*)/gm, '<li>$2</li>');
     
     // Group list items
     let inList = false;
     const lines = text.split('\n');
     let result = '';
     
     for (let i = 0; i < lines.length; i++) {
         const line = lines[i];
         
         if (line.trim().startsWith('<li>')) {
             if (!inList) {
                 // Start a new list
                 const isOrdered = lines[i-1] && /^\s*\d+\./.test(lines[i-1]);
                 result += isOrdered ? '<ol>' : '<ul>';
                 inList = true;
             }
             result += line;
         } else {
             if (inList) {
                 // Close the list
                 const lastListItem = result.lastIndexOf('<li>');
                 const lastListType = result.substring(0, lastListItem).lastIndexOf('<ul>') > 
                                      result.substring(0, lastListItem).lastIndexOf('<ol>') ? 
                                      'ul' : 'ol';
                 result += `</${lastListType}>`;
                 inList = false;
             }
             result += line + '\n';
         }
     }
     
     // Close any open list
     if (inList) {
         const lastListItem = result.lastIndexOf('<li>');
         const lastListType = result.substring(0, lastListItem).lastIndexOf('<ul>') > 
                              result.substring(0, lastListItem).lastIndexOf('<ol>') ? 
                              'ul' : 'ol';
         result += `</${lastListType}>`;
     }
     
     // Split by newlines and wrap non-tagged content in <p> tags
     const fragments = result.split('\n');
     result = '';
     
     for (let i = 0; i < fragments.length; i++) {
         const fragment = fragments[i].trim();
         if (fragment && 
             !fragment.startsWith('<h') && 
             !fragment.startsWith('<pre') && 
             !fragment.startsWith('<ul') && 
             !fragment.startsWith('<ol') && 
             !fragment.startsWith('<li') && 
             !fragment.endsWith('</h1>') && 
             !fragment.endsWith('</h2>') && 
             !fragment.endsWith('</h3>') && 
             !fragment.endsWith('</pre>') && 
             !fragment.endsWith('</ul>') && 
             !fragment.endsWith('</ol>') && 
             !fragment.endsWith('</li>')) {
             result += `<p>${fragment}</p>`;
         } else {
             result += fragment;
         }
     }
     
     return result;
 }

// Global delegation for copy buttons on code blocks
document.addEventListener('click', async (event) => {
    const copyBtn = event.target.closest('.copy-code-btn');
    if (!copyBtn) return;
    const pre = copyBtn.closest('pre');
    const codeEl = pre?.querySelector('code');
    if (!codeEl) return;
    const raw = codeEl.textContent || '';
    try {
        await navigator.clipboard.writeText(raw);
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 1500);
    } catch (err) {
        console.error('Copy failed:', err);
        copyBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 1500);
    }
});

// Function to copy message content
async function copyMessage(content, button) {
    try {
        await navigator.clipboard.writeText(content);
        button.classList.add('copied');
        button.innerHTML = '<i class="fas fa-check"></i>';
        showMessage('Message copied to clipboard', 'success', 2000);
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        showMessage('Failed to copy message', 'error', 2000);
    }
}

// Auto-save draft functionality
let draftTimeout;
function saveDraft() {
    const draft = userInput.value.trim();
    if (draft) {
        localStorage.setItem('pakningR1_draft', draft);
    } else {
        localStorage.removeItem('pakningR1_draft');
    }
}

function loadDraft() {
    const draft = localStorage.getItem('pakningR1_draft');
    if (draft && !userInput.value.trim()) {
        userInput.value = draft;
        autoResizeTextarea();
    }
}

function clearDraft() {
    localStorage.removeItem('pakningR1_draft');
}

// Chat name editing functionality
let originalChatName = '';

function startEditingChatName(historyItem, sessionId) {
    // Prevent multiple edits at once
    if (document.querySelector('.history-item.editing')) {
        return;
    }
    
    const chatNameSpan = historyItem.querySelector('.chat-name');
    const currentName = chatNameSpan.textContent;
    originalChatName = currentName;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 100;
    
    // Replace span content with input
    chatNameSpan.innerHTML = '';
    chatNameSpan.appendChild(input);
    chatNameSpan.classList.add('editing');
    historyItem.classList.add('editing');
    
    // Focus and select text
    input.focus();
    input.select();
    
    // Add keyboard event listeners
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveChatName(historyItem, sessionId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditingChatName(historyItem, sessionId);
        }
    });
    
    // Prevent click propagation when editing
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function saveChatName(historyItem, sessionId) {
    const chatNameSpan = historyItem.querySelector('.chat-name');
    const input = chatNameSpan.querySelector('input');
    const newName = input.value.trim();
    
    if (newName && newName !== originalChatName) {
        // Update the chat name
        updateChatTitle(sessionId, newName);
        showMessage('Chat name updated', 'success', 2000);
    }
    
    // Exit editing mode
    exitEditingMode(historyItem, newName || originalChatName);
}

function cancelEditingChatName(historyItem, sessionId) {
    // Exit editing mode with original name
    exitEditingMode(historyItem, originalChatName);
}

function exitEditingMode(historyItem, finalName) {
    const chatNameSpan = historyItem.querySelector('.chat-name');
    
    // Restore span content
    chatNameSpan.innerHTML = '';
    chatNameSpan.textContent = finalName;
    chatNameSpan.classList.remove('editing');
    historyItem.classList.remove('editing');
    
    // Clear original name
    originalChatName = '';
}

// Export/Import functionality
function exportChats() {
    const data = {
        chats: chatSessions,
        settings: {
            theme: localStorage.getItem('pakningR1_theme'),
            mode: localStorage.getItem('mode'),
            sidebarWidth: localStorage.getItem('pakningR1_sidebarWidth'),
            sidebarCollapsed: localStorage.getItem('pakningR1_sidebarCollapsed')
        },
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pakning-chats-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Chats exported successfully', 'success', 3000);
}

function importChats() {
    const input = document.getElementById('import-file');
    input.click();
}

// Settings functionality
function initializeSettings() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    
    if (settingsBtn && settingsModal && closeSettingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('open');
        });
        
        closeSettingsModal.addEventListener('click', () => {
            settingsModal.classList.remove('open');
        });
        
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('open');
            }
        });
    }
    
    // Load saved settings
    loadSettings();
    
    // Add event listeners for settings
    document.getElementById('font-size')?.addEventListener('change', (e) => {
        localStorage.setItem('pakningR1_fontSize', e.target.value);
        applySettings();
    });
    
    document.getElementById('animation-speed')?.addEventListener('change', (e) => {
        localStorage.setItem('pakningR1_animationSpeed', e.target.value);
        applySettings();
    });
    
    document.getElementById('auto-scroll')?.addEventListener('change', (e) => {
        localStorage.setItem('pakningR1_autoScroll', e.target.checked);
    });
    
    document.getElementById('save-drafts')?.addEventListener('change', (e) => {
        localStorage.setItem('pakningR1_saveDrafts', e.target.checked);
    });
    
    document.getElementById('show-timestamps')?.addEventListener('change', (e) => {
        localStorage.setItem('pakningR1_showTimestamps', e.target.checked);
        applySettings();
    });
    
    document.getElementById('clear-all-data')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    });
}

function loadSettings() {
    const fontSize = localStorage.getItem('pakningR1_fontSize') || 'medium';
    const animationSpeed = localStorage.getItem('pakningR1_animationSpeed') || 'normal';
    const autoScroll = localStorage.getItem('pakningR1_autoScroll') !== 'false';
    const saveDrafts = localStorage.getItem('pakningR1_saveDrafts') !== 'false';
    const showTimestamps = localStorage.getItem('pakningR1_showTimestamps') === 'true';
    
    document.getElementById('font-size').value = fontSize;
    document.getElementById('animation-speed').value = animationSpeed;
    document.getElementById('auto-scroll').checked = autoScroll;
    document.getElementById('save-drafts').checked = saveDrafts;
    document.getElementById('show-timestamps').checked = showTimestamps;
    
    applySettings();
}

function applySettings() {
    const fontSize = localStorage.getItem('pakningR1_fontSize') || 'medium';
    const animationSpeed = localStorage.getItem('pakningR1_animationSpeed') || 'normal';
    const showTimestamps = localStorage.getItem('pakningR1_showTimestamps') === 'true';
    
    // Apply font size
    document.body.className = document.body.className.replace(/font-\w+/g, '');
    document.body.classList.add(`font-${fontSize}`);
    
    // Apply animation speed
    document.body.className = document.body.className.replace(/animation-\w+/g, '');
    document.body.classList.add(`animation-${animationSpeed}`);
    
    // Apply timestamp visibility
    if (showTimestamps) {
        document.body.classList.add('show-timestamps');
    } else {
        document.body.classList.remove('show-timestamps');
    }
}
 
 // Function to detect Chinese/Japanese/Korean text
 function containsCJK(text) {
     // Test for Chinese, Japanese, Korean characters
     return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
 }
 
 // Function to sanitize and prepare text for display
 function sanitizeText(text) {
     // Clean up common encoding issues
     text = text.replace(/\\n/g, '\n');
     text = text.replace(/\\t/g, '\t');
     text = text.replace(/\\"/g, '"');
     text = text.replace(/\\'/g, "'");
     return text;
 }
 
// Function to add message to the chat UI
function addMessageToChat(content, sender, isThinking = false) {
    // Remove welcome screen if it exists
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
        
        // Show current mode indicator and back button
        currentModeIndicator.classList.add('visible');
        if (backToChatBtn) {
            backToChatBtn.style.display = 'flex';
        }
    }
     
     const messageDiv = document.createElement('div');
     messageDiv.classList.add('message', sender);
     if (isThinking) {
         messageDiv.classList.add('thinking', currentMode);
     }
     
     const avatarDiv = document.createElement('div');
     avatarDiv.classList.add('message-avatar', sender);
     avatarDiv.textContent = sender === 'user' ? 'U' : 'P';
     
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Detect if content contains CJK characters and add appropriate lang attribute
    if (containsCJK(content)) {
        contentDiv.setAttribute('lang', 'zh');
    }
    
    // Add message actions for non-thinking messages
    if (!isThinking) {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');
        
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('message-action-btn');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy message';
        copyBtn.addEventListener('click', () => copyMessage(content, copyBtn));
        
        actionsDiv.appendChild(copyBtn);
        messageDiv.appendChild(actionsDiv);
    }
     
     if (isThinking) {
         contentDiv.innerHTML = `
             <div class="thinking-header">
                 <i class="fas fa-cogs thinking-icon"></i>
                 <span>Thinking...</span>
             </div>
             <div class="thinking-content">${content}</div>
         `;
     } else {
         // Clean up content before displaying
         content = sanitizeText(content);
         
         // Handle special characters in user input
         if (sender === 'user') {
             // Escape HTML in user messages
             const tempDiv = document.createElement('div');
             tempDiv.textContent = content;
             contentDiv.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
             
             // Check if this is the first user message in the chat
             const existingUserMessages = chatMessages.querySelectorAll('.message.user');
             if (existingUserMessages.length === 0) {
                 const shortTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
                 document.title = shortTitle + ' - PAKNING R1';
                 
                 // Update in sidebar and storage
                 updateChatTitle(currentSessionId, shortTitle);
             }
        } else {
            // Format markdown for bot messages
            contentDiv.innerHTML = formatMarkdown(content);
        }
        
        // Add timestamp if enabled
        const showTimestamps = localStorage.getItem('pakningR1_showTimestamps') === 'true';
        if (showTimestamps) {
            const timestamp = document.createElement('div');
            timestamp.classList.add('message-timestamp');
            timestamp.textContent = new Date().toLocaleTimeString();
            contentDiv.appendChild(timestamp);
        }
     }
     
     messageDiv.appendChild(avatarDiv);
     messageDiv.appendChild(contentDiv);
     
     // If it's thinking mode replacing a previous thinking message, remove the old one
     if (sender === 'bot' && !isThinking) {
         const thinkingMsg = chatMessages.querySelector('.message.bot.thinking');
         if (thinkingMsg) {
             thinkingMsg.remove();
         }
     }
     
     chatMessages.appendChild(messageDiv);
     chatMessages.scrollTop = chatMessages.scrollHeight;
    // Update scroll button state after new content
    updateScrollButtonVisibility();
     
     return messageDiv;
 }
 
 // Function to show thinking indicator with appropriate steps
 function showThinkingIndicator() {
     // Remove any existing thinking indicators first
     const existingThinkingIndicators = document.querySelectorAll('.message.bot.thinking');
     existingThinkingIndicators.forEach(indicator => {
         indicator.remove();
     });
     
     // Get current mode's thinking steps
     const mode = reasoningModes[currentMode];
     const steps = mode.thinkingSteps || [];
     
     // Create empty thinking message
     const thinkingContent = document.createElement('div');
     thinkingContent.classList.add('thinking-content');
     
     // Add the thinking message to the chat
     const thinkingMsg = addMessageToChat('', 'bot', true);
     
     // Reference to the thinking-content div
     const thinkingContentDiv = thinkingMsg.querySelector('.thinking-content');
     
     // Add thinking steps with staggered delay
     let stepDelay = mode.stepDelay || 500;
     
     steps.forEach((step, index) => {
         setTimeout(() => {
             const stepDiv = document.createElement('div');
             stepDiv.classList.add('thinking-step');
             
             const icon = document.createElement('i');
             icon.classList.add('fas', 'fa-circle-notch', 'fa-spin');
             
             const text = document.createElement('span');
             text.textContent = step;
             
             stepDiv.appendChild(icon);
             stepDiv.appendChild(text);
             
             thinkingContentDiv.appendChild(stepDiv);
             
             // Scroll to bottom
             chatMessages.scrollTop = chatMessages.scrollHeight;
         }, stepDelay * (index + 1));
     });
 }
 
 // Function to remove typing indicator
 function removeTypingIndicator() {
     const indicator = document.getElementById('typing-indicator');
     if (indicator) {
         indicator.remove();
     }
 }
 
 // Function to send message to API
 async function sendMessageToAPI(userMessage) {
     // Check for valid API key
     if (!hasValidApiKey()) {
         console.error('No valid API key available');
         removeTypingIndicator();
         handleAPIConnectionError('Missing API key');
         return null;
     }
     
     const maxRetries = 2; // Number of retries
     
     for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
         if (retryCount > 0) {
             console.log(`Retry attempt ${retryCount}...`);
         }
         
         // Prepare API request options
         const requestOptions = {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${apiKey}`,
                 'HTTP-Referer': window.location.href, 
                 'X-Title': 'PAKNING R1 Chatbot', 
                 'Content-Type': 'application/json'
             },
            body: JSON.stringify({
                'model': 'qwen/qwen3-14b:free',
                'messages': messagesHistory,
                'temperature': expertModes[currentMode].temperature,
                'max_tokens': expertModes[currentMode].maxTokens,
                'stream': true // Enable streaming
            })
         };
         
         try {
             console.log(`Sending request to ${API_URL}...`);
             const response = await fetch(API_URL, requestOptions);
             
             if (!response.ok) {
                 const errorText = await response.text();
                 console.error(`API Error, retry ${retryCount}:`, errorText);
                 
                 if (retryCount < maxRetries) {
                     const delayMs = 1000 * (retryCount + 1);
                     await new Promise(resolve => setTimeout(resolve, delayMs));
                     continue;
                 }
                 
                 removeTypingIndicator();
                 handleAPIConnectionError(`API returned error: ${response.status}`);
                 return null;
             }
             
             // Create a new message div for streaming response
             const messageDiv = addMessageToChat('', 'bot');
             const contentDiv = messageDiv.querySelector('.message-content');
             let fullResponse = '';
             
             // Read the response as a stream
             const reader = response.body.getReader();
             const decoder = new TextDecoder();
             
             while (true) {
                 const { done, value } = await reader.read();
                 if (done) break;
                 
                 // Decode the chunk and parse it
                 const chunk = decoder.decode(value);
                 const lines = chunk.split('\n');
                 
                 for (const line of lines) {
                     if (line.startsWith('data: ')) {
                         const data = line.slice(6);
                         if (data === '[DONE]') {
                             // Stream complete
                             break;
                         }
                         
                         try {
                             const parsed = JSON.parse(data);
                             if (parsed.choices && parsed.choices[0].delta.content) {
                                 const newContent = parsed.choices[0].delta.content;
                                 fullResponse += newContent;
                                 
                                 // Clean up the content before formatting
                                 const cleanedContent = sanitizeText(fullResponse);
                                 
                                 // Update the message content with markdown formatting
                                 contentDiv.innerHTML = formatMarkdown(cleanedContent);
                                 
                                 // Scroll to bottom
                                 chatMessages.scrollTop = chatMessages.scrollHeight;
                             }
                         } catch (e) {
                             console.error('Error parsing chunk:', e);
                         }
                     }
                 }
             }
             
             // Add complete response to history only once
             if (fullResponse) {
                 messagesHistory.push({
                     role: 'assistant',
                     content: fullResponse
                 });
                 
                 // Update chat session in storage
                 updateChatSession();
             }
             
             console.log(`Successfully received response from API`);
             return fullResponse;
             
         } catch (error) {
             console.error(`API Error, retry ${retryCount}:`, error);
             
             if (retryCount < maxRetries) {
                 const delayMs = 1000 * (retryCount + 1);
                 await new Promise(resolve => setTimeout(resolve, delayMs));
                 continue;
             }
             
             removeTypingIndicator();
             handleAPIConnectionError(error.message || "Network error connecting to API");
             return null;
         }
     }
     
     return null;
 }
 
// Function to handle sending a message
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message || isWaitingForResponse) return;
    
    // Clear input and draft
    userInput.value = '';
    userInput.style.height = 'auto';
    clearDraft();
    
    // If this is the first message and we don't have a current session, create one
    if (!currentSessionId) {
        currentSessionId = Date.now().toString();
        const defaultTitle = 'New Chat ' + formatDate(new Date());
        addNewChatToHistory(defaultTitle);
    }
    
    // Add user message to chat (this will update the title if it's the first message)
    addMessageToChat(message, 'user');
    
    // Add to history
    messagesHistory.push({
        role: 'user',
        content: message
    });
    
    // Update chat session in storage immediately after adding user message
    updateChatSession();
    
    // Check if we have a valid API key
    if (!hasValidApiKey()) {
        console.error('No valid API key available');
        showMessage('API key not configured. Please check your environment variables.', 'error', 8000);
        
        // Create an error message for missing API key
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('api-error-notification');
        errorDiv.innerHTML = `
            <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="error-content">
                <h3>API Key Missing</h3>
                <p>No valid API key is configured in the Netlify environment variables.</p>
                <p>Please contact your administrator to set up the API_KEY environment variable in Netlify.</p>
            </div>
        `;
        
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return;
    }
    
    // Set waiting state with loading animation
    isWaitingForResponse = true;
    sendButton.disabled = true;
    sendButton.classList.add('loading');
    userInput.disabled = true;
    
    // Show thinking indicator based on current mode
    showThinkingIndicator();
    
    // Send to API
    try {
        await sendMessageToAPI(message);
        
        // Reset waiting state
        isWaitingForResponse = false;
        sendButton.disabled = false;
        sendButton.classList.remove('loading');
        userInput.disabled = false;
        userInput.focus();
        
        // Update chat session in storage
        updateChatSession();
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove any thinking indicators
        const thinkingIndicators = document.querySelectorAll('.message.bot.thinking');
        thinkingIndicators.forEach(indicator => indicator.remove());
        
        // Show error message
        showMessage('Failed to send message. Please try again.', 'error', 5000);
        
        // Add simple error message to history
        messagesHistory.push({
            role: 'assistant',
            content: 'Sorry, the AI service is currently unavailable. Please try again later.'
        });
        
        // Reset waiting state
        isWaitingForResponse = false;
        sendButton.disabled = false;
        sendButton.classList.remove('loading');
        userInput.disabled = false;
        userInput.focus();
        
        // Update chat session in storage
        updateChatSession();
    }
}
 
 // Function to auto-resize textarea
 function autoResizeTextarea() {
     userInput.style.height = 'auto';
     userInput.style.height = (userInput.scrollHeight) + 'px';
 }
 
// Function to clear chat
function clearChat() {
    // Show confirmation dialog
    const chatTitle = chatSessions.find(s => s.id === currentSessionId)?.title || 'this conversation';
    if (!confirm(`Are you sure you want to delete "${chatTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    // Remove the session from storage and sidebar
    const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex !== -1) {
        // Remove from array
        chatSessions.splice(sessionIndex, 1);
        
        // Remove from UI
        const historyItem = document.querySelector(`.history-item[data-id="${currentSessionId}"]`);
        if (historyItem) {
            historyItem.remove();
        }
        
        // Save changes
        saveChatsToLocalStorage();
        
        // Reset current session
        currentSessionId = null;
        
        // Reset message history with system prompt
        messagesHistory = [
            {
                role: "system",
                content: expertModes[currentMode].systemPrompt
            }
        ];
        
        // Show welcome screen
        showWelcomeScreen();
        
        // Show success message
        showMessage('Chat deleted successfully', 'success', 2000);
    }
}
 
// Function to show the welcome screen
function showWelcomeScreen() {
    // Clear messages and show welcome screen
    chatMessages.innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-content">
                <div class="welcome-logo">
                    <div class="ning-logo large">P</div>
                </div>
                <h1>PAKNING R1</h1>
                <p>Advanced reasoning AI with exceptional problem-solving capabilities</p>
                
                <div class="expert-selection-container">
                    <div class="expert-selection">
                        <p class="expert-title">Select Your AI Expert:</p>
                        <div class="expert-grid">
                            <button class="expert-btn ${currentMode === 'general' ? 'active' : ''}" data-mode="general">
                                <i class="fas fa-user-tie"></i>
                                <span>General Assistant</span>
                                <small>Versatile AI for general tasks</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'coding' ? 'active' : ''}" data-mode="coding">
                                <i class="fas fa-code"></i>
                                <span>Code Expert</span>
                                <small>Programming & software engineering</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'business' ? 'active' : ''}" data-mode="business">
                                <i class="fas fa-chart-line"></i>
                                <span>Business Strategist</span>
                                <small>Strategy, marketing & operations</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'creative' ? 'active' : ''}" data-mode="creative">
                                <i class="fas fa-palette"></i>
                                <span>Creative Director</span>
                                <small>Design, writing & artistic projects</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'research' ? 'active' : ''}" data-mode="research">
                                <i class="fas fa-microscope"></i>
                                <span>Research Scientist</span>
                                <small>Scientific analysis & data interpretation</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'health' ? 'active' : ''}" data-mode="health">
                                <i class="fas fa-heartbeat"></i>
                                <span>Health Advisor</span>
                                <small>Health, wellness & medical guidance</small>
                            </button>
                            <button class="expert-btn ${currentMode === 'education' ? 'active' : ''}" data-mode="education">
                                <i class="fas fa-graduation-cap"></i>
                                <span>Learning Coach</span>
                                <small>Educational strategies & academic support</small>
                            </button>
                        </div>
                        <div class="expert-description">
                            <p id="expert-description-text">${expertModes[currentMode].description}</p>
                        </div>
                    </div>
                </div>
                
                <div class="feature-points">
                    <div class="feature-point">
                        <i class="fas fa-users"></i>
                        <span>Specialized AI experts for different domains</span>
                    </div>
                    <div class="feature-point">
                        <i class="fas fa-brain"></i>
                        <span>Professional-grade expertise and insights</span>
                    </div>
                    <div class="feature-point">
                        <i class="fas fa-cogs"></i>
                        <span>Optimized responses for each field</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update chat title
    document.title = 'PAKNING R1';
    
    // Hide mode indicator and back button
    currentModeIndicator.classList.remove('visible');
    if (backToChatBtn) {
        backToChatBtn.style.display = 'none';
    }
    
    // Remove active class from all history items
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add event listeners for expert buttons
    const expertButtons = document.querySelectorAll('.expert-btn');
    expertButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            setExpertMode(mode);
            
            // Update active button
            expertButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update description
            document.getElementById('expert-description-text').textContent = expertModes[mode].description;
        });
    });
}
 
 // Function to toggle theme
 function toggleTheme() {
     document.body.classList.toggle('light-theme');
     
     // Update theme icon
     const themeIcon = themeToggle.querySelector('i');
     const themeText = themeToggle.querySelector('span');
     
     if (document.body.classList.contains('light-theme')) {
         themeIcon.classList.remove('fa-moon');
         themeIcon.classList.add('fa-sun');
         themeText.textContent = 'Light Mode';
     } else {
         themeIcon.classList.remove('fa-sun');
         themeIcon.classList.add('fa-moon');
         themeText.textContent = 'Dark Mode';
     }
     
     // Save theme preference to localStorage
     localStorage.setItem('pakningR1_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
 }
 
 // Function to load theme preference from localStorage
 function loadThemePreference() {
    const theme = localStorage.getItem('pakningR1_theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else if (theme === 'dark') {
        document.body.classList.remove('light-theme');
    } else {
        // No saved preference: auto-detect from system
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        if (prefersLight) {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }
    // Update theme UI
    const themeIcon = themeToggle.querySelector('i');
    const themeText = themeToggle.querySelector('span');
    if (document.body.classList.contains('light-theme')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        themeText.textContent = 'Dark Mode';
    }
 }
 
 // Function to toggle sidebar visibility
 function toggleSidebar() {
     if (sidebar.classList.contains('collapsed')) {
         showSidebar();
     } else {
         hideSidebar();
     }
 }
 
 // Function to hide sidebar
 function hideSidebar() {
     sidebar.classList.add('collapsed');
     showSidebarBtn.classList.add('visible');
     localStorage.setItem('pakningR1_sidebarCollapsed', 'true');
     
     // Add some delay before making the show button visible for smooth animation
     setTimeout(() => {
         showSidebarBtn.style.opacity = '1';
         showSidebarBtn.style.transform = 'scale(1)';
     }, 300);
 }
 
 // Function to show sidebar
 function showSidebar() {
     sidebar.classList.remove('collapsed');
     localStorage.setItem('pakningR1_sidebarCollapsed', 'false');
     
     // Start transition then remove visible class
     showSidebarBtn.style.opacity = '0';
     showSidebarBtn.style.transform = 'scale(0)';
     
     setTimeout(() => {
         showSidebarBtn.classList.remove('visible');
     }, 300);
 }
 
 // Function to make sidebar resizable
 function initSidebarResize() {
     let isResizing = false;
     const minWidth = 180;
     const maxWidth = 400;
     const defaultWidth = 260;
     
     // Get saved width
     const savedWidth = localStorage.getItem('pakningR1_sidebarWidth');
     if (savedWidth) {
         sidebar.style.width = `${savedWidth}px`;
     }
     
     sidebarResizer.addEventListener('mousedown', function(e) {
         e.preventDefault();
         isResizing = true;
         document.body.classList.add('resizing');
     });
     
     document.addEventListener('mousemove', function(e) {
         if (!isResizing) return;
         
         const newWidth = e.clientX;
         
         // Apply constraints
         if (newWidth < minWidth) {
             sidebar.style.width = `${minWidth}px`;
         } else if (newWidth > maxWidth) {
             sidebar.style.width = `${maxWidth}px`;
         } else {
             sidebar.style.width = `${newWidth}px`;
         }
     });
     
     document.addEventListener('mouseup', function() {
         if (isResizing) {
             isResizing = false;
             document.body.classList.remove('resizing');
             
             // Save new width
             localStorage.setItem('pakningR1_sidebarWidth', sidebar.style.width.replace('px', ''));
         }
     });
     
     // Also handle touch events for mobile
     sidebarResizer.addEventListener('touchstart', function(e) {
         e.preventDefault();
         isResizing = true;
         document.body.classList.add('resizing');
     });
     
     document.addEventListener('touchmove', function(e) {
         if (!isResizing) return;
         
         const touch = e.touches[0];
         const newWidth = touch.clientX;
         
         // Apply constraints
         if (newWidth < minWidth) {
             sidebar.style.width = `${minWidth}px`;
         } else if (newWidth > maxWidth) {
             sidebar.style.width = `${maxWidth}px`;
         } else {
             sidebar.style.width = `${newWidth}px`;
         }
     });
     
     document.addEventListener('touchend', function() {
         if (isResizing) {
             isResizing = false;
             document.body.classList.remove('resizing');
             
             // Save new width
             localStorage.setItem('pakningR1_sidebarWidth', sidebar.style.width.replace('px', ''));
         }
     });
 }
 
 // Load sidebar state
 function loadSidebarState() {
     const isCollapsed = localStorage.getItem('pakningR1_sidebarCollapsed') === 'true';
     if (isCollapsed) {
         hideSidebar();
     }
 }
 
 // Event listeners
 sendButton.addEventListener('click', handleSendMessage);
 userInput.addEventListener('keypress', (e) => {
     if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSendMessage();
     }
 });

// Also support Ctrl+Enter to send
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        userInput.focus();
    }
    
    // Ctrl/Cmd + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
    }
    
    // Escape to clear input or go back
    if (e.key === 'Escape') {
        if (userInput.value.trim()) {
            userInput.value = '';
            userInput.style.height = 'auto';
        } else if (backToChatBtn && backToChatBtn.style.display !== 'none') {
            showWelcomeScreen();
        }
    }
    
    // Ctrl/Cmd + / to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
});
 
// Auto-resize as user types and save draft
userInput.addEventListener('input', () => {
    autoResizeTextarea();
    clearTimeout(draftTimeout);
    draftTimeout = setTimeout(saveDraft, 1000);
});
 
 // New chat button
 newChatBtn.addEventListener('click', createNewChat);
 
 // Clear chat button
 clearChatBtn.addEventListener('click', clearChat);
 
 // Theme toggle
 themeToggle.addEventListener('click', toggleTheme);
 
 // Sidebar toggle (mobile)
 if (sidebarToggle) {
     sidebarToggle.addEventListener('click', toggleSidebar);
 }
 
 // Mode buttons event delegation (this will work for dynamically created buttons)
 document.addEventListener('click', function(event) {
     console.log('Click event on element:', event.target);
     
     // Check if the clicked element or any of its parents is a mode button
     const modeBtn = event.target.closest('.mode-btn');
     if (modeBtn) {
         const mode = modeBtn.dataset.mode;
         console.log('Mode button clicked via delegation:', mode, modeBtn);
         
         // Manually update button styles immediately for better user feedback
         document.querySelectorAll('.mode-btn').forEach(btn => {
             if (btn.dataset.mode === mode) {
                 btn.classList.add('active');
             } else {
                 btn.classList.remove('active');
             }
         });
         
         // Then call the mode setting function
         setReasoningMode(mode);
         
         // Prevent any default behavior
         event.preventDefault();
     }
 });
 
 // History item click event delegation
 document.querySelector('.chat-history').addEventListener('click', (e) => {
     const historyItem = e.target.closest('.history-item');
     if (historyItem) {
         // Load chat session
         const sessionId = historyItem.dataset.id;
         const session = chatSessions.find(s => s.id === sessionId);
         if (session) {
             // Update current session
             currentSessionId = sessionId;
             messagesHistory = [...session.messages];
             
             // Set the mode from the session
             if (session.mode) {
                 setReasoningMode(session.mode);
             }
             
             // Update chat title
             document.title = session.title.length > 20 
                 ? session.title.substring(0, 20) + '...' 
                 : session.title;
             
             // Clear chat and rebuild from history
             chatMessages.innerHTML = '';
             
            // Show mode indicator and back button
            currentModeIndicator.classList.add('visible');
            if (backToChatBtn) {
                backToChatBtn.style.display = 'flex';
            }
             
             // Add messages from history
             for (let i = 1; i < messagesHistory.length; i++) {
                 const msg = messagesHistory[i];
                 if (msg.role === 'user' || msg.role === 'assistant') {
                     addMessageToChat(msg.content, msg.role === 'user' ? 'user' : 'bot');
                 }
             }
             
             // Highlight active chat in sidebar
             document.querySelectorAll('.history-item').forEach(item => {
                 item.classList.remove('active');
             });
             historyItem.classList.add('active');
         }
     }
 });
 
// Function to show a message to the user
function showMessage(message, type = 'info', duration = 5000) {
    // Don't show messages in mobile mode
    if (document.body.classList.contains('mobile-mode')) {
        console.log('Message suppressed in mobile mode:', message);
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Trigger animation
    setTimeout(() => messageDiv.classList.add('visible'), 100);

    // Remove the message after specified duration
    setTimeout(() => {
        messageDiv.classList.add('hidden');
        setTimeout(() => messageDiv.remove(), 300);
    }, duration);
}
 
 // Function to set interface mode
 function setInterfaceMode(mode) {
     // Check if we're on a mobile device
     const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
     
     // If it's a mobile device, force mobile mode
     if (isMobileDevice && mode === 'web-mode') {
         console.log('Mobile device detected, forcing mobile mode');
         mode = 'mobile-mode';
     }
     
     // Remove existing mode classes
     document.body.classList.remove('web-mode', 'mobile-mode');
     
     // Add new mode class
     document.body.classList.add(mode);
     
     // Save preference only if not forcing mobile mode
     if (!isMobileDevice) {
         localStorage.setItem('preferredMode', mode);
     }
     
    // Update UI elements for mobile mode
    if (mode === 'mobile-mode') {
        // Hide sidebar by default on mobile
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
        
        // Adjust chat container padding for mobile nav
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
            chatContainer.style.paddingBottom = '140px'; // Space for input + nav
        }
        
        // Move input container to bottom
        const inputContainer = document.querySelector('.chat-input-container');
        if (inputContainer) {
            inputContainer.classList.add('mobile-fixed');
        }
        
        // Show mobile navigation
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.style.display = 'flex';
        }
        
        // Hide desktop-only elements
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Hide desktop sidebar controls
        if (hideSidebarBtn) hideSidebarBtn.style.display = 'none';
        if (showSidebarBtn) showSidebarBtn.style.display = 'none';
        
        // Update mobile nav states
        updateMobileNavStates();
        
        // Add mobile-specific event listeners
        setupMobileTouchHandlers();
        
    } else {
         // Restore desktop layout
         if (sidebar) {
             sidebar.classList.remove('collapsed');
         }
         
         const chatContainer = document.querySelector('.chat-messages');
         if (chatContainer) {
             chatContainer.style.paddingBottom = '20px';
         }
         
         const inputContainer = document.querySelector('.chat-input-container');
         if (inputContainer) {
             inputContainer.classList.remove('mobile-fixed');
         }
         
         // Show desktop-only elements
         document.querySelectorAll('.desktop-only').forEach(el => {
             el.style.display = '';
         });
         
     }
     
 }

// Function to initialize mobile detection
function initializeMobileMode() {
    // Check if we're on a mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
        // Force mobile mode on mobile devices
        setInterfaceMode('mobile-mode');
    } else {
        // For desktop, check saved preference or use default
        const savedMode = localStorage.getItem('preferredMode');
        if (savedMode) {
            setInterfaceMode(savedMode);
        } else {
            // Auto-detect based on screen size
            const shouldBeMobile = window.innerWidth <= 768;
            setInterfaceMode(shouldBeMobile ? 'mobile-mode' : 'web-mode');
        }
    }
}

// Scroll-to-bottom logic
function updateScrollButtonVisibility() {
    const threshold = 120;
    const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    if (distanceFromBottom > threshold) {
        scrollToBottomBtn?.classList.add('visible');
    } else {
        scrollToBottomBtn?.classList.remove('visible');
    }
}

scrollToBottomBtn?.addEventListener('click', () => {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

// Throttled scroll handler for better performance
const throttledScrollHandler = throttle(updateScrollButtonVisibility, 100);
chatMessages.addEventListener('scroll', throttledScrollHandler);

// Enhanced mobile navigation handlers
function setupMobileNavigation() {
    // Toggle sidebar with enhanced animations
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');
        
        if (!isOpen) {
            // Open sidebar
            sidebar.classList.add('open');
            
            // Add overlay with animation
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Animate overlay in
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
            
            // Close sidebar when overlay is clicked
            overlay.addEventListener('click', () => {
                closeMobileSidebar();
            });
            
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
            
        } else {
            closeMobileSidebar();
        }
    });
    
    // New chat button with haptic feedback
    document.getElementById('newChatMobile')?.addEventListener('click', () => {
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        createNewChat();
        closeMobileSidebar();
        
        // Show success feedback
        userFeedback.showFeedback('success', 'New chat started', 2000);
    });
    
    // Share button with enhanced sharing
    document.getElementById('shareMobile')?.addEventListener('click', () => {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        shareApplication();
    });
    
    // Theme toggle with animation
    document.getElementById('themeToggleMobile')?.addEventListener('click', () => {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        toggleTheme();
        
        // Update mobile nav button icon
        const themeIcon = document.getElementById('themeToggleMobile').querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    });
    
    // Mode switch button
    document.getElementById('modeSwitchMobile')?.addEventListener('click', () => {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        const newMode = currentMode === 'default' ? 'deepthink' : 'default';
        setReasoningMode(newMode);
        
        // Update button icon
        const modeIcon = document.getElementById('modeSwitchMobile').querySelector('i');
        if (newMode === 'deepthink') {
            modeIcon.className = 'fas fa-brain';
        } else {
            modeIcon.className = 'fas fa-balance-scale';
        }
        
        userFeedback.showFeedback('info', `Switched to ${newMode} mode`, 2000);
    });
    
    // Clear chat with confirmation
    document.getElementById('clearChatMobile')?.addEventListener('click', () => {
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        if (confirm('Are you sure you want to clear this conversation?')) {
            clearChat();
            userFeedback.showFeedback('success', 'Chat cleared', 2000);
        }
    });
    
    // Handle mobile nav button active states
    updateMobileNavStates();
}

// Helper function to close mobile sidebar
function closeMobileSidebar() {
    sidebar.classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
    document.body.style.overflow = '';
}

// Update mobile navigation button states
function updateMobileNavStates() {
    // Update theme button
    const themeBtn = document.getElementById('themeToggleMobile');
    if (themeBtn) {
        const themeIcon = themeBtn.querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }
    
    // Update mode button
    const modeBtn = document.getElementById('modeSwitchMobile');
    if (modeBtn) {
        const modeIcon = modeBtn.querySelector('i');
        if (currentMode === 'deepthink') {
            modeIcon.className = 'fas fa-brain';
        } else {
            modeIcon.className = 'fas fa-balance-scale';
        }
    }
}

// Mobile touch handlers for enhanced mobile experience
function setupMobileTouchHandlers() {
    // Swipe gestures for sidebar
    let startX = 0;
    let startY = 0;
    let isSwipe = false;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipe = false;
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // Determine if this is a horizontal swipe
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            isSwipe = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('touchend', (e) => {
        if (!startX || !startY || !isSwipe) return;
        
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        // Swipe right to open sidebar (from left edge)
        if (diffX < -100 && startX < 50) {
            if (!sidebar.classList.contains('open')) {
                document.getElementById('toggleSidebar')?.click();
            }
        }
        // Swipe left to close sidebar
        else if (diffX > 100 && sidebar.classList.contains('open')) {
            closeMobileSidebar();
        }
        
        startX = 0;
        startY = 0;
        isSwipe = false;
    });
    
    // Pull to refresh functionality
    let pullStartY = 0;
    let isPulling = false;
    
    chatMessages.addEventListener('touchstart', (e) => {
        if (chatMessages.scrollTop === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    chatMessages.addEventListener('touchmove', (e) => {
        if (!isPulling || chatMessages.scrollTop > 0) return;
        
        const currentY = e.touches[0].clientY;
        const diffY = currentY - pullStartY;
        
        if (diffY > 100) {
            // Pull to refresh
            userFeedback.showFeedback('info', 'Pull to refresh', 1000);
        }
    });
    
    chatMessages.addEventListener('touchend', () => {
        isPulling = false;
        pullStartY = 0;
    });
    
    // Enhanced input handling for mobile
    const userInput = document.getElementById('user-input');
    if (userInput) {
        // Prevent zoom on focus (iOS)
        userInput.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                userInput.style.fontSize = '16px';
            }
            
            // Handle keyboard appearance
            setTimeout(() => {
                document.body.classList.add('keyboard-open');
                const chatContainer = document.querySelector('.chat-messages');
                const inputContainer = document.querySelector('.chat-input-container');
                
                if (chatContainer) {
                    chatContainer.classList.add('keyboard-open');
                }
                if (inputContainer) {
                    inputContainer.classList.add('keyboard-open');
                }
                
                // Scroll to bottom when keyboard opens
                setTimeout(() => {
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                }, 300);
            }, 100);
        });
        
        userInput.addEventListener('blur', () => {
            // Handle keyboard dismissal
            setTimeout(() => {
                document.body.classList.remove('keyboard-open');
                const chatContainer = document.querySelector('.chat-messages');
                const inputContainer = document.querySelector('.chat-input-container');
                
                if (chatContainer) {
                    chatContainer.classList.remove('keyboard-open');
                }
                if (inputContainer) {
                    inputContainer.classList.remove('keyboard-open');
                }
            }, 100);
        });
        
        // Auto-resize on mobile
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        });
    }
    
    // Long press for context menu
    let longPressTimer = null;
    
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.message')) {
            longPressTimer = setTimeout(() => {
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                showMobileContextMenu(e.target.closest('.message'), e.touches[0]);
            }, 500);
        }
    });
    
    document.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
    
    document.addEventListener('touchmove', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
}

// Mobile context menu
function showMobileContextMenu(messageElement, touch) {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'mobile-context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-content">
            <button class="context-btn" onclick="copyMessage(this.closest('.message'))">
                <i class="fas fa-copy"></i>
                <span>Copy</span>
            </button>
            <button class="context-btn" onclick="shareMessage(this.closest('.message'))">
                <i class="fas fa-share"></i>
                <span>Share</span>
            </button>
        </div>
    `;
    
    // Position context menu
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = Math.min(touch.clientX, window.innerWidth - 200) + 'px';
    contextMenu.style.top = Math.min(touch.clientY, window.innerHeight - 100) + 'px';
    contextMenu.style.zIndex = '3000';
    
    document.body.appendChild(contextMenu);
    
    // Remove context menu after delay
    setTimeout(() => {
        if (contextMenu.parentNode) {
            contextMenu.remove();
        }
    }, 3000);
    
    // Remove on touch outside
    document.addEventListener('touchstart', function removeContextMenu() {
        contextMenu.remove();
        document.removeEventListener('touchstart', removeContextMenu);
    });
}

// Share message function
function shareMessage(messageElement) {
    const content = messageElement.querySelector('.message-content').textContent;
    if (navigator.share) {
        navigator.share({
            title: 'PAKNING R1 Message',
            text: content
        });
    } else {
        navigator.clipboard.writeText(content);
        userFeedback.showFeedback('success', 'Message copied to clipboard', 2000);
    }
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    
    // Initialize mobile mode
    initializeMobileMode();
    
    // Setup mobile navigation
    setupMobileNavigation();
    
    // Initialize API key from Netlify environment variables
    await initializeApiKey();
    
    // Load saved chats
    loadChatsFromLocalStorage();
    
    // Add debounced search functionality
    if (chatSearch) {
        const debouncedSearch = debounce((searchTerm) => {
            renderChatHistory(searchTerm);
        }, 300);
        
        chatSearch.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    // Initialize settings
    initializeSettings();
    
    // Add export/import event listeners
    document.getElementById('export-chats')?.addEventListener('click', exportChats);
    document.getElementById('import-chats')?.addEventListener('click', importChats);
    
    // Handle file import
    document.getElementById('import-file')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.chats && Array.isArray(data.chats)) {
                        chatSessions = data.chats;
                        saveChatsToLocalStorage();
                        renderChatHistory();
                        showMessage('Chats imported successfully', 'success', 3000);
                    } else {
                        showMessage('Invalid file format', 'error', 3000);
                    }
                } catch (error) {
                    showMessage('Error importing file', 'error', 3000);
                }
            };
            reader.readAsText(file);
        }
    });
    
    // Initialize mode
    initializeMode();
    
    // Load theme preference
    loadThemePreference();
    
    // Load sidebar state
    loadSidebarState();
    
    // Initialize sidebar resize
    initSidebarResize();
    
    // Focus on input and load draft
    userInput.focus();
    loadDraft();
    // Initial scroll button state
    updateScrollButtonVisibility();
});

// Add mode switch button event listener
document.getElementById('mode-switch-btn').addEventListener('click', () => {
    toggleMode();
});

// Add welcome screen mode switch button event listener
document.getElementById('welcome-mode-switch').addEventListener('click', () => {
    toggleMode();
});

// Function to toggle mode
function toggleMode() {
    const isDeepThink = document.body.classList.toggle('deepthink-mode');
    localStorage.setItem('mode', isDeepThink ? 'deepthink' : 'default');
    
    // Update current mode variable
    currentMode = isDeepThink ? 'deepthink' : 'default';
    
    // Update system prompt in message history
    messagesHistory[0] = {
        role: "system",
        content: reasoningModes[currentMode].systemPrompt
    };
    
    // Update all mode switch buttons
    updateModeButtons(isDeepThink);
    
    // Show mode change toast
    showMessage(`Switched to ${isDeepThink ? 'DeepThink' : 'Default'} mode`, 'info');
}

// Function to update all mode switch buttons
function updateModeButtons(isDeepThink) {
    // Update question bar mode switch button
    const modeBtn = document.getElementById('mode-switch-btn');
    if (modeBtn) {
        const modeIcon = modeBtn.querySelector('i');
        const modeText = document.getElementById('mini-mode-indicator');
        
        if (isDeepThink) {
            modeIcon.className = 'fas fa-brain';
            modeText.textContent = 'DeepThink';
            modeBtn.style.borderColor = 'var(--deepthink-color)';
            modeBtn.style.color = 'var(--deepthink-color)';
        } else {
            modeIcon.className = 'fas fa-balance-scale';
            modeText.textContent = 'Default';
            modeBtn.style.borderColor = 'var(--default-color)';
            modeBtn.style.color = 'var(--default-color)';
        }
    }
    
    // Update welcome screen mode switch button
    const welcomeModeBtn = document.getElementById('welcome-mode-switch');
    if (welcomeModeBtn) {
        const welcomeModeIcon = welcomeModeBtn.querySelector('i');
        const welcomeModeText = welcomeModeBtn.querySelector('span');
        
        if (isDeepThink) {
            welcomeModeIcon.className = 'fas fa-brain';
            welcomeModeText.textContent = 'DeepThink Mode';
            welcomeModeBtn.classList.add('active');
        } else {
            welcomeModeIcon.className = 'fas fa-balance-scale';
            welcomeModeText.textContent = 'Default Mode';
            welcomeModeBtn.classList.remove('active');
        }
    }
    
    // Update mode buttons in welcome screen
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === (isDeepThink ? 'deepthink' : 'default')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Update the initializeMode function
function initializeMode() {
    const savedMode = localStorage.getItem('mode') || 'general';
    setExpertMode(savedMode);
}

// Function to update chat session in storage
function updateChatSession() {
    if (!currentSessionId) return;
    
    const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex !== -1) {
        chatSessions[sessionIndex] = {
            id: currentSessionId,
            title: document.title.replace(' - PAKNING R1', ''),
            mode: currentMode,
            messages: [...messagesHistory],
            created: chatSessions[sessionIndex].created || new Date().toISOString()
        };
        saveChatsToLocalStorage();
    }
}

// Function to share the application
async function shareApplication() {
    const shareData = {
        title: 'PAKNING R1 - Advanced AI Assistant',
        text: 'Check out PAKNING R1, an advanced AI assistant with exceptional problem-solving capabilities!',
        url: window.location.href
    };

    try {
        // Check if the Web Share API is available
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback for browsers that don't support Web Share API
            const shareMenu = document.createElement('div');
            shareMenu.className = 'share-menu';
            shareMenu.innerHTML = `
                <div class="share-options">
                    <a href="https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}" target="_blank" class="share-option whatsapp">
                        <i class="fab fa-whatsapp"></i>
                        <span>WhatsApp</span>
                    </a>
                    <a href="https://www.instagram.com/share?url=${encodeURIComponent(shareData.url)}" target="_blank" class="share-option instagram">
                        <i class="fab fa-instagram"></i>
                        <span>Instagram</span>
                    </a>
                    <button class="share-option copy-link">
                        <i class="fas fa-link"></i>
                        <span>Copy Link</span>
                    </button>
                </div>
            `;

            // Add click event for copy link
            const copyLinkBtn = shareMenu.querySelector('.copy-link');
            copyLinkBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(shareData.url);
                showMessage('Link copied to clipboard!', 'success');
            });

            // Position the share menu
            const shareBtn = document.getElementById('share-btn');
            const rect = shareBtn.getBoundingClientRect();
            shareMenu.style.top = `${rect.bottom + 10}px`;
            shareMenu.style.right = `${window.innerWidth - rect.right}px`;

            // Add to document
            document.body.appendChild(shareMenu);

            // Remove menu when clicking outside
            const closeMenu = (e) => {
                if (!shareMenu.contains(e.target) && e.target !== shareBtn) {
                    shareMenu.remove();
                }
            };
            document.addEventListener('click', closeMenu);
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
}

// Add share button event listener
document.getElementById('share-btn').addEventListener('click', shareApplication);

// Add back to chat button event listener
if (backToChatBtn) {
    backToChatBtn.addEventListener('click', () => {
        showWelcomeScreen();
    });
}

// Help modal functionality
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpModal = document.getElementById('close-help-modal');

if (helpBtn && helpModal && closeHelpModal) {
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('open');
    });
    
    closeHelpModal.addEventListener('click', () => {
        helpModal.classList.remove('open');
    });
    
    // Close modal when clicking outside
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('open');
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.classList.contains('open')) {
            helpModal.classList.remove('open');
        }
    });
}


