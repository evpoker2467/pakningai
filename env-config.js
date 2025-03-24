// Function to get environment variables from Netlify
async function getEnvVar(key, defaultValue = '') {
    if (window.envVars === undefined) {
        console.log('Initializing environment variables from Netlify');
        
        // This is where we'll store environment variables
        window.envVars = {};
        
        try {
            // First try to get from Netlify injected env
            if (window.ENV && window.ENV.API_KEY) {
                console.log('Found API key in Netlify ENV');
                window.envVars.API_KEY = window.ENV.API_KEY;
            } 
            // Then try from process.env (for local development)
            else if (process.env && process.env.API_KEY) {
                console.log('Found API key in process.env');
                window.envVars.API_KEY = process.env.API_KEY;
            }
            // Finally check for REACT_APP prefix (create-react-app style)
            else if (process.env && process.env.REACT_APP_API_KEY) {
                console.log('Found API key in REACT_APP env');
                window.envVars.API_KEY = process.env.REACT_APP_API_KEY;
            }
            else {
                console.warn('No API key found in environment variables');
                window.envVars.API_KEY = '';
            }
        } catch (error) {
            console.error('Error accessing environment variables:', error);
            window.envVars.API_KEY = '';
        }
    }
    
    return window.envVars[key] || defaultValue;
} 