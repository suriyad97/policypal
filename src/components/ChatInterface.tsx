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
  modelName: import.meta.env.VITE_LLM_MODEL_NAME || 'gpt-3.5-turbo',
  apiVersion: import.meta.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

// Backend API base URL
const API_BASE_URL = '/api';

// Rule-based response fallback
const generateRuleBasedResponse = (message: string, formData: FormData): string => {
  const messageLower = message.toLowerCase();
  const insuranceType = formData.insuranceType;
  const name = formData.name;

  // Price/Cost related queries
  if (messageLower.includes('quote') || messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('premium') || messageLower.includes('rate') || messageLower.includes('how much')) {
    if (insuranceType === 'auto') {
      return `Great question about pricing, ${name}! Auto insurance rates typically range from ₹5,000 to ₹15,000 annually, depending on your vehicle type, age, and driving history. For a more accurate quote, I'd need to know: What type of vehicle do you drive and what's your driving experience?`;
    } else if (insuranceType === 'health') {
      return `${name}, health insurance premiums vary based on age and coverage needs. Individual plans typically start from ₹8,000 annually, while family plans range from ₹12,000-₹25,000. What's your age and are you looking for individual or family coverage?`;
    } else if (insuranceType === 'term_life') {
      return `${name}, term life insurance is very affordable! Premiums typically start from ₹6,000 annually for ₹10 lakh coverage. The exact rate depends on your age and health. What coverage amount are you considering for your family's protection?`;
    } else {
      return `${name}, ${insuranceType} insurance pricing varies based on several factors. I'd be happy to get you personalized quotes from multiple insurers. What specific coverage are you most interested in?`;
    }
  }
  
  // Coverage/Benefits related queries
  if (messageLower.includes('coverage') || messageLower.includes('cover') || messageLower.includes('benefit') || messageLower.includes('what does') || messageLower.includes('include')) {
    if (insuranceType === 'auto') {
      return `${name}, comprehensive auto insurance typically includes: liability coverage (mandatory), collision coverage, theft protection, natural disaster coverage, personal accident cover, and roadside assistance. Which of these aspects interests you most?`;
    } else if (insuranceType === 'health') {
      return `${name}, health insurance covers hospitalization expenses, pre/post hospitalization, day-care procedures, ambulance charges, and cashless treatment at network hospitals. Many plans also include wellness benefits. What specific health concerns do you want covered?`;
    } else {
      return `${name}, ${insuranceType} insurance provides comprehensive protection tailored to your needs. Would you like me to explain the specific coverage details and benefits available?`;
    }
  }
  
  // Claims related queries
  if (messageLower.includes('claim') || messageLower.includes('accident') || messageLower.includes('damage') || messageLower.includes('file')) {
    return `${name}, our claims process is designed to be simple and fast! You can file claims online, through our mobile app, or by calling our 24/7 helpline. Most ${insuranceType} claims are processed within 24-48 hours for cashless services. Have you had to file insurance claims before?`;
  }
  
  // Comparison queries
  if (messageLower.includes('compare') || messageLower.includes('difference') || messageLower.includes('better') || messageLower.includes('vs') || messageLower.includes('which')) {
    return `${name}, that's a smart approach! I can help you compare different ${insuranceType} insurance options based on coverage, premium, claim settlement ratio, and customer service. Each insurer has unique strengths. Would you like me to show you a comparison of top insurers?`;
  }
  
  // Timeline/When queries
  if (messageLower.includes('when') || messageLower.includes('start') || messageLower.includes('begin') || messageLower.includes('how long')) {
    return `${name}, most insurance policies can start as soon as tomorrow! Once you choose a plan and complete the application, ${insuranceType} insurance typically becomes effective within 24 hours for online purchases. Would you like to start the application process?`;
  }
  
  // Requirements/Documents queries
  if (messageLower.includes('need') || messageLower.includes('require') || messageLower.includes('document') || messageLower.includes('papers')) {
    if (insuranceType === 'auto') {
      return `${name}, for auto insurance you'll need: vehicle registration certificate, driving license, previous insurance policy (if any), and vehicle photos. I can guide you through the entire process. Do you have these documents ready?`;
    } else if (insuranceType === 'health') {
      return `${name}, for health insurance you'll typically need: age proof, address proof, income proof, and medical checkup reports (if required). Most documents can be uploaded digitally. What documents do you currently have?`;
    } else {
      return `${name}, for ${insuranceType} insurance, you'll need basic identity and address documents. I'll guide you through exactly what's needed. Would you like me to send you a detailed checklist?`;
    }
  }
  
  // Greeting responses
  if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
    return `Hello ${name}! Great to chat with you! I'm here to help you find the perfect ${insuranceType} insurance. What questions can I answer for you today?`;
  }
  
  // Thank you responses
  if (messageLower.includes('thank') || messageLower.includes('thanks')) {
    return `You're very welcome, ${name}! I'm happy to help you with your ${insuranceType} insurance needs. Is there anything else you'd like to know?`;
  }
  
  // Help/Assistance queries
  if (messageLower.includes('help') || messageLower.includes('assist') || messageLower.includes('support')) {
    return `Absolutely, ${name}! I'm here to help you with everything related to ${insuranceType} insurance - from explaining coverage options to getting quotes and understanding the claims process. What would be most helpful for you right now?`;
  } else {
    // Dynamic default responses based on context
    const responses = [
      `That's an interesting question about ${insuranceType} insurance, ${name}. Could you tell me more about what specific information you're looking for?`,
      `${name}, I'd be happy to help you with that! For ${insuranceType} insurance, I can assist with coverage options, pricing, claims, and more. What aspect interests you most?`,
      `Great question, ${name}! Let me help you understand ${insuranceType} insurance better. Are you looking for information about coverage, costs, or something else specific?`,
      `${name}, I'm here to make ${insuranceType} insurance simple for you. Whether it's about policies, premiums, or protection - what would you like to explore first?`
    ];
    
    // Return a random response to avoid repetition
    return responses[Math.floor(Math.random() * responses.length)];
  }
};

