import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { DatabaseService } from './databaseService.js';

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
    const products = await DatabaseService.getInsuranceProducts(productType, age, gender);
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
    
    const customerId = await DatabaseService.storeCustomer(customerData);
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
    const customer = await DatabaseService.getCustomer(customerId);
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
    const conversationId = await DatabaseService.createConversationHistory(customerId, sessionId);
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
    const success = await DatabaseService.updateConversationHistory(conversationId, messages);
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
    const success = await DatabaseService.endConversation(conversationId);
    res.json({ success });
  } catch (error) {
    console.error('End conversation API error:', error);
    res.status(500).json({ success: false, error: 'Failed to end conversation' });
  }
});

// Store conversation sessions
const sessions = new Map();

// Insurance-specific conversation logic
const getInitialMessage = (formData) => {
  const { name, insuranceType, location } = formData;
  
  const messages = {
    auto: `Hi ${name}! I see you're looking for auto insurance in ${location}. I'd love to help you find the perfect coverage. What type of vehicle are you looking to insure?`,
    home: `Hello ${name}! Looking for home insurance in ${location}? Great choice! Can you tell me what type of property you're looking to insure - is it a house, condo, or apartment?`,
    health: `Hi ${name}! I'm here to help you find the right health insurance in ${location}. Are you looking for coverage for yourself, your family, or both?`,
    life: `Hello ${name}! Life insurance is such an important decision. I'm here to help you find the right coverage in ${location}. Are you looking for term life or whole life insurance?`,
    business: `Hi ${name}! I see you need business insurance in ${location}. I'd be happy to help! What type of business do you operate?`
  };
  
  return messages[insuranceType] || `Hi ${name}! I'm here to help you find the right insurance coverage in ${location}. What questions do you have?`;
};

const generateResponse = (message, context, history) => {
  const lowerMessage = message.toLowerCase();
  const { insuranceType, location, name } = context;
  
  // Auto insurance responses
  if (insuranceType === 'auto') {
    if (lowerMessage.includes('car') || lowerMessage.includes('vehicle') || lowerMessage.includes('honda') || lowerMessage.includes('toyota') || lowerMessage.includes('ford')) {
      return "Great choice! For your vehicle, I'll need to know a few more details. What year is it, and do you currently have insurance or is this for a new policy?";
    }
    if (lowerMessage.includes('coverage') || lowerMessage.includes('liability')) {
      return "Perfect! For auto insurance, I typically recommend comprehensive coverage that includes liability, collision, and comprehensive. What's your budget range for monthly premiums?";
    }
  }
  
  // Home insurance responses
  if (insuranceType === 'home') {
    if (lowerMessage.includes('house') || lowerMessage.includes('home')) {
      return "Excellent! For homeowners insurance, I'll need to know the approximate value of your home and when it was built. This helps me find you the best rates.";
    }
    if (lowerMessage.includes('condo') || lowerMessage.includes('apartment')) {
      return "Got it! For condo/renters insurance, we'll focus on personal property and liability coverage. Do you have any high-value items like jewelry or electronics?";
    }
  }
  
  // Health insurance responses
  if (insuranceType === 'health') {
    if (lowerMessage.includes('family') || lowerMessage.includes('both')) {
      return "Family coverage is important! How many people will be on the plan? Also, do you have any preferred doctors or hospitals you'd like to keep?";
    }
    if (lowerMessage.includes('myself') || lowerMessage.includes('individual')) {
      return "Individual coverage - perfect! Do you have any ongoing health conditions or medications that are important to you? This helps me find plans with the best coverage for your needs.";
    }
  }
  
  // Life insurance responses
  if (insuranceType === 'life') {
    if (lowerMessage.includes('term')) {
      return "Term life insurance is a great, affordable option! What coverage amount are you thinking? Most people choose between $250K to $1M depending on their family's needs.";
    }
    if (lowerMessage.includes('whole') || lowerMessage.includes('permanent')) {
      return "Whole life insurance provides lifelong coverage plus cash value. What's most important to you - the investment component or leaving money for beneficiaries?";
    }
  }
  
  // Business insurance responses
  if (insuranceType === 'business') {
    if (lowerMessage.includes('restaurant') || lowerMessage.includes('retail') || lowerMessage.includes('consulting')) {
      return "I understand your business type! For your industry, you'll likely need general liability and possibly professional liability. How many employees do you have?";
    }
  }
  
  // General responses
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    return `Great question about pricing! Based on your location in ${location} and the type of coverage you need, I can help you find competitive rates. What's your preferred monthly budget range?`;
  }
  
  if (lowerMessage.includes('when') || lowerMessage.includes('start')) {
    return "Most policies can start as soon as tomorrow! Once we finalize your coverage details, I can get you quotes from multiple carriers and help you choose the best option.";
  }
  
  // Default response
  return "That's a great question! Let me make sure I understand your needs correctly. Can you tell me more about what's most important to you in your insurance coverage?";
};

// Initialize chat session
app.post('/api/chat/initialize', (req, res) => {
  try {
    const { sessionId, formData } = req.body;
    
    // Store session data
    sessions.set(sessionId, {
      formData,
      history: [],
      context: formData
    });
    
    const initialMessage = getInitialMessage(formData);
    
    res.json({
      success: true,
      message: initialMessage,
      sessionId
    });
  } catch (error) {
    console.error('Initialize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize chat session'
    });
  }
});

// Handle chat messages
app.post('/api/chat/message', (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    // Get session data
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Add user message to history
    session.history.push({ role: 'user', content: message });
    
    // Generate response
    const response = generateResponse(message, session.context, session.history);
    
    // Add bot response to history
    session.history.push({ role: 'assistant', content: response });
    
    // Update session
    sessions.set(sessionId, session);
    
    res.json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
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