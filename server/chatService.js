// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: process.env.VITE_LLM_ENDPOINT || '',
  subscriptionKey: process.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: process.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: process.env.VITE_LLM_MODEL_NAME || 'gpt-4o-mini',
  apiVersion: process.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

export class ChatService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Call LLM API for intelligent responses
   */
  async callLLMAPI(messages) {
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
  }

  /**
   * Generate system prompt based on form data and context
   */
  generateSystemPrompt(formData, customerId = null) {
    const insuranceContext = {
      health: `The customer is looking for health insurance.`,
    };

    return `You are PolicyPal, a professional and friendly insurance advisor. You are helping ${formData.name} from ${formData.zipCode} with their insurance needs.

Customer Details:
- Name: ${formData.name}
- Location: ${formData.zipCode}
- Age: ${formData.age}
- Insurance Type: health
${customerId ? `- Customer ID: ${customerId}` : ''}

Context: The customer is looking for health insurance coverage.

Instructions:
1. Be professional, helpful, and knowledgeable about health insurance
2. Ask relevant follow-up questions to better understand their needs
3. Provide personalized recommendations
4. Explain health insurance terms in simple language
5. Focus on finding the best coverage for their specific situation
6. Keep responses concise but informative (max 150 words)
7. Show empathy and build trust
8. Use a friendly, conversational tone

Start the conversation by acknowledging their health insurance needs and offering to help.`;
  }

  /**
   * Initialize chat session with customer data
   */
  async initializeChat(sessionId, formData, customerId = null) {
    try {
      // Store session data
      this.sessions.set(sessionId, {
        formData,
        history: [],
        context: formData,
        customerId
      });

      // Try to use LLM for intelligent response
      let initialMessage;
      try {
        const systemPrompt = this.generateSystemPrompt(formData, customerId);
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Hello, I would like to get started with my insurance quote.' }
        ];
        initialMessage = await this.callLLMAPI(messages);
      } catch (llmError) {
        console.warn('LLM API not available, using fallback response:', llmError);
        // Fallback to rule-based response
        initialMessage = this.generateInitialMessage(formData);
      }
      
      // Add to session history
      const session = this.sessions.get(sessionId);
      session.history.push({ role: 'assistant', content: initialMessage, timestamp: new Date() });
      this.sessions.set(sessionId, session);

      return initialMessage;
    } catch (error) {
      console.error('Error in initializeChat:', error);
      throw error;
    }
  }

  /**
   * Handle incoming chat messages
   */
  async handleMessage(sessionId, message, formData = null) {
    try {
      // Get session data
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found. Please refresh and try again.');
      }

      // Add user message to history
      session.history.push({ role: 'user', content: message, timestamp: new Date() });

      // Try to use LLM for intelligent response
      let response;
      try {
        const systemPrompt = this.generateSystemPrompt(session.context, session.customerId);
        const conversationHistory = [
          { role: 'system', content: systemPrompt },
          ...session.history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        ];
        response = await this.callLLMAPI(conversationHistory);
      } catch (llmError) {
        console.warn('LLM API failed, using rule-based response:', llmError);
        // Fallback to rule-based response
        response = this.generateResponse(message, session.context, session.history);
      }

      // Add bot response to history
      session.history.push({ role: 'assistant', content: response, timestamp: new Date() });

      // Update session
      this.sessions.set(sessionId, session);

      return response;
    } catch (error) {
      console.error('Error in handleMessage:', error);
      throw error;
    }
  }

  /**
   * Generate initial welcome message based on form data
   */
  generateInitialMessage(formData) {
    const { name, insuranceType, zipCode } = formData;
    
    return `Hello ${name}! 🏥 I'm PolicyPal, your personal health insurance advisor. I see you're looking for health insurance in ${zipCode}. Health coverage is so important for protecting you and your family! Are you looking for individual coverage or family coverage? I'm here to help you find the perfect health insurance plan that fits your needs and budget.`;
  }

  /**
   * Generate contextual responses based on message content
   */
  generateResponse(message, context, history) {
    const lowerMessage = message.toLowerCase();
    const { name, zipCode } = context;
    const insuranceType = 'health';
    
    // Price/Cost related queries
    if (this.containsKeywords(lowerMessage, ['price', 'cost', 'premium', 'rate', 'quote', 'how much'])) {
      return this.generateHealthPriceResponse(name, zipCode);
    }
    
    // Coverage related queries
    if (this.containsKeywords(lowerMessage, ['coverage', 'cover', 'benefit', 'what does', 'include'])) {
      return this.generateHealthCoverageResponse(name);
    }
    
    // Claims related queries
    if (this.containsKeywords(lowerMessage, ['claim', 'claims', 'accident', 'damage', 'file'])) {
      return this.generateHealthClaimsResponse(name);
    }
    
    // Comparison queries
    if (this.containsKeywords(lowerMessage, ['compare', 'difference', 'better', 'vs', 'versus'])) {
      return this.generateHealthComparisonResponse(name);
    }
    
    // Timeline queries
    if (this.containsKeywords(lowerMessage, ['when', 'start', 'begin', 'effective', 'activate'])) {
      return this.generateHealthTimelineResponse(name);
    }
    
    // Requirements queries
    if (this.containsKeywords(lowerMessage, ['need', 'require', 'document', 'information', 'details'])) {
      return this.generateHealthRequirementsResponse(name);
    }
    
    // Health insurance specific responses
    return this.generateHealthSpecificResponse(lowerMessage, name);
  }

  /**
   * Generate health insurance price responses
   */
  generateHealthPriceResponse(name, zipCode) {
    return `${name}, health insurance premiums vary based on age, coverage, and location. In ${zipCode}, individual plans typically start from ₹8,000 annually, while family floater plans range from ₹12,000 to ₹25,000. Factors affecting pricing include age, pre-existing conditions, sum insured, and hospital network. Would you like me to find plans that fit your budget and coverage needs?`;
  }

  /**
   * Generate health insurance coverage responses
   */
  generateHealthCoverageResponse(name) {
    return `${name}, health insurance coverage includes: hospitalization expenses, pre and post hospitalization (30-60 days), day-care procedures, ambulance charges, and cashless treatment at network hospitals. Many plans also include wellness benefits, preventive checkups, and coverage for critical illnesses. What specific health concerns or treatments do you want covered?`;
  }

  /**
   * Generate health insurance claims responses
   */
  generateHealthClaimsResponse(name) {
    return `${name}, health insurance claims are processed in two ways: cashless (direct settlement with hospital) and reimbursement. For cashless claims, show your health card at network hospitals. For reimbursement, submit bills within 30 days. Most cashless claims are approved within 2-4 hours, and reimbursement claims take 7-15 days. Have you had experience with health insurance claims before?`;
  }

  /**
   * Generate health insurance comparison responses
   */
  generateHealthComparisonResponse(name) {
    return `${name}, that's smart! I can help you compare health insurance plans based on: premium costs, sum insured, hospital network size, claim settlement ratio, waiting periods, and coverage benefits. Each insurer has strengths - some have larger hospital networks, others offer better critical illness coverage. Would you like me to show you a comparison of top health insurers?`;
  }

  /**
   * Generate health insurance timeline responses
   */
  generateHealthTimelineResponse(name) {
    return `${name}, health insurance policies typically become effective immediately for accidents, but have waiting periods for illnesses: 30 days for most illnesses, 2-4 years for pre-existing conditions, and 9 months to 4 years for maternity benefits. Emergency coverage starts from day one. Would you like to start your application today?`;
  }

  /**
   * Generate health insurance requirements responses
   */
  generateHealthRequirementsResponse(name) {
    return `${name}, for health insurance, you'll typically need: age proof, address proof, income proof, and medical checkup reports (usually required for sum insured above ₹5 lakhs or age above 45). For family plans, you'll need documents for all members. Most documents can be uploaded digitally. Do you have these documents readily available?`;
  }
    
    // Default helpful response
    return this.generateDefaultResponse(insuranceType, name);
  }

  /**
   * Check if message contains any of the specified keywords
   */
  containsKeywords(message, keywords) {
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Generate health insurance specific responses
   */
  generateHealthSpecificResponse(message, name) {
    if (message.includes('family') || message.includes('spouse') || message.includes('children')) {
      return `${name}, family health insurance is a great choice! Family floater plans cover your entire family under one policy with shared sum insured. This is usually more economical than individual policies. How many family members would you like to include, and what's your preferred sum insured amount?`;
    }
    
    if (message.includes('individual') || message.includes('personal') || message.includes('myself')) {
      return `${name}, individual health insurance gives you dedicated coverage with your own sum insured. This ensures your coverage isn't shared with others. What sum insured are you considering, and do you have any specific health concerns or preferred hospitals?`;
    }
    
    if (message.includes('pre-existing') || message.includes('medical condition') || message.includes('diabetes') || message.includes('hypertension')) {
      return `${name}, pre-existing conditions are covered after waiting periods (typically 2-4 years). Some insurers offer shorter waiting periods or immediate coverage for certain conditions. It's important to declare all conditions honestly. What specific conditions are you concerned about?`;
    }
    
    if (message.includes('hospital') || message.includes('network') || message.includes('cashless')) {
      return `${name}, network hospitals are crucial for cashless treatment. Most insurers have 5,000+ network hospitals across India. You can get treatment without paying upfront at these hospitals. Would you like me to check which hospitals in your area are covered by different insurers?`;
    }
    
    return `${name}, health insurance is one of the most important investments you can make. With rising medical costs, having good health coverage gives you peace of mind and financial protection. What specific aspect of health insurance would you like to know more about?`;
  }

  /**
   * Generate default helpful response
   */
  generateDefaultResponse(insuranceType, name) {
    return `${name}, I'm here to help you with all aspects of health insurance! Whether you want to know about coverage options, pricing, claims process, network hospitals, or need help choosing the right policy, I've got you covered. What specific information about health insurance would be most helpful for you right now?`;
  }

  /**
   * Get session data
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Clear old sessions (cleanup)
   */
  clearOldSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = session.history[session.history.length - 1]?.timestamp;
      if (lastActivity && lastActivity < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Clean up old sessions every hour
setInterval(() => {
  const chatService = new ChatService();
  chatService.clearOldSessions();
}, 60 * 60 * 1000);