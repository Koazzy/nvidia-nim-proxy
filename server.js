import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'NVIDIA NIM Proxy is running',
    endpoint: '/v1/chat/completions'
  });
});

// Main proxy endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    // Check if API key exists
    if (!process.env.NIM_API_KEY) {
      return res.status(500).json({ 
        error: 'NIM_API_KEY environment variable is not set' 
      });
    }

    // Get request body and set default model if missing
    const requestBody = {
      ...req.body,
      model: req.body.model || 'deepseek-ai/deepseek-r1-distill-qwen-14b'
    };

    // Forward request to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NIM_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // Get response data
    const data = await response.json();

    // Strip <thinking> tags from response content
    if (data.choices && Array.isArray(data.choices)) {
      data.choices = data.choices.map(choice => {
        if (choice.message && choice.message.content) {
          choice.message.content = choice.message.content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        }
        return choice;
      });
    }

    // Return the modified response
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`NVIDIA NIM Proxy running on port ${PORT}`);
});
