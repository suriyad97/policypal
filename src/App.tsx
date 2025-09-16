import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSection, SimpleFormData } from './components/HeroSection';
import { AcknowledgmentPage } from './components/AcknowledgmentPage';
import { ChatInterface } from './components/ChatInterface';

type AppState = 'hero' | 'acknowledgment' | 'chat';

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

  return (
    <div className="min-h-screen">
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
      </AnimatePresence>
    </div>
  );
}

export default App;