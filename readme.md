# PAKNING R1 - Advanced AI Assistant

## Setup

### API Key Configuration

There are two ways to set up your API key:

#### Local Development
1. Create a `.env` file in the root directory
2. Add your OpenRouter API key in the following format:
   ```
   API_KEY=your-api-key-here
   ```

#### Using Netlify (Recommended)
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Initialize Netlify in your project: `netlify init`
3. Set your API key as an environment variable: 
   ```
   netlify env:set API_KEY your-api-key-here
   ```
4. Deploy your site: `netlify deploy --prod`

This method keeps your API key secure by storing it as an environment variable in Netlify rather than in your code.

## Running the Application

### Locally
1. Open `index.html` in a web browser
2. If no API key is found, you will be prompted to enter one
3. Start chatting with PAKNING R1

### Using Netlify
1. Run `netlify dev` to test locally with your Netlify environment variables
2. Visit the URL provided by Netlify

## Features

- Advanced reasoning AI with two different thinking modes
- Chat history with saving/loading functionality 
- Responsive design for desktop and mobile use
- Light/dark theme support
- Secure API key handling with Netlify

## Deployment

### Quick Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=YOUR_REPOSITORY_URL)

After deploying, set up your API key as an environment variable in the Netlify dashboard:
1. Go to Site settings > Build & deploy > Environment
2. Add a variable with key `API_KEY` and your OpenRouter API key as the value

## Development

### How to Run Locally

1. Clone the repository:
   ```bash
   git clone YOUR_REPOSITORY_URL
   cd pakning-r1
   ```

2. Open `index.html` in a browser or use a local server:
   ```bash
   # Using Python's built-in server
   python -m http.server
   
   # Or using Node.js http-server
   npx http-server
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 