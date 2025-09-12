import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Shield, Phone, Mail, MapPin, Calendar, CheckCircle, Star, Award, Users } from 'lucide-react';
import { FormData } from './QuickForm';

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

interface ChatInterfaceProps {
  formData: FormData;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ formData, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial professional greeting
    const initialMessage: Message = {
      id: '1',
      type: 'bot',
      content: `Hello ${formData.name}, thank you for choosing PolicyPal. I'm your dedicated insurance advisor, and I'm here to help you find the perfect ${formData.insuranceType} insurance coverage in ${formData.zipCode}. Let me ask you a few quick questions to ensure we find you the best rates and coverage options.`,
      timestamp: new Date(),
    };

    setMessages([initialMessage]);

    // Professional follow-up question
    setTimeout(() => {
      let followUpQuestion = '';
      switch (formData.insuranceType) {
        case 'auto':
          followUpQuestion = "To provide you with accurate quotes, I'll need some details about your vehicle. What is the make, model, and year of the car you'd like to insure?";
          break;
        case 'home':
          followUpQuestion = "To calculate your home insurance premium, could you please tell me the approximate value of your home and the year it was built?";
          break;
        case 'health':
          followUpQuestion = "For your health insurance needs, are you looking for individual coverage or family coverage? Also, do you have any preferred healthcare providers?";
          break;
        case 'life':
          followUpQuestion = "To recommend the right life insurance policy, what coverage amount are you considering, and are you interested in term or whole life insurance?";
          break;
        default:
          followUpQuestion = "What specific coverage requirements do you have? This will help me match you with the most suitable insurance providers.";
      }

      const followUp: Message = {
        id: '2',
        type: 'bot',
        content: followUpQuestion,
        timestamp: new Date(),
      };
      
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, followUp]);
      }, 1500);
    }, 2000);
  }, [formData]);

  const generateQuote = () => {
    const quotes = [
      {
        provider: "State Farm",
        monthlyRate: "$89",
        coverage: "Full Coverage",
        savings: "Save $240/year"
      },
      {
        provider: "Geico",
        monthlyRate: "$76",
        coverage: "Comprehensive",
        savings: "Save $380/year"
      },
      {
        provider: "Progressive",
        monthlyRate: "$82",
        coverage: "Premium Plus",
        savings: "Save $290/year"
      }
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Professional bot responses
    setTimeout(() => {
      const professionalResponses = [
        "Thank you for that information. Based on your details, I'm finding excellent coverage options that could significantly reduce your current premiums.",
        "Perfect! I'm analyzing your requirements with our network of A-rated insurance providers to ensure you get the best value.",
        "Excellent. I'm matching your profile with our top-rated carriers who specialize in your coverage needs.",
        "Thank you. I'm now comparing rates from multiple providers to find you the most competitive options available."
      ];

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: professionalResponses[Math.floor(Math.random() * professionalResponses.length)],
        timestamp: new Date(),
      };

      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);

      // Show quote after a few exchanges
      if (messages.length >= 4) {
        setTimeout(() => {
          const quoteData = generateQuote();
          const quoteMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'bot',
            content: `Great news! I found an excellent option for you. Here's a personalized quote from one of our top-rated providers:`,
            timestamp: new Date(),
            isQuote: true,
            quoteData
          };

          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, quoteMessage]);
            setShowQuotes(true);
          }, 1000);
        }, 2000);
      }
    }, 2000);
  };

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