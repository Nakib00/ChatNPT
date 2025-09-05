import express from 'express';
import { generate } from './chatbot.js';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello!!!');
});

app.post('/chat', async (req, res) => {
    const { message, threadId } = req.body;

    // Validate
    if (!message || !threadId) {
        res.status(400).json({ message: 'All fields are required!' });
        return;
    }

    console.log('Message', message);

    try {
        const result = await generate(message, threadId);
        res.json({ message: result });
    } catch (error) {
        // console.error('Error in chat route:', error);
        res.status(500).json({ message: 'Sorry, there was an error processing your request.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running: ${port}`);
});