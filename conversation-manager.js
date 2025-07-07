/**
 * Frontend Conversation Manager
 * Handles session management and conversation memory on the client side
 */

class SessionManager {
    constructor() {
        this.sessionId = this.getOrCreateSession();
        this.deviceInfo = this.getDeviceInfo();
    }

    getOrCreateSession() {
        let sessionId = localStorage.getItem('ai_session_id');
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem('ai_session_id', sessionId);
        }
        return sessionId;
    }

    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const fingerprint = this.getDeviceFingerprint();
        return `session_${timestamp}_${random}_${fingerprint}`;
    }

    getDeviceFingerprint() {
        const info = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < info.length; i++) {
            const char = info.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36).substr(0, 8);
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: this.getPlatform(),
            screenResolution: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad/i.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    async syncSession() {
        try {
            await fetch('https://calendar-backend-xwk6.onrender.com/api/sessions/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    deviceInfo: this.deviceInfo
                })
            });
        } catch (error) {
            console.error('Session sync failed:', error);
        }
    }
}

class ConversationMemoryManager {
    constructor() {
        this.sessionManager = new SessionManager();
        this.conversationId = localStorage.getItem('current_conversation_id');
        this.messageHistory = [];
        this.clarificationContext = null;
        
        // Sync session on initialization
        this.sessionManager.syncSession();
        
        // Set up periodic sync
        setInterval(() => {
            this.sessionManager.syncSession();
        }, 60000); // Sync every minute
    }

    async loadConversationHistory() {
        if (!this.conversationId) return;
        
        try {
            const response = await fetch(
                `https://calendar-backend-xwk6.onrender.com/api/conversations/${this.conversationId}/messages`
            );
            
            if (response.ok) {
                const data = await response.json();
                this.messageHistory = data.messages;
                this.renderConversationHistory();
            }
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    }

    renderConversationHistory() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.innerHTML = ''; // Clear existing messages
        
        this.messageHistory.forEach(message => {
            const messageDiv = document.createElement('div');
            
            if (message.role === 'user') {
                messageDiv.style.cssText = 'padding: 10px; background: #004080; color: white; border-radius: 10px; margin-bottom: 10px; margin-left: 40px;';
                messageDiv.innerHTML = `<strong>You:</strong> ${this.escapeHtml(message.content)}`;
            } else {
                messageDiv.style.cssText = 'padding: 10px; background: white; border-radius: 10px; margin-bottom: 10px;';
                messageDiv.innerHTML = `<strong>Assistant:</strong> ${this.escapeHtml(message.content)}`;
            }
            
            chatContainer.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async submitMessage(prompt) {
        const chatContainer = document.getElementById('chat-container');
        
        // Add user message to UI
        const userMessage = document.createElement('div');
        userMessage.style.cssText = 'padding: 10px; background: #004080; color: white; border-radius: 10px; margin-bottom: 10px; margin-left: 40px;';
        userMessage.innerHTML = `<strong>You:</strong> ${this.escapeHtml(prompt)}`;
        chatContainer.appendChild(userMessage);
        
        // Add loading response
        const loadingResponse = document.createElement('div');
        loadingResponse.style.cssText = 'padding: 10px; background: white; border-radius: 10px; margin-bottom: 10px;';
        loadingResponse.innerHTML = '<strong>Assistant:</strong> <span class="loading"></span>';
        chatContainer.appendChild(loadingResponse);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Update AI status
        document.getElementById('ai-status').className = 'status-offline';
        
        try {
            // Prepare request body
            const requestBody = {
                prompt,
                sessionId: this.sessionManager.sessionId,
                conversationId: this.conversationId
            };
            
            // Include clarification context if available
            if (this.clarificationContext) {
                requestBody.clarificationContext = this.clarificationContext;
            }
            
            const response = await fetch('https://calendar-backend-xwk6.onrender.com/ask-gpt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            // Update conversation ID if new conversation was created
            if (data.conversationId && data.conversationId !== this.conversationId) {
                this.conversationId = data.conversationId;
                localStorage.setItem('current_conversation_id', this.conversationId);
            }
            
            // Handle the response
            let responseHtml = `<strong>Assistant:</strong> ${this.escapeHtml(data.answer || 'No response received.')}`;
            
            // Handle clarification requests
            if (data.requiresClarification) {
                this.clarificationContext = data.clarificationContext;
                responseHtml += '<br><br><em style="color: #666;">Please type A, B, C, etc. to choose which task.</em>';
            } else {
                // Clear clarification context on successful completion
                this.clarificationContext = null;
                
                // If this was a task command, refresh the task lists
                if (data.taskCommand && data.executionResult && data.executionResult.success) {
                    setTimeout(() => {
                        if (typeof renderTasks === 'function') {
                            renderTasks();
                        }
                    }, 500);
                }
            }
            
            loadingResponse.innerHTML = responseHtml;
            document.getElementById('ai-status').className = 'status-online';
            
            // Add to message history
            this.messageHistory.push({
                role: 'user',
                content: prompt,
                timestamp: new Date().toISOString()
            });
            this.messageHistory.push({
                role: 'assistant',
                content: data.answer,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('AI Chat Error:', error);
            loadingResponse.innerHTML = '<strong>Assistant:</strong> I\'m having trouble connecting right now. Please try again in a moment.';
            document.getElementById('ai-status').className = 'status-offline';
            this.clarificationContext = null; // Clear context on error
        }
    }

    async loadConversations() {
        try {
            const response = await fetch(
                `https://calendar-backend-xwk6.onrender.com/api/conversations?sessionId=${this.sessionManager.sessionId}`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.conversations;
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
        return [];
    }

    async createNewConversation(title = 'New Conversation') {
        try {
            const response = await fetch('https://calendar-backend-xwk6.onrender.com/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionManager.sessionId,
                    title
                })
            });
            
            if (response.ok) {
                const conversation = await response.json();
                this.conversationId = conversation.conversationId;
                localStorage.setItem('current_conversation_id', this.conversationId);
                this.messageHistory = [];
                
                // Clear chat UI
                const chatContainer = document.getElementById('chat-container');
                chatContainer.innerHTML = '';
                
                return conversation;
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
        return null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in the dashboard
window.ConversationMemoryManager = ConversationMemoryManager;