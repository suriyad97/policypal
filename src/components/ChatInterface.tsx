import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Shield, Phone, Mail, MapPin, Calendar, CheckCircle, Star, Award, Users } from 'lucide-react';
import { FormData } from './SinglePageForm';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isQuote?: boolean;
  quoteData?: {
    provider: string;
    monthlyRate: string;
    coverage: string;
    savings: string;
  };
}

interface InsuranceProduct {
  product_id: number;
  product_name: string;
  product_type: 'savings' | 'auto' | 'home' | 'health' | 'term_life';
  target_gender: 'male' | 'female' | 'non_binary' | 'all';
  min_age: number;
  max_age: number;
  premium_amount: number;
  coverage_details: string;
  provider_name: string;
  features: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatInterfaceProps {
  formData: FormData;
  onBack: () => void;
}

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: import.meta.env.VITE_LLM_ENDPOINT || '',
  subscriptionKey: import.meta.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: import.meta.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: import.meta.env.VITE_LLM_MODEL_NAME || 
  apiVersion: import.meta.env.VITE_LLM_API_VERSION || 
};

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Database API functions
const DatabaseAPI = {
  async getInsuranceProducts(productType: string, age?: number, gender?: string): Promise<InsuranceProduct[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, age, gender })
      });
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  async storeCustomer(customerData: any): Promise<number | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerData })
      });
      const result = await response.json();
      return result.success ? result.data.customerId : null;
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  },

  async getCustomer(customerId: number): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/customer/${customerId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  },

  async createConversationHistory(customerId: number, sessionId: string): Promise<number | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, sessionId })
      });
      const result = await response.json();
      return result.success ? result.data.conversationId : null;
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  },

  async updateConversationHistory(conversationId: number, messages: Array<{ role: string; content: string; timestamp: string }>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/conversation/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  },

  async endConversation(conversationId: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/conversation/${conversationId}/end`, {
        method: 'PUT'
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  }
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ formData, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [insuranceProducts, setInsuranceProducts] = useState<InsuranceProduct[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate system prompt based on form data
  const generateSystemPrompt = (formData: FormData, products: InsuranceProduct[], customer: any) => {
    const insuranceContext = {
      auto: `The customer is looking for auto insurance for their ${customer.vehicle_model} (${customer.vehicle_year}) with registration number ${customer.vehicle_number}.`,
      health: `The customer is a ${customer.age} year old ${customer.gender} looking for health insurance. ${customer.medical_history ? `Medical history: ${customer.medical_history}` : 'No pre-existing conditions mentioned.'}`,
      term_life: `The customer is a ${customer.age} year old ${customer.gender} looking for term life insurance with ${customer.coverage_amount} coverage for ${customer.relationship}.`,
      savings: `The customer is a ${customer.age} year old ${customer.gender} looking for a savings plan with ${customer.monthly_investment} monthly investment for ${customer.investment_goal}.`,
      home: `The customer is a ${customer.age} year old ${customer.gender} looking for home insurance.`
    };

    const availableProducts = products.map(p => 
      `${p.provider_name} - ${p.product_name}: ₹${p.premium_amount}/month, Coverage: ${p.coverage_details}`
    ).join('\n');

    return `You are PolicyPal, a professional and friendly insurance advisor. You are helping ${customer.name} from ${customer.zip_code} with their ${customer.insurance_type} insurance needs.

Customer Details:
- Name: ${customer.name}
- Location: ${customer.zip_code}
- Email: ${customer.email}
- Phone: ${customer.phone}
- Insurance Type: ${customer.insurance_type}
${customer.current_provider ? `- Current Provider: ${customer.current_provider}` : ''}

Context: ${insuranceContext[customer.insurance_type as keyof typeof insuranceContext] || 'General insurance inquiry.'}

Available Insurance Products:
${availableProducts}

Instructions:
1. Be professional, helpful, and knowledgeable about insurance
2. Ask relevant follow-up questions to better understand their needs
3. Provide personalized recommendations from the available products above
4. Explain insurance terms in simple language
5. Focus on finding the best coverage for their specific situation
6. Keep responses concise but informative
7. Show empathy and build trust
8. When recommending products, use the exact provider names and pricing from the available products
9. Explain why specific products are suitable for their needs

Start the conversation by greeting them personally and acknowledging their specific insurance needs.`;
  };

  // Call LLM API
  const callLLMAPI = async (messages: { role: string; content: string }[]) => {
    try {
      const response = await fetch(LLM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_CONFIG.subscriptionKey}`,
          // For Azure OpenAI, use this header instead:
          // 'api-key': LLM_CONFIG.subscriptionKey,
        },
        body: JSON.stringify({
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          model: LLM_CONFIG.modelName || LLM_CONFIG.deploymentName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different API response formats
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else if (data.content) {
        return data.content;
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('LLM API Error:', error);
      // Fallback response
      return "I apologize, but I'm having trouble connecting to our AI system right now. However, I'm still here to help you with your insurance needs! Could you tell me more about what specific coverage you're looking for?";
    }
  };

  useEffect(() => {
    // Initialize database and conversation
    const initializeChat = async () => {
      setIsTyping(true);
      
      try {
        // 1. Store customer data in database first
        const storedCustomerId = await DatabaseAPI.storeCustomer(formData);
        if (!storedCustomerId) {
          throw new Error('Failed to store customer data');
        }
        setCustomerId(storedCustomerId.toString());
        
        // 2. Get stored customer data for context
        const customer = await DatabaseAPI.getCustomer(storedCustomerId);
        if (!customer) {
          throw new Error('Failed to retrieve customer data');
        }
        
        // 3. Fetch relevant insurance products from database
        const products = await DatabaseAPI.getInsuranceProducts(
          formData.insuranceType,
          customer.age,
          customer.gender
        );
        setInsuranceProducts(products);
        
        // 4. Create conversation history record
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const conversationHistoryId = await DatabaseAPI.createConversationHistory(
          storedCustomerId,
          sessionId
        );
        setConversationId(conversationHistoryId);
        
        // 5. Generate system prompt with product data and customer context
        const systemPrompt = generateSystemPrompt(formData, products, customer);
        
        // 6. Initialize LLM conversation
        const initialMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Hello, I would like to get started with my insurance quote.' }
        ];

        const response = await callLLMAPI(initialMessages);
        
        const initialMessage: Message = {
          id: '1',
          type: 'bot',
          content: response,
          timestamp: new Date(),
        };

        setMessages([initialMessage]);
        
        // 7. Store initial conversation in database
        if (conversationHistoryId) {
          await DatabaseAPI.updateConversationHistory(conversationHistoryId, [
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ]);
        }
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        
        // Fallback initialization
        const fallbackMessage: Message = {
          id: '1',
          type: 'bot',
          content: `Hello ${formData.name}! 👋 I'm PolicyPal, your personal insurance advisor. I'm here to help you find the perfect ${formData.insuranceType} insurance coverage. I'm having trouble accessing our product database right now, but I can still help answer your questions!`,
          timestamp: new Date(),
        };
        setMessages([fallbackMessage]);
      }
      setIsTyping(false);
    };

    initializeChat();
  }, [formData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Get customer data for context
      const customer = customerId ? await DatabaseAPI.getCustomer(parseInt(customerId)) : null;
      if (!customer) {
        throw new Error('Customer data not found');
      }

      // Build conversation history for LLM
      const systemPrompt = generateSystemPrompt(formData, insuranceProducts, customer);
    const conversationHistory = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: currentInput }
    ];

      const response = await callLLMAPI(conversationHistory);
    
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: response,
      timestamp: new Date(),
    };

      setIsTyping(false);
    setMessages(prev => [...prev, botMessage]);
    
    // Update conversation history in database
    if (conversationId) {
      const allMessages = [...messages, userMessage, botMessage].map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      await DatabaseAPI.updateConversationHistory(conversationId, allMessages);
    }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team for assistance.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle conversation end (when user navigates away or closes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationId) {
        DatabaseAPI.endConversation(conversationId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (conversationId) {
        DatabaseAPI.endConversation(conversationId);
      }
    };
  }, [conversationId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Professional Header */}
      <motion.div
        className="bg-white shadow-sm border-b border-gray-200 p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PolicyPal Insurance</h1>
              <p className="text-blue-600 text-sm font-medium">Licensed Insurance Advisor • Serving {formData.zipCode}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-gray-600">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">A+ Rated</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">50K+ Customers</span>
            </div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50 font-medium"
            >
              ← New Quote
            </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto flex">
        {/* Customer Info Sidebar */}
        <motion.div
          className="w-80 bg-white shadow-sm border-r border-gray-200 p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{formData.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{formData.zipCode}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Age: {formData.age}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 capitalize">{formData.insuranceType} Insurance</span>
                </div>
              </div>
            </div>

            {showQuotes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">Quote Ready</h4>
                </div>
                <p className="text-green-700 text-sm">Your personalized quote is available in the chat.</p>
              </motion.div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Why Choose PolicyPal?</h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center space-x-2">
                  <Star className="w-3 h-3" />
                  <span>Compare 50+ top insurers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="w-3 h-3" />
                  <span>Average savings of $847/year</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="w-3 h-3" />
                  <span>Licensed advisors</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Star className="w-3 h-3" />
                  <span>Free consultation</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Need Help?</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">1-800-POLICY-1</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">help@policypal.com</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-lg ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-blue-600' 
                          : 'bg-white border-2 border-blue-200'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        
                        {message.isQuote && message.quoteData && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-900">{message.quoteData.provider}</h4>
                              <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                {message.quoteData.savings}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Monthly Premium</p>
                                <p className="text-2xl font-bold text-gray-900">{message.quoteData.monthlyRate}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wide">Coverage Type</p>
                                <p className="text-sm font-semibold text-gray-800">{message.quoteData.coverage}</p>
                              </div>
                            </div>
                            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                              Get This Quote
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start space-x-3 max-w-lg">
                      <div className="w-10 h-10 bg-white border-2 border-blue-200 rounded-full flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </motion.div>
                      </div>
                      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
                        <div className="flex space-x-1">
                          <motion.div
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <motion.div
            className="bg-white border-t border-gray-200 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <motion.button
                type="submit"
                disabled={!inputValue.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>
        </motion.div>
        </div>
      </div>
    </div>
  );
};