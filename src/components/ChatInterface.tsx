import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Shield, Phone, Mail, MapPin, Calendar, CheckCircle, Star, Award, Users } from 'lucide-react';
import { SimpleFormData } from './HeroSection';

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
  formData: SimpleFormData & { zipCode: string; insuranceType: string };
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

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

const normalizeGenderValue = (value?: string) => {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase().replace(/[-\s]+/g, '_');
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
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [insuranceProducts, setInsuranceProducts] = useState<InsuranceProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userAge, setUserAge] = useState(formData.age ? String(formData.age) : '');
  const [userGender, setUserGender] = useState(formData.gender || '');
  const [demographicsConfirmed, setDemographicsConfirmed] = useState(Boolean(formData.age && formData.gender));
  const [demographicError, setDemographicError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initializeChat = async () => {
      setIsTyping(true);

      const generatedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      try {
        const response = await fetch(`${API_BASE_URL}/chat/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: generatedSessionId, formData })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.message) {
          throw new Error(result.error || 'Chat initialization failed');
        }

        const backendSessionId = result.sessionId || generatedSessionId;
        setChatSessionId(backendSessionId);

        if (result.customerId) {
          setCustomerId(result.customerId.toString());
        }

        const initialMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: result.message,
          timestamp: new Date()
        };

        setMessages([initialMessage]);

        try {
          const productList = await DatabaseAPI.getInsuranceProducts(
            formData.insuranceType,
            formData.age,
            formData.gender
          );
          setInsuranceProducts(productList);
        } catch (productError) {
          console.warn('Failed to load insurance products:', productError);
        }

        if (result.customerId) {
          try {
            const createdConversationId = await DatabaseAPI.createConversationHistory(
              result.customerId,
              backendSessionId
            );
            if (createdConversationId) {
              setConversationId(createdConversationId);
            }
          } catch (conversationError) {
            console.warn('Failed to create conversation history:', conversationError);
          }
        }

        setIsTyping(false);
        return;
      } catch (chatInitError) {
        console.error('Chat initialization failed:', chatInitError);
        setError('Unable to connect to the chat service right now. Please try again in a moment.');
      } finally {
        setIsTyping(false);
      }
    };

    initializeChat();
  }, [formData]);

  useEffect(() => {
    setUserAge(formData.age ? String(formData.age) : '');
    setUserGender(normalizeGenderValue(formData.gender));
    setDemographicsConfirmed(Boolean(formData.age && formData.gender));
  }, [formData.age, formData.gender]);

  useEffect(() => {
    if (!demographicsConfirmed) {
      return;
    }

    const ageNumber = parseInt(userAge, 10);
    const normalizedAge = Number.isNaN(ageNumber) ? undefined : ageNumber;
    const normalizedGender = userGender ? userGender : undefined;

    const fetchProducts = async () => {
      try {
        const productList = await DatabaseAPI.getInsuranceProducts(
          formData.insuranceType,
          normalizedAge,
          normalizedGender
        );
        setInsuranceProducts(productList);
      } catch (productError) {
        console.warn('Failed to load insurance products:', productError);
      }
    };

    fetchProducts();
  }, [demographicsConfirmed, userAge, userGender, formData.insuranceType]);

  const getGenderLabel = (value: string) => {
    const normalized = value.toLowerCase();
    const match = GENDER_OPTIONS.find(
      option => option.value === normalized || option.label.toLowerCase() === normalized
    );
    return match ? match.label : value;
  };

  const buildDemographicPayload = (overrides?: Partial<{ age: number; gender: string }>) => {
    const payload: { age?: number; gender?: string } = {};

    if (demographicsConfirmed) {
      const parsedAge = parseInt(userAge, 10);
      if (!Number.isNaN(parsedAge)) {
        payload.age = parsedAge;
      }
      if (userGender) {
        payload.gender = userGender;
      }
    }

    if (overrides) {
      if (typeof overrides.age === 'number' && !Number.isNaN(overrides.age)) {
        payload.age = overrides.age;
      }
      if (overrides.gender) {
        payload.gender = overrides.gender;
      }
    }

    return payload;
  };

  const sendMessage = async (messageText: string, overrides?: Partial<{ age: number; gender: string }>) => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return false;
    }

    if (!chatSessionId) {
      console.warn('Chat session is not ready yet.');
      setError('Chat session is still establishing. Please try again in a moment.');
      return false;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const requestBody: Record<string, any> = {
      sessionId: chatSessionId,
      message: trimmed
    };

    const demographicPayload = buildDemographicPayload(overrides);
    if (Object.keys(demographicPayload).length > 0) {
      requestBody.formData = demographicPayload;
    }

    let wasSuccessful = false;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const botContent = result.message || result.response || 'Sorry, no response from server.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setError(null);
      wasSuccessful = true;
    } catch (error) {
      console.error('Error sending message to backend:', error);
      setError('Sorry, there was an error connecting to the server. Please try again.');
    } finally {
      setIsTyping(false);
    }

    return wasSuccessful;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    setInputValue('');
    await sendMessage(trimmed);
  };

  const handleDemographicsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!chatSessionId) {
      setDemographicError('Chat session is still establishing. Please wait a moment.');
      return;
    }

    const trimmedAge = userAge.trim();
    const parsedAge = parseInt(trimmedAge, 10);

    if (!trimmedAge || Number.isNaN(parsedAge) || parsedAge < 18 || parsedAge > 100) {
      setDemographicError('Please enter a valid age between 18 and 100.');
      return;
    }

    if (!userGender) {
      setDemographicError('Please select a gender option.');
      return;
    }

    setDemographicError(null);
    setUserAge(String(parsedAge));
    const normalizedGender = normalizeGenderValue(userGender);
    setUserGender(normalizedGender);

    const genderLabel = getGenderLabel(normalizedGender);
    const demographicMessage = genderLabel === 'Prefer not to say'
      ? `I'm ${parsedAge} years old and I prefer not to share my gender.`
      : `I'm ${parsedAge} years old and my gender is ${genderLabel}.`;

    const wasSuccessful = await sendMessage(demographicMessage, { age: parsedAge, gender: normalizedGender });

    if (!wasSuccessful) {
      return;
    }

    setDemographicsConfirmed(true);

    try {
      const productList = await DatabaseAPI.getInsuranceProducts(
        formData.insuranceType,
        parsedAge,
        normalizedGender
      );
      setInsuranceProducts(productList);
    } catch (productError) {
      console.warn('Failed to refresh insurance products:', productError);
    }
  };

  const handleEditDemographics = () => {
    setDemographicsConfirmed(false);
    setDemographicError(null);
  };

  const resolvedAge = demographicsConfirmed && userAge ? userAge : formData.age ? String(formData.age) : '';
  const resolvedGenderValue = demographicsConfirmed && userGender ? userGender : formData.gender ? formData.gender : '';
  const resolvedGenderLabel = resolvedGenderValue ? getGenderLabel(resolvedGenderValue) : '';
  const ageDisplay = resolvedAge ? `Age: ${resolvedAge}` : 'Age not provided yet';
  const genderDisplay = resolvedGenderLabel ? `Gender: ${resolvedGenderLabel}` : 'Gender not provided yet';

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{ageDisplay}</span>
                  </div>
                  {demographicsConfirmed && (
                    <button
                      type="button"
                      onClick={handleEditDemographics}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{genderDisplay}</span>
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
              {!demographicsConfirmed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Let's personalise your quotes</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Share your age and gender so I can tailor recommendations to fit you best.
                  </p>
                  <form className="space-y-4" onSubmit={handleDemographicsSubmit}>
                    <div>
                      <label htmlFor="chat-age" className="block text-sm font-medium text-gray-700 mb-1">
                        Age
                      </label>
                      <input
                        id="chat-age"
                        type="number"
                        min={18}
                        max={100}
                        value={userAge}
                        onChange={(event) => setUserAge(event.target.value)}
                        placeholder="Enter your age"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-1">Gender</span>
                      <div className="flex flex-wrap gap-2">
                        {GENDER_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setUserGender(option.value)}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              userGender === option.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 text-gray-700 hover:border-blue-400'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {demographicError && (
                      <p className="text-sm text-red-600">{demographicError}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">This helps me trim down the most relevant plans.</p>
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!userAge.trim() || !userGender || isTyping}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          !userAge.trim() || !userGender || isTyping
                            ? 'bg-blue-300 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Share Details
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
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
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                        
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
            {error && (
              <div className="mb-2 text-red-600 font-semibold">
                {error}
              </div>
            )}
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

// No changes needed for this error in frontend.
