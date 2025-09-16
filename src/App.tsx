import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSection } from './components/HeroSection';
import { SimpleForm, SimpleFormData } from './components/SimpleForm';
import { ChatInterface } from './components/ChatInterface';

type AppState = 'hero' | 'form' | 'chat' | 'acknowledgment';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('hero');
  const [formData, setFormData] = useState<SimpleFormData | null>(null);

  const handleGetStarted = () => {
    setCurrentState('form');
  };

  const handleFormComplete = (data: SimpleFormData) => {
    setFormData(data);
    setCurrentState('acknowledgment');
  };

  const handleChatRequest = (data: SimpleFormData) => {
    setFormData(data);
    setCurrentState('chat');
  };

  const handleBackToHero = () => {
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
            <HeroSection onGetStarted={handleGetStarted} />
          </motion.div>
        )}
        
        {currentState === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SimpleForm 
              onComplete={handleFormComplete} 
              onChatRequest={handleChatRequest}
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
              onBack={handleBackToHero} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;