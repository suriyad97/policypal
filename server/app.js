import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { DatabaseService } from './databaseService.js';
import { ChatService } from './chatService.js';

const app = express();
const PORT = process.env.NODE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const dbService = new DatabaseService();
const chatService = new ChatService();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await dbService.testConnection();
    res.json({ 
      status: 'healthy', 
      database: dbStatus ? 'connected' : 'disconnected',
      server: 'Node.js',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'PolicyPal Node.js Backend Server is running!', 
    status: 'active',
    server: 'Node.js',
    endpoints: [
      '/api/health',
      '/api/database/products',
      '/api/database/customer',
      '/api/chat/initialize',
      '/api/chat/message'
    ]
  });
});

// Database API endpoints

// Get insurance products
app.post('/api/database/products', async (req, res) => {
  try {
    const { productType, age, gender } = req.body;
    console.log('Products request:', { productType, age, gender });
    
    const products = await dbService.getInsuranceProducts(productType, age, gender);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products', details: error.message });
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
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
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

// Chat API endpoints

// Initialize chat session
app.post('/api/chat/initialize', async (req, res) => {
  try {
    const { sessionId, formData } = req.body;
    console.log('Initialize chat request:', { sessionId, formData });
    
    // Store customer data first
    let customerId = null;
    if (formData) {
      try {
        customerId = await dbService.storeCustomer(formData);
        console.log('Customer stored during chat init:', customerId);
      } catch (error) {
        console.warn('Could not store customer data during chat init:', error.message);
      }
    }
    
    // Get initial chat response
    const response = await chatService.initializeChat(sessionId, formData, customerId);
    
    res.json({
      success: true,
      message: response,
      sessionId,
      customerId
    });
  } catch (error) {
    console.error('Initialize chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize chat session',
      details: error.message
    });
  }
});

// Handle chat messages
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sessionId, message, formData } = req.body;
    console.log('Chat message request:', { sessionId, message });
    
    const response = await chatService.handleMessage(sessionId, message, formData);
    
    res.json({
      success: true,
      message: response,
      sessionId
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PolicyPal Node.js Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📖 Server Info: http://localhost:${PORT}/`);
});

export default app;