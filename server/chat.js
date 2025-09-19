import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { DatabaseService } from './databaseService.js';

// Initialize database service instance
const dbService = new DatabaseService();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database API endpoints

// Get insurance products
app.post('/api/database/products', async (req, res) => {
  try {
    const { productType, age, gender } = req.body;
    const products = await dbService.getInsuranceProducts(productType, age, gender);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Store customer data
app.post('/api/database/customer', async (req, res) => {
  try {
    console.log('Received customer data request:', req.body);
    const { customerData } = req.body;
    
    if (!customerData) {
      return res.status(400).json({ success: false, error: 'Customer data is required' });
    }
    
    const customerId = await dbService.storeCustomer(customerData);
    console.log('Customer stored with ID:', customerId);
    res.json({ success: true, data: { customerId } });
  } catch (error) {
    console.error('Customer API error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to store customer data' });
  }
});

// Get customer data
app.get('/api/database/customer/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const customer = await dbService.getCustomer(customerId);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
});

// Create conversation history
app.post('/api/database/conversation', async (req, res) => {
  try {
    const { customerId, sessionId } = req.body;
    const conversationId = await dbService.createConversationHistory(customerId, sessionId);
    res.json({ success: true, data: { conversationId } });
  } catch (error) {
    console.error('Conversation API error:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// Update conversation history
app.put('/api/database/conversation/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { messages } = req.body;
    const success = await dbService.updateConversationHistory(conversationId, messages);
    res.json({ success });
  } catch (error) {
    console.error('Update conversation API error:', error);
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

// End conversation
app.put('/api/database/conversation/:id/end', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const success = await dbService.endConversation(conversationId);
    res.json({ success });
  } catch (error) {
    console.error('End conversation API error:', error);
    res.status(500).json({ success: false, error: 'Failed to end conversation' });
  }
});


// Initialize chat session
app.post('/api/chat/initialize', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'This endpoint requires LLM configuration. Please use the Node.js backend with proper LLM setup.'
  });
});

// Handle chat messages
app.post('/api/chat/message', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'This endpoint requires LLM configuration. Please use the Node.js backend with proper LLM setup.'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'PolicyPal Chat Server is running!', 
    status: 'active',
    endpoints: ['/api/chat/initialize', '/api/chat/message', '/api/health']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 PolicyPal Chat Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend proxy: /api -> http://localhost:${PORT}`);
});