// Database API functions
const DatabaseAPI = {
  async getInsuranceProducts(productType: string, age?: number, gender?: string): Promise<InsuranceProduct[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/database/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, age, gender })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
    // Check if LLM is configured
    if (!LLM_CONFIG.endpoint || !LLM_CONFIG.subscriptionKey) {
      console.warn('LLM API not configured, using fallback response');
      throw new Error('LLM API not configured');
    }

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
      throw error; // Re-throw to be handled by caller
    }
  };

  useEffect(() => {
    // Initialize database and conversation
    const initializeChat = async () => {
      setIsTyping(true);
      
      try {
        // Try to connect to backend and store customer data
        let storedCustomerId: string | null = null;
        let customer: any = null;
        let products: InsuranceProduct[] = [];
        let conversationHistoryId: number | null = null;
        
        try {
          // 1. Store customer data in database
          const customerData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            zipCode: formData.zipCode,
            insuranceType: formData.insuranceType,
            age: formData.age,
            gender: formData.gender
          };
          const customerIdResult = await DatabaseAPI.storeCustomer(customerData);
          if (customerIdResult) {
            storedCustomerId = customerIdResult.toString();
            setCustomerId(storedCustomerId);
            
            // 2. Get stored customer data for context
            customer = await DatabaseAPI.getCustomer(customerIdResult);
            
            // 3. Fetch relevant insurance products from database
            products = await DatabaseAPI.getInsuranceProducts(
              formData.insuranceType,
              customer?.age,
              customer?.gender
            );
            setInsuranceProducts(products);
            
            // 4. Create conversation history record
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            conversationHistoryId = await DatabaseAPI.createConversationHistory(
              customerIdResult,
              sessionId
            );
            setConversationId(conversationHistoryId);
          }
        } catch (dbError) {
          console.warn('Database connection failed, using fallback mode:', dbError);
        }
        
        // Use form data as fallback if database is unavailable
        const customerData = customer || {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          age: formData.age || '30',
          gender: formData.gender || 'all',
          zip_code: formData.zipCode,
          insurance_type: 'health',
          medical_history: formData.medicalHistory,
          current_provider: formData.currentProvider
        };
        
        // Generate system prompt with available data
        const systemPrompt = generateSystemPrompt(formData, products, customerData);
        
        // Initialize LLM conversation or use fallback
        let response: string;
        try {
          const initialMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Hello, I would like to get started with my insurance quote.' }
          ];
          response = await callLLMAPI(initialMessages);
        } catch (llmError) {
          console.warn('LLM API not available, using fallback response:', llmError);
          response = `Hello ${formData.name}! 👋 I'm PolicyPal, your personal insurance advisor. I'm here to help you find the best insurance options for you. 

I can help you with:
• Comparing different insurance plans
• Explaining coverage options
• Finding the best rates for your needs
• Answering any questions about insurance

What would you like to know about insurance?`;
        }
        
        // Create acknowledgment message first
        const acknowledgmentMessage: Message = {
          id: '0',
          type: 'bot',
          content: `Thank you, ${formData.name}! 🎉 Your information has been successfully submitted. I appreciate your interest in finding better insurance coverage!

📧 Email: ${formData.email}
📱 Phone: ${formData.phone}  
📍 Pincode: ${formData.pincode}
✅ Status: Submitted

Now, let me help you with personalized insurance recommendations and answer any questions you have!`,
          timestamp: new Date(),
        };

        const welcomeMessage: Message = {
          id: '1',
          type: 'bot',
          content: response,
          timestamp: new Date(),
        };


        setMessages([acknowledgmentMessage, welcomeMessage]);
        
        // Store initial conversation in database if available
        if (conversationHistoryId) {
          try {
            await DatabaseAPI.updateConversationHistory(conversationHistoryId, [
              { role: 'assistant', content: acknowledgmentMessage.content, timestamp: acknowledgmentMessage.timestamp.toISOString() },
              { role: 'assistant', content: acknowledgmentMessage.content, timestamp: acknowledgmentMessage.timestamp.toISOString() },
              { role: 'assistant', content: response, timestamp: new Date().toISOString() }
            ]);
          } catch (error) {
            console.warn('Failed to store conversation history:', error);
          }
        }
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        
        // Final fallback initialization
        const fallbackMessage: Message = {
          id: '0',
          type: 'bot',
          content: `Thank you, ${formData.name}! 🎉 Your information has been successfully submitted. I appreciate your interest in finding better insurance coverage!

📧 Email: ${formData.email}
📱 Phone: ${formData.phone}  
📍 Pincode: ${formData.pincode}
✅ Status: Submitted

Now, let me help you with personalized insurance recommendations and answer any questions you have!`,
          timestamp: new Date(),
        };
        
        const fallbackWelcomeMessage: Message = {
          id: '1',
          type: 'bot',
          content: `Hello ${formData.name}! 👋 I'm PolicyPal, your personal insurance advisor. I'm here to help you with your insurance needs.

I can assist you with:
• Getting quotes and comparing plans
• Explaining different coverage options
• Understanding insurance terms
• Finding the best rates for your situation

What questions do you have about insurance?`,
          timestamp: new Date(),
        };
        setMessages([fallbackMessage, fallbackWelcomeMessage]);
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
      // Get customer data for context or use form data as fallback
      let customer: any = null;
      if (customerId) {
        try {
          customer = await DatabaseAPI.getCustomer(parseInt(customerId));
        } catch (error) {
          console.warn('Failed to get customer from database:', error);
        }
      }
      
      // Use form data as fallback
      const customerData = customer || {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        age: formData.age || '30',
        gender: formData.gender || 'all',
        zip_code: formData.zipCode,
        insurance_type: 'health',
        medical_history: formData.medicalHistory,
        current_provider: formData.currentProvider
      };

      // Build conversation history for LLM
      const systemPrompt = generateSystemPrompt(formData, insuranceProducts, customerData);
      const conversationHistory = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: currentInput }
      ];

      let response: string;
      try {
        response = await callLLMAPI(conversationHistory);
      } catch (llmError) {
        console.warn('LLM API failed, using rule-based response:', llmError);
        response = generateRuleBasedResponse(currentInput, formData);
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date(),
      };

      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);
      
      // Update conversation history in database if available
      if (conversationId) {
        try {
          const allMessages = [...messages, userMessage, botMessage].map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          }));
          
          await DatabaseAPI.updateConversationHistory(conversationId, allMessages);
        } catch (error) {
          console.warn('Failed to update conversation history:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize for the technical difficulty. Let me try to help you with your insurance questions. Could you please rephrase your question?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle conversation end (when user navigates away or closes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationId) {
        try {
          DatabaseAPI.endConversation(conversationId);
        } catch (error) {
          console.warn('Failed to end conversation:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (conversationId) {
        try {
          DatabaseAPI.endConversation(conversationId);
        } catch (error) {
          console.warn('Failed to end conversation:', error);
        }
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
          <div className="flex items-center">
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
                  <span className="text-gray-700">Health Insurance</span>
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

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Need Help?</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">1800-8000-10</span>
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