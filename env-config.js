// Function to get environment variables from Netlify
async function getEnvVar(key, defaultValue = '') {
    if (window.envVars === undefined) {
        console.log('Initializing environment variables from Netlify');
        
        // This is where we'll store environment variables
        window.envVars = {};
        
        try {
            // Try to get from Netlify function
            const response = await fetch('/.netlify/functions/env');
            if (response.ok) {
                const data = await response.json();
                console.log('Received environment data:', { hasApiKey: !!data.API_KEY });
                window.envVars = data;
            } else {
                console.error('Failed to fetch environment variables:', response.status);
            }
            
            // Log environment status
            if (window.envVars.API_KEY) {
                console.log('API key is set and has length:', window.envVars.API_KEY.length);
                console.log('API key starts with:', window.envVars.API_KEY.substring(0, 8) + '...');
            } else {
                console.warn('No API key found in environment variables');
            }
        } catch (error) {
            console.error('Error accessing environment variables:', error);
            window.envVars.API_KEY = '';
        }
    }
    
    return window.envVars[key] || defaultValue;
} 