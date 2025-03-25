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

// Image module for handling image uploads and analysis
window.imageModule = {
    currentImageFile: null,
    currentImageUrl: null,
    
    // Initialize image handling
    init() {
        const imageBtn = document.getElementById('image-btn');
        const imageUpload = document.getElementById('image-upload');
        const removeImageBtn = document.getElementById('remove-image');
        
        if (imageBtn) {
            imageBtn.addEventListener('click', () => {
                if (imageUpload) imageUpload.click();
            });
        }
        
        if (imageUpload) {
            imageUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        this.currentImageFile = file;
                        const imageUrl = URL.createObjectURL(file);
                        this.currentImageUrl = imageUrl;
                        
                        // Show preview
                        const previewImg = document.getElementById('preview-img');
                        const imagePreview = document.getElementById('image-preview');
                        if (previewImg && imagePreview) {
                            previewImg.src = imageUrl;
                            imagePreview.style.display = 'block';
                        }
                        
                        // Enable send button
                        const sendButton = document.getElementById('send-button');
                        if (sendButton) sendButton.disabled = false;
                    } catch (error) {
                        console.error('Error handling image upload:', error);
                        this.showError('Error uploading image');
                    }
                }
            });
        }
        
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => this.clearImagePreview());
        }
    },
    
    // Clear image preview
    clearImagePreview() {
        this.currentImageFile = null;
        this.currentImageUrl = null;
        
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const imageUpload = document.getElementById('image-upload');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        
        if (imagePreview) imagePreview.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (imageUpload) imageUpload.value = '';
        
        // Update send button state
        if (sendButton && userInput) {
            sendButton.disabled = !userInput.value.trim();
        }
    },
    
    // Show error message
    showError(message) {
        const event = new CustomEvent('showMessage', {
            detail: { message, type: 'error' }
        });
        window.dispatchEvent(event);
    },
    
    // Analyze image (placeholder for actual implementation)
    async analyzeImage(imageUrl) {
        // This is a placeholder. Implement actual image analysis here.
        return "This is an image.";
    },
    
    // Check if there's a current image
    hasImage() {
        return this.currentImageFile !== null;
    },
    
    // Get current image data
    getCurrentImageData() {
        return {
            file: this.currentImageFile,
            url: this.currentImageUrl
        };
    }
}; 