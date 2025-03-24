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
 
 // Initialize API key variable 
 let apiKey = '';
 
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
 
 // Current reasoning mode
 let currentMode = 'default';
 
 // Mode definitions
 const reasoningModes = {
     default: {
         title: 'Default',
         icon: 'balance-scale',
         description: 'Medium Reasoning Effort: Balanced depth and efficiency for well-thought-out responses.',
         systemPrompt: 'You are PAKNING R1, an AI assistant focused on providing helpful, accurate, and thoughtful responses. Balance depth with efficiency, taking time to reason through complex problems but staying concise. Structure your responses with clear formatting when appropriate, using markdown for headers, lists, and code blocks. For complex or technical topics, show your reasoning process.',
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
     deepthink: {
         title: 'DeepThink',
         icon: 'brain',
         description: 'Maximum Reasoning Depth: Comprehensive analysis with detailed step-by-step reasoning.',
         systemPrompt: 'You are PAKNING R1 in DeepThink mode, an AI assistant that thoroughly analyzes problems before answering. Take your time to think through all aspects of the question, exploring multiple perspectives and approaches. Break down complex problems into parts and reason step by step. Include your thought process in the response, organizing with clear headings and structure. For technical or specialized topics, demonstrate expertise with precise terminology and in-depth analysis.',
         thinkingSteps: [
             'Analyzing request in depth',
             'Gathering comprehensive information',
             'Exploring multiple perspectives',
             'Identifying key concepts and relationships',
             'Structuring detailed analysis',
             'Checking for logical consistency',
             'Formulating comprehensive response'
         ],
         stepDelay: 800,
         totalDelay: 5000,
         temperature: 0.8,
         maxTokens: 4000
     }
 };
 
 // Chat history for context
 let messagesHistory = [
     {
         role: "system",
         content: reasoningModes.default.systemPrompt
     }
 ];
 
 // Chat sessions
 let chatSessions = [];
 let currentSessionId = null;
 let isWaitingForResponse = false;
 
 // Function to set reasoning mode
 function setReasoningMode(mode) {
     // Check if the mode exists
     if (!reasoningModes[mode]) {
         console.error(`Mode ${mode} not found`);
         return;
     }
     
     // Update current mode
     currentMode = mode;
     
     // Update mode indicator
     const modeConfig = reasoningModes[mode];
     currentModeIcon.innerHTML = `<i class="fas fa-${modeConfig.icon}"></i>`;
     currentModeText.textContent = `${modeConfig.title} Mode`;
     
     // Update mini mode indicator in the input area
     miniModeIndicator.textContent = modeConfig.title;
     
     // Add class to body to apply mode-specific styles
     document.body.classList.remove('default-mode', 'deepthink-mode');
     document.body.classList.add(`${mode}-mode`);
     
     // Update current session with new mode
     if (currentSessionId) {
         const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
         if (sessionIndex !== -1) {
             chatSessions[sessionIndex].mode = mode;
             saveChatsToLocalStorage();
         }
     }
     
     // Log mode change
     console.log(`Mode set to ${mode}`);
 }
 
 // Function to create a new chat session
 function createNewChat() {
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
     chatMessages.innerHTML = `
         <div class="welcome-screen">
             <div class="welcome-content">
                 <div class="welcome-logo">
                     <div class="ning-logo large">P</div>
                 </div>
                 <h1>PAKNING R1</h1>
                 <p>Advanced reasoning AI with exceptional problem-solving capabilities</p>
                 
                 <div class="select-mode-container">
                     <div class="mode-selection">
                         <p class="mode-title">Select Reasoning Mode:</p>
                         <div class="mode-buttons">
                             <button class="mode-btn ${currentMode === 'default' ? 'active' : ''}" data-mode="default">
                                 <i class="fas fa-balance-scale"></i>
                                 <span>Default</span>
                             </button>
                             <button class="mode-btn ${currentMode === 'deepthink' ? 'active' : ''}" data-mode="deepthink">
                                 <i class="fas fa-brain"></i>
                                 <span>DeepThink</span>
                             </button>
                         </div>
                         <div class="mode-description">
                             <p id="mode-description-text">${reasoningModes[currentMode].description}</p>
                         </div>
                     </div>
                 </div>
                 
                 <div class="feature-points">
                     <div class="feature-point">
                         <i class="fas fa-brain"></i>
                         <span>Deep analytical thinking for complex problem-solving</span>
                     </div>
                     <div class="feature-point">
                         <i class="fas fa-code"></i>
                         <span>Superior performance in mathematics and coding tasks</span>
                     </div>
                     <div class="feature-point">
                         <i class="fas fa-tools"></i>
                         <span>Adapts reasoning based on environmental feedback</span>
                     </div>
                 </div>
             </div>
         </div>
     `;
     
     // Update chat title
     document.title = 'New Conversation - PAKNING R1';
     
     // Hide mode indicator
     currentModeIndicator.classList.remove('visible');
     
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
     
     const span = document.createElement('span');
     span.textContent = title;
     
     historyItem.appendChild(icon);
     historyItem.appendChild(span);
     
     // Add to sidebar
     const chatHistory = document.querySelector('.chat-history');
     
     // Remove 'active' class from all history items
     document.querySelectorAll('.history-item').forEach(item => {
         item.classList.remove('active');
     });
     
     // Add 'active' class to this new item
     historyItem.classList.add('active');
     
     // Add to DOM - insert at the top for newest chats
     chatHistory.insertBefore(historyItem, chatHistory.firstChild);
     
     // Store in chat sessions array
     chatSessions.push({
         id: currentSessionId,
         title: title,
         mode: currentMode,
         messages: [...messagesHistory],
         created: new Date().toISOString()
     });
     
     // Save to localStorage (optional)
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
             const chatHistory = document.querySelector('.chat-history');
             chatHistory.innerHTML = ''; // Clear existing
             
             // Sort chats by creation date (newest first)
             chatSessions.sort((a, b) => new Date(b.created) - new Date(a.created));
             
             chatSessions.forEach(session => {
                 const historyItem = document.createElement('div');
                 historyItem.classList.add('history-item');
                 historyItem.dataset.id = session.id;
                 
                 const icon = document.createElement('i');
                 icon.classList.add('fas', 'fa-comment');
                 
                 const span = document.createElement('span');
                 span.textContent = session.title;
                 
                 historyItem.appendChild(icon);
                 historyItem.appendChild(span);
                 
                 chatHistory.appendChild(historyItem);
             });
         }
     } catch (error) {
         console.error('Error loading chats from localStorage:', error);
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
             const span = historyItem.querySelector('span');
             if (span) {
                 span.textContent = newTitle;
             }
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
         return `<pre><code class="language-${language}">${code}</code></pre>`;
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
         
         // Show current mode indicator
         currentModeIndicator.classList.add('visible');
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
     // Note: Thinking message is already created by showThinkingIndicator()
     // and user message is already added to history in handleSendMessage()
     
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
                 'model': 'qwen/qwq-32b:free',
                 'messages': messagesHistory,
                 'temperature': reasoningModes[currentMode].temperature,
                 'max_tokens': reasoningModes[currentMode].maxTokens
             })
         };
         
         try {
             console.log(`Sending request to ${API_URL}...`);
             const response = await fetch(API_URL, requestOptions);
             
             const responseText = await response.text();
             console.log(`API response status: ${response.status}, response:`, responseText);
             
             if (!response.ok) {
                 console.error(`API Error, retry ${retryCount}:`, responseText);
                 
                 // If we still have retries left, try again after a delay
                 if (retryCount < maxRetries) {
                     const delayMs = 1000 * (retryCount + 1); // Exponential backoff
                     console.log(`Waiting ${delayMs}ms before retry...`);
                     await new Promise(resolve => setTimeout(resolve, delayMs));
                     continue; // Try again
                 }
                 
                 // If all retries failed, show error and return null
                 removeTypingIndicator();
                 handleAPIConnectionError(`API returned error: ${response.status}`);
                 return null;
             }
             
             // Try to parse the response JSON
             let data;
             try {
                 data = JSON.parse(responseText);
             } catch (e) {
                 console.error("Error parsing JSON response:", e);
                 if (retryCount < maxRetries) {
                     const delayMs = 1000 * (retryCount + 1);
                     await new Promise(resolve => setTimeout(resolve, delayMs));
                     continue; // Try again
                 }
                 removeTypingIndicator();
                 handleAPIConnectionError("Invalid response format from API");
                 return null;
             }
             
             if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                 console.error("Unexpected API response format:", data);
                 if (retryCount < maxRetries) {
                     const delayMs = 1000 * (retryCount + 1);
                     await new Promise(resolve => setTimeout(resolve, delayMs));
                     continue; // Try again
                 }
                 removeTypingIndicator();
                 handleAPIConnectionError("Unexpected response format from API");
                 return null;
             }
             
             const assistantResponse = data.choices[0].message.content;
             
             // Add response to history
             messagesHistory.push({
                 role: 'assistant',
                 content: assistantResponse
             });
             
             // Display response
             addMessageToChat(assistantResponse, 'bot');
             
             // Update chat session in storage
             updateChatSession();
             
             console.log(`Successfully received response from API`);
             return assistantResponse;
         } catch (error) {
             console.error(`API Error, retry ${retryCount}:`, error);
             
             // If we still have retries left, try again after a delay
             if (retryCount < maxRetries) {
                 const delayMs = 1000 * (retryCount + 1); // Exponential backoff
                 console.log(`Waiting ${delayMs}ms before retry...`);
                 await new Promise(resolve => setTimeout(resolve, delayMs));
                 continue; // Try again
             }
             
             // If all retries failed, show error and return null
             removeTypingIndicator();
             handleAPIConnectionError(error.message || "Network error connecting to API");
             return null;
         }
     }
     
     // This point should never be reached as the function should return from within the loop
     return null;
 }
 
 // Function to handle sending a message
 async function handleSendMessage() {
     const message = userInput.value.trim();
     if (!message || isWaitingForResponse) return;
     
     // Clear input
     userInput.value = '';
     userInput.style.height = 'auto';
     
     // Add user message to chat (this will update the title if it's the first message)
     addMessageToChat(message, 'user');
     
     // Add to history
     messagesHistory.push({
         role: 'user',
         content: message
     });
     
     // Check if we have a valid API key
     if (!hasValidApiKey()) {
         console.error('No valid API key available');
         
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
     
     // Set waiting state
     isWaitingForResponse = true;
     sendButton.disabled = true;
     userInput.disabled = true;
     
     // Show thinking indicator based on current mode
     showThinkingIndicator();
     
     // Send to API
     try {
         await sendMessageToAPI(message);
         
         // Reset waiting state
         isWaitingForResponse = false;
         sendButton.disabled = false;
         userInput.disabled = false;
         userInput.focus();
         
         // Update chat session in storage
         updateChatSession();
     } catch (error) {
         console.error('Error sending message:', error);
         
         // Remove any thinking indicators
         const thinkingIndicators = document.querySelectorAll('.message.bot.thinking');
         thinkingIndicators.forEach(indicator => indicator.remove());
         
         // Add simple error message to history
         messagesHistory.push({
             role: 'assistant',
             content: 'Sorry, the AI service is currently unavailable. Please try again later.'
         });
         
         // Reset waiting state
         isWaitingForResponse = false;
         sendButton.disabled = false;
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
     // Reset message history with system prompt
     messagesHistory = [
         {
             role: "system",
             content: reasoningModes[currentMode].systemPrompt
         }
     ];
     
     // Clear messages on screen
     chatMessages.innerHTML = '';
     
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
         
         // Show welcome screen
         showWelcomeScreen();
         
         // Create a new chat session
         createNewChat();
     }
 }
 
 // Function to show the welcome screen
 function showWelcomeScreen() {
     // Keep the current session ID instead of replacing it
     // This ensures we don't lose the reference to the current chat
     
     // Clear messages and show welcome screen
     chatMessages.innerHTML = `
         <div class="welcome-screen">
             <div class="welcome-content">
                 <div class="welcome-logo">
                     <div class="ning-logo large">P</div>
                 </div>
                 <h1>PAKNING R1</h1>
                 <p>Advanced reasoning AI with exceptional problem-solving capabilities</p>
                 
                 <div class="select-mode-container">
                     <div class="mode-selection">
                         <p class="mode-title">Select Reasoning Mode:</p>
                         <div class="mode-buttons">
                             <button class="mode-btn ${currentMode === 'default' ? 'active' : ''}" data-mode="default">
                                 <i class="fas fa-balance-scale"></i>
                                 <span>Default</span>
                             </button>
                             <button class="mode-btn ${currentMode === 'deepthink' ? 'active' : ''}" data-mode="deepthink">
                                 <i class="fas fa-brain"></i>
                                 <span>DeepThink</span>
                             </button>
                         </div>
                         <div class="mode-description">
                             <p id="mode-description-text">${reasoningModes[currentMode].description}</p>
                         </div>
                     </div>
                 </div>
                 
                 <div class="feature-points">
                     <div class="feature-point">
                         <i class="fas fa-brain"></i>
                         <span>Deep analytical thinking for complex problem-solving</span>
                     </div>
                     <div class="feature-point">
                         <i class="fas fa-code"></i>
                         <span>Superior performance in mathematics and coding tasks</span>
                     </div>
                     <div class="feature-point">
                         <i class="fas fa-tools"></i>
                         <span>Adapts reasoning based on environmental feedback</span>
                     </div>
                 </div>
             </div>
         </div>
     `;
     
     // Update chat title without changing the session ID
     document.title = 'PAKNING R1';
     
     // Hide mode indicator
     currentModeIndicator.classList.remove('visible');
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
         
         const themeIcon = themeToggle.querySelector('i');
         const themeText = themeToggle.querySelector('span');
         
         themeIcon.classList.remove('fa-moon');
         themeIcon.classList.add('fa-sun');
         themeText.textContent = 'Light Mode';
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
 
 // Auto-resize as user types
 userInput.addEventListener('input', autoResizeTextarea);
 
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
             
             // Show mode indicator
             currentModeIndicator.classList.add('visible');
             
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
 function showMessage(message, type = 'info') {
     // Don't show messages in mobile mode
     if (document.body.classList.contains('mobile-mode')) {
         console.log('Message suppressed in mobile mode:', message);
         return;
     }

     const messageDiv = document.createElement('div');
     messageDiv.className = `message-toast ${type}`;
     messageDiv.textContent = message;
     document.body.appendChild(messageDiv);

     // Remove the message after 5 seconds
     setTimeout(() => {
         messageDiv.remove();
     }, 5000);
 }
 
 // Mobile mode handling
 function setInterfaceMode(mode) {
     // Remove existing mode classes
     document.body.classList.remove('web-mode', 'mobile-mode');
     
     // Add new mode class
     document.body.classList.add(mode);
     
     // Save preference
     localStorage.setItem('preferredMode', mode);
     
     // Update UI elements for mobile mode
     if (mode === 'mobile-mode') {
         // Hide sidebar by default on mobile
         if (sidebar) {
             sidebar.classList.add('collapsed');
         }
         
         // Adjust chat container padding
         const chatContainer = document.querySelector('.chat-messages');
         if (chatContainer) {
             chatContainer.style.paddingBottom = '120px';
         }
         
         // Move input container to bottom
         const inputContainer = document.querySelector('.chat-input-container');
         if (inputContainer) {
             inputContainer.classList.add('mobile-fixed');
         }
         
         // Hide desktop-only elements
         document.querySelectorAll('.desktop-only').forEach(el => {
             el.style.display = 'none';
         });
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
     
     // Update mode toggle button
     const modeToggle = document.getElementById('modeToggle');
     if (modeToggle) {
         const icon = modeToggle.querySelector('i');
         if (icon) {
             icon.className = mode === 'web-mode' ? 'fas fa-mobile-alt' : 'fas fa-desktop';
         }
     }
 }

// Function to initialize mobile detection
function initializeMobileMode() {
    // Check for saved preference
    const savedMode = localStorage.getItem('preferredMode');
    
    if (savedMode) {
        setInterfaceMode(savedMode);
    } else {
        // Auto-detect based on screen size
        const shouldBeMobile = window.innerWidth <= 768;
        setInterfaceMode(shouldBeMobile ? 'mobile-mode' : 'web-mode');
    }
}

// Add mobile navigation handlers
function setupMobileNavigation() {
    // Toggle sidebar
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (sidebar.classList.contains('open')) {
            // Add overlay
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Close sidebar when overlay is clicked
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.remove();
            });
        } else {
            // Remove overlay
            document.querySelector('.sidebar-overlay')?.remove();
        }
    });
    
    // New chat button
    document.getElementById('newChatMobile')?.addEventListener('click', () => {
        createNewChat();
        // Close sidebar if open
        sidebar.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
    });
    
    // Mode toggle
    document.getElementById('modeToggleMobile')?.addEventListener('click', () => {
        const currentMode = document.body.classList.contains('web-mode') ? 'mobile-mode' : 'web-mode';
        setInterfaceMode(currentMode);
    });
    
    // Theme toggle
    document.getElementById('themeToggleMobile')?.addEventListener('click', toggleTheme);
    
    // Clear chat
    document.getElementById('clearChatMobile')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear this conversation?')) {
            clearChat();
        }
    });
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
    
    // Rest of your initialization code...
});

// Add mode switch button event listener
document.getElementById('mode-switch-btn').addEventListener('click', () => {
    const isDeepThink = document.body.classList.toggle('deepthink-mode');
    localStorage.setItem('mode', isDeepThink ? 'deepthink' : 'default');
    
    // Update button appearance
    const modeBtn = document.getElementById('mode-switch-btn');
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
    
    // Show mode change toast
    showMessage(`Switched to ${isDeepThink ? 'DeepThink' : 'Default'} mode`, 'info');
});

// Update the initializeMode function
function initializeMode() {
    const savedMode = localStorage.getItem('mode') || 'default';
    const isDeepThink = savedMode === 'deepthink';
    
    // Set initial mode
    if (isDeepThink) {
        document.body.classList.add('deepthink-mode');
    }
    
    // Update button appearance
    const modeBtn = document.getElementById('mode-switch-btn');
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


