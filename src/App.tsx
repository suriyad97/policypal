import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSection, SimpleFormData } from './components/HeroSection';
import { AcknowledgmentPage } from './components/AcknowledgmentPage';
import { ChatInterface } from './components/ChatInterface';
import { LLMTest } from './components/LLMTest';

type AppState = 'hero' | 'acknowledgment' | 'chat' | 'llm-test';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('hero');
  const [formData, setFormData] = useState<SimpleFormData | null>(null);

  const handleFormSubmit = (data: SimpleFormData) => {
    setFormData(data);
    setCurrentState('acknowledgment');
  };

  const handleChatRequest = () => {
    setCurrentState('chat');
  };

  const handleDeclineChat = () => {
    // Stay on acknowledgment page
    console.log('User declined chat assistance');
  };

  const handleBackToHome = () => {
    setCurrentState('hero');
    setFormData(null);
  };

  const handleTestLLM = () => {
    setCurrentState('llm-test');
  };

  return (
    <div className="min-h-screen">
      {/* Debug button - remove in production */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleTestLLM}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
        >
          Test LLM
        </button>
      </div>

      <AnimatePresence mode="wait">
        {currentState === 'hero' && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroSection onFormSubmit={handleFormSubmit} />
          </motion.div>
        )}
        
        {currentState === 'acknowledgment' && formData && (
          <motion.div
            key="acknowledgment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AcknowledgmentPage 
              formData={formData}
              onChatRequest={handleChatRequest}
              onDeclineChat={handleDeclineChat}
            />
          </motion.div>
        )}
        
        {currentState === 'chat' && formData && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ChatInterface 
              formData={{
                ...formData,
                zipCode: formData.pincode,
                insuranceType: 'general',
                age: '30'
              }} 
              onBack={handleBackToHome} 
            />
          </motion.div>
        )}
        
        {currentState === 'llm-test' && (
          <motion.div
            key="llm-test"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LLMTest />
            <div className="fixed bottom-4 left-4">
              <button
                onClick={handleBackToHome}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;