// Image Module for OpenRouter API Integration
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Function to analyze an image
async function analyzeImage(imageUrl) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${window.OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "PAKNING R1",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "qwen/qwen2.5-vl-32b-instruct:free",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "What is in this image? Please provide a detailed description."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": imageUrl
                                }
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error analyzing image:', error);
        throw error;
    }
}

// Function to generate an image (placeholder for future implementation)
async function generateImage(prompt) {
    // This will be implemented when the image generation endpoint is available
    throw new Error('Image generation is not yet implemented');
}

// Function to handle file upload and convert to base64
function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Export the functions
window.imageModule = {
    analyzeImage,
    generateImage,
    handleImageUpload
}; 