// Function to show messages with mobile-friendly timing
function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `message-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Use shorter duration on mobile
    const duration = window.innerWidth <= 768 ? 2000 : 3000;

    // Show the message
    setTimeout(() => toast.classList.add('visible'), 100);

    // Hide and remove the message
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Function to get environment variables from Netlify
async function getEnvVar(key, defaultValue = '') {
    if (window.envVars === undefined) {
        // This is where we'll store environment variables
        window.envVars = {};
        
        try {
            // Try to get from Netlify function
            const response = await fetch('/.netlify/functions/env');
            if (response.ok) {
                const data = await response.json();
                window.envVars = data;
                
                // Only show error if API key is missing
                if (!window.envVars.API_KEY) {
                    // Show error message only if not on mobile
                    if (window.innerWidth > 768) {
                        showMessage('API key not found. Please check your Netlify environment variables.', 'error');
                    }
                }
            } else {
                console.error('Failed to fetch environment variables:', response.status);
            }
        } catch (error) {
            console.error('Error accessing environment variables:', error);
            window.envVars.API_KEY = '';
        }
    }
    
    return window.envVars[key] || defaultValue;
} 