// Gmail Widget Update - Add this to your dashboard's script section

function initGmailWidget() {
    // Check if Gmail is authenticated
    checkGmailAuth();
    
    // Fetch emails every 5 minutes
    fetchEmails();
    setInterval(fetchEmails, 5 * 60 * 1000);
}

async function checkGmailAuth() {
    try {
        const response = await fetch('https://calendar-backend-xwk6.onrender.com/api/emails');
        const data = await response.json();
        
        if (response.status === 401) {
            // Show auth prompt
            const emailWidget = document.querySelector('.email-widget .widget-content');
            emailWidget.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 15px;">Gmail not connected</p>
                    <a href="https://calendar-backend-xwk6.onrender.com/auth/google" 
                       style="display: inline-block; padding: 10px 20px; background: #004080; color: white; 
                              text-decoration: none; border-radius: 20px;">
                        Connect Gmail
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Gmail auth check failed:', error);
    }
}

async function fetchEmails() {
    try {
        const response = await fetch('https://calendar-backend-xwk6.onrender.com/api/emails');
        
        if (!response.ok) {
            throw new Error('Failed to fetch emails');
        }
        
        const data = await response.json();
        displayEmails(data.emails);
    } catch (error) {
        console.error('Error fetching emails:', error);
        // Keep showing placeholder emails if fetch fails
    }
}

function displayEmails(emails) {
    const emailContainer = document.querySelector('.email-widget .widget-content');
    
    if (!emails || emails.length === 0) {
        emailContainer.innerHTML = '<div style="padding: 20px; text-align: center;">No recent emails</div>';
        return;
    }
    
    emailContainer.innerHTML = emails.map(email => `
        <div class="email-item" onclick="openEmail('${email.id}')">
            <div class="email-from">${escapeHtml(email.from)}</div>
            <div class="email-subject">${escapeHtml(email.subject)}</div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openEmail(emailId) {
    // Open Gmail in new tab with specific email
    window.open(`https://mail.google.com/mail/u/0/#inbox/${emailId}`, '_blank');
}

// Add to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...
    
    // Initialize Gmail widget
    initGmailWidget();
});