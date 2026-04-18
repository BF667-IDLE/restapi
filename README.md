## BFX API

A lightweight, auto-loading REST API built with Express.js that automatically registers endpoints from the file system. Features elegant documentation and error pages with consistent styling.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/synshin9/Restfull-Api)

## Overview

InuSoft API is a modern REST API implementation that automatically loads endpoints from the api/ directory. It features a clean documentation interface, automatic endpoint registration, and a service-layer architecture for better code organization.

## Features

- 🔄 Auto-Loading Endpoints: Automatically registers API endpoints from file structure
- 📚 Beautiful Documentation: Interactive API documentation with search functionality
- 🎨 Consistent Styling: Elegant UI with gradient themes and responsive design
- 🔧 Service Layer Architecture: Separated business logic for maintainability
- 📊 Request Logging: Automatic API request logging with response times
- 🚀 Error Handling: Custom 404 and 500 error pages with helpful UX
- ⚡ Lightweight: Minimal dependencies and fast performance

## Project Structure

```
restapi/
├── api/                           # API endpoints (auto-loaded)
│   ├── ai/                       # AI-related endpoints
│   │   ├── gpt.js               # GPT chat endpoint
│   │   └── write-cream.js       # Content writing endpoint
│   └── random/                   # Random data endpoints
│       └── bluearchive.js       # Blue Archive related data
├── public/                       # Static files
│   ├── index.html               # API documentation
│   ├── 404.html                 # Custom 404 error page
│   └── 500.html                 # Custom 500 error page
├── src/
│   ├── app/                     # Application configuration
│   │   ├── index.js            # Main app setup
│   │   ├── middleware.js       # Middleware configuration
│   │   └── responseFormatter.js # Response formatting
│   ├── services/                # Business logic layer
│   │   └── ai/
│   │       └── gptService.js   # GPT service logic
│   └── utils/                   # Utility functions
│       ├── loader.js           # Auto-loading utility
│       ├── logger.js           # Logging utility
│       ├── color.js            # Console colors
│       └── logApiRequest.js    # Request logging
├── server.js                    # Application entry point
├── package.json
└── vercel.json                  # Vercel deployment config
```


## API Endpoints

### Available Endpoints

| Endpoint | Methods | Category | Description |
|----------|---------|----------|-------------|
| `GET /api/ai/gpt` | GET, POST | AI | GPT chat completion endpoint |
| `GET /api/ai/write-cream` | GET, POST | AI | Content writing assistance |
| `GET /api/random/bluearchive` | GET | Random | Blue Archive related data |
| `GET /api/openapi.json` | GET | Documentation | API specification |
| `GET /` | GET | Documentation | Web interface |

## Endpoint Structure

Each endpoint file follows this structure:

```javascript
export default {
    name: "Endpoint Name",
    description: "Endpoint description",
    category: "Category",
    methods: ["GET", "POST"], // Supported HTTP methods
    params: ["param1", "param2"], // Expected parameters
    paramsSchema: { // Optional parameter validation
        param1: { type: "string", required: true }
    },
    
    async run(req, res) {
        try {
            // Your endpoint logic here
            const result = await someService.process(req.query);
            
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
                attribution: "@synshin9"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
```

## Example: GPT Endpoint

File: api/ai/gpt.js

```javascript
import GptService from '../../src/services/ai/gptService.js';

export default {
    name: "GPT Chat",
    description: "Chat completion using GPT models",
    category: "AI",
    methods: ["GET", "POST"],
    params: ["message", "model"],
    
    async run(req, res) {
        try {
            const { message, model = "gpt-3.5-turbo" } = req.method === 'GET' ? req.query : req.body;
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: "Message parameter is required"
                });
            }
            
            const result = await GptService.process(message, { model });
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
```

## Service Layer Example

File: src/services/ai/gptService.js

```javascript
export class GptService {
    static async process(message, options = {}) {
        // Business logic implementation
        return {
            response: `Processed: ${message}`,
            model: options.model || 'default',
            timestamp: new Date().toISOString()
        };
    }
}

export default GptService;
```

Setup and Installation

1. Clone the repository
   ```bash
   git clone https://github.com/synshin9/Restfull-Api.git
   cd Restfull-Api
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Start the development server
   ```bash
   npm run dev
   ```
4. Access the API
- API Documentation: http://localhost:3000
- API Endpoints: http://localhost:3000/api/ai/gpt
- OpenAPI Spec: http://localhost:3000/api/openapi.json

## Vercel Deployment

The project includes vercel.json for zero-config deployment:

```bash
npm i -g vercel
vercel
```

Environment Variables

Create a .env file for environment-specific configurations:

```env
PORT=3000
NODE_ENV=production
```

Adding New Endpoints

1. Create Endpoint File

Create a new JavaScript file in the api/ directory:

```javascript
// api/weather/forecast.js
export default {
    name: "Weather Forecast",
    description: "Get weather forecast for a location",
    category: "Weather",
    methods: ["GET"],
    params: ["city", "days"],
    
    async run(req, res) {
        try {
            const { city, days = 7 } = req.query;
            
            // Your implementation here
            const forecast = await WeatherService.getForecast(city, days);
            
            res.json({
                success: true,
                data: forecast
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
```

2. The endpoint will be automatically available at:

- GET /api/weather/forecast?city=London&days=5

## API Response Format
All successful responses follow this format:

```json
{
    "statusCode": 200,
    "success": true,
    "data": {
        "response": "Your data here"
    },
    "timestamp": "2023-01-01T00:00:00.000Z",
    "attribution": "@synshin9"
}
```

Error responses:

```json
{
    "statusCode": 400,
    "success": false,
    "error": "Error message description"
}
```

## Error Handling
The API includes comprehensive error handling:

- 400 Bad Request: Invalid parameters
- 404 Not Found: Endpoint not found
- 500 Internal Server Error: Server-side errors

Custom error pages are served for web requests.

## Contributing

1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add some amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📧 Email: admin@inusoft.xyz
- 💬 Telegram: t.me/synshin9

## Acknowledgments

- Built with Express.js
- Styled with Tailwind CSS
- Icons from Material Icons
- Fonts from Google Fonts

---

InuSoft API • Modern REST API with Auto-Loading Endpoints
