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
      auto: `The customer is looking for auto insurance.`,
      health: `The customer is looking for health insurance.`,
      term_life: `The customer is looking for term life insurance.`,
      term: `The customer is looking for term life insurance.`,
      savings: `The customer is looking for a savings plan.`,
      home: `The customer is looking for home insurance.`
    };

    return `You are PolicyPal, a professional and friendly insurance advisor. You are helping ${formData.name} from ${formData.zipCode} with their insurance needs.

Customer Details:
- Name: ${formData.name}
- Location: ${formData.zipCode}
- Age: ${formData.age}
- Insurance Type: ${formData.insuranceType}
${customerId ? `- Customer ID: ${customerId}` : ''}

Context: ${insuranceContext[formData.insuranceType] || 'General insurance inquiry.'}

Instructions:
1. Be professional, helpful, and knowledgeable about insurance
2. Ask relevant follow-up questions to better understand their needs
3. Provide personalized recommendations
4. Explain insurance terms in simple language
5. Focus on finding the best coverage for their specific situation
6. Keep responses concise but informative (max 150 words)
7. Show empathy and build trust
8. Use a friendly, conversational tone

Start the conversation by acknowledging their specific insurance needs and offering to help.`;
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
    
    const messages = {
      auto: `Hello ${name}! 🚗 I'm PolicyPal, your personal insurance advisor. I see you're looking for auto insurance in ${zipCode}. I'd love to help you find the perfect coverage for your vehicle. What specific questions do you have about auto insurance?`,
      
      car: `Hello ${name}! 🚗 I'm PolicyPal, your personal insurance advisor. I see you're looking for car insurance in ${zipCode}. I'd love to help you find the perfect coverage for your vehicle. What specific questions do you have about car insurance?`,
      
      home: `Hello ${name}! 🏠 I'm PolicyPal, your personal insurance advisor. I see you're looking for home insurance in ${zipCode}. Great choice for protecting your property! What type of home coverage are you most interested in?`,
      
      health: `Hello ${name}! 🏥 I'm PolicyPal, your personal insurance advisor. I see you're looking for health insurance in ${zipCode}. Health coverage is so important! Are you looking for individual coverage or family coverage?`,
      
      term: `Hello ${name}! 🛡️ I'm PolicyPal, your personal insurance advisor. I see you're looking for term life insurance in ${zipCode}. Life insurance is such an important decision for protecting your loved ones. What coverage amount are you considering?`,
      
      term_life: `Hello ${name}! 🛡️ I'm PolicyPal, your personal insurance advisor. I see you're looking for term life insurance in ${zipCode}. Life insurance is such an important decision for protecting your loved ones. What coverage amount are you considering?`,
      
      savings: `Hello ${name}! 💰 I'm PolicyPal, your personal insurance advisor. I see you're looking for savings plans in ${zipCode}. Building wealth through insurance is a smart strategy! What are your main financial goals?`,
      
      business: `Hello ${name}! 💼 I'm PolicyPal, your personal insurance advisor. I see you're looking for business insurance in ${zipCode}. Protecting your business is crucial! What type of business do you operate?`
    };
    
    return messages[insuranceType?.toLowerCase()] || 
           `Hello ${name}! 👋 I'm PolicyPal, your personal insurance advisor. I'm here to help you find the right insurance coverage in ${zipCode}. What questions can I answer for you today?`;
  }

  /**
   * Generate contextual responses based on message content
   */
  generateResponse(message, context, history) {
    const lowerMessage = message.toLowerCase();
    const { insuranceType, name, zipCode } = context;
    
    // Price/Cost related queries
    if (this.containsKeywords(lowerMessage, ['price', 'cost', 'premium', 'rate', 'quote', 'how much'])) {
      return this.generatePriceResponse(insuranceType, name, zipCode);
    }
    
    // Coverage related queries
    if (this.containsKeywords(lowerMessage, ['coverage', 'cover', 'benefit', 'what does', 'include'])) {
      return this.generateCoverageResponse(insuranceType, name);
    }
    
    // Claims related queries
    if (this.containsKeywords(lowerMessage, ['claim', 'claims', 'accident', 'damage', 'file'])) {
      return this.generateClaimsResponse(insuranceType, name);
    }
    
    // Comparison queries
    if (this.containsKeywords(lowerMessage, ['compare', 'difference', 'better', 'vs', 'versus'])) {
      return this.generateComparisonResponse(insuranceType, name);
    }
    
    // Timeline queries
    if (this.containsKeywords(lowerMessage, ['when', 'start', 'begin', 'effective', 'activate'])) {
      return this.generateTimelineResponse(insuranceType, name);
    }
    
    // Requirements queries
    if (this.containsKeywords(lowerMessage, ['need', 'require', 'document', 'information', 'details'])) {
      return this.generateRequirementsResponse(insuranceType, name);
    }
    
    // Insurance type specific responses
    if (insuranceType === 'auto' || insuranceType === 'car') {
      return this.generateAutoSpecificResponse(lowerMessage, name);
    }
    
    if (insuranceType === 'health') {
      return this.generateHealthSpecificResponse(lowerMessage, name);
    }
    
    if (insuranceType === 'term_life' || insuranceType === 'term') {
      return this.generateLifeSpecificResponse(lowerMessage, name);
    }
    
    if (insuranceType === 'savings') {
      return this.generateSavingsSpecificResponse(lowerMessage, name);
    }
    
    if (insuranceType === 'home') {
      return this.generateHomeSpecificResponse(lowerMessage, name);
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
   * Generate price-related responses
   */
  generatePriceResponse(insuranceType, name, zipCode) {
    const responses = {
      auto: `Great question about pricing, ${name}! Auto insurance rates in ${zipCode} typically range from ₹5,000 to ₹15,000 annually, depending on your vehicle, driving history, and coverage level. I can help you get personalized quotes from multiple insurers. Would you like me to show you some specific options?`,
      
      health: `${name}, health insurance premiums vary based on age, coverage, and location. In ${zipCode}, individual plans typically start from ₹8,000 annually, while family floater plans range from ₹12,000 to ₹25,000. Would you like me to find plans that fit your budget?`,
      
      term_life: `${name}, term life insurance is very affordable! Based on your profile, premiums typically start from ₹6,000 annually for ₹10 lakh coverage. The exact rate depends on your age, health, and coverage amount. Shall I show you some specific term life options?`,
      
      savings: `${name}, our savings plans offer flexible premium options starting from ₹2,500 monthly. The returns and benefits depend on your investment goals and time horizon. Would you like me to explain the different savings plan options available?`,
      
      home: `${name}, home insurance in ${zipCode} typically costs ₹3,000 to ₹8,000 annually, depending on your property value and coverage needs. This is a small price for protecting your biggest investment! Would you like a personalized quote?`
    };
    
    return responses[insuranceType] || 
           `${name}, insurance pricing varies based on many factors including your specific needs and location in ${zipCode}. I'd be happy to get you personalized quotes from multiple insurers. What specific coverage are you most interested in?`;
  }

  /**
   * Generate coverage-related responses
   */
  generateCoverageResponse(insuranceType, name) {
    const responses = {
      auto: `${name}, comprehensive auto insurance typically includes: liability coverage (mandatory), collision coverage, comprehensive coverage for theft/natural disasters, personal accident cover, and roadside assistance. Would you like me to explain any of these in detail?`,
      
      health: `${name}, health insurance coverage includes: hospitalization expenses, pre and post hospitalization, day-care procedures, ambulance charges, and cashless treatment at network hospitals. Many plans also include wellness benefits. What specific health concerns do you want covered?`,
      
      term_life: `${name}, term life insurance provides: death benefit to nominees, terminal illness benefit, accidental death benefit, and premium waiver on disability. It's pure protection with no investment component. Would you like to know about the claim process?`,
      
      savings: `${name}, savings plans combine insurance with investment, offering: life cover, guaranteed returns, tax benefits under 80C, maturity benefits, and flexible premium payment options. What are your primary financial goals?`,
      
      home: `${name}, home insurance covers: building structure, contents/belongings, natural disasters, theft/burglary, public liability, and temporary accommodation expenses. Some plans also include personal accident cover. What aspects of your home are you most concerned about?`
    };
    
    return responses[insuranceType] || 
           `${name}, insurance coverage varies by policy type. I'd be happy to explain the specific benefits and coverage details for the insurance you're interested in. What particular aspect would you like to know more about?`;
  }

  /**
   * Generate claims-related responses
   */
  generateClaimsResponse(insuranceType, name) {
    return `${name}, our claims process is designed to be simple and fast! You can file claims online, through our mobile app, or by calling our 24/7 helpline. Most ${insuranceType} claims are processed within 24-48 hours for cashless services, and reimbursement claims typically take 7-10 days. We also provide claim assistance to guide you through the process. Have you had to file insurance claims before?`;
  }

  /**
   * Generate comparison responses
   */
  generateComparisonResponse(insuranceType, name) {
    return `${name}, that's a smart approach! I can help you compare different ${insuranceType} insurance options based on coverage, premium, claim settlement ratio, network hospitals/garages, and customer service ratings. Each insurer has unique strengths - some excel in customer service, others in claim settlement speed. Would you like me to show you a comparison of top insurers for ${insuranceType} insurance?`;
  }

  /**
   * Generate timeline responses
   */
  generateTimelineResponse(insuranceType, name) {
    return `${name}, most insurance policies can start as soon as tomorrow! Once you choose a plan and complete the application, ${insuranceType} insurance typically becomes effective within 24 hours for online purchases. Some policies may have waiting periods for specific benefits, which I'll explain when showing you options. Would you like to start the application process today?`;
  }

  /**
   * Generate requirements responses
   */
  generateRequirementsResponse(insuranceType, name) {
    const requirements = {
      auto: 'vehicle registration certificate, driving license, previous insurance policy (if any), and vehicle photos',
      health: 'age proof, address proof, income proof, and medical checkup reports (if required)',
      term_life: 'age proof, income proof, medical checkup, and nominee details',
      savings: 'age proof, address proof, income proof, and bank account details',
      home: 'property documents, previous insurance policy (if any), and property valuation'
    };
    
    const docs = requirements[insuranceType] || 'basic identity and address documents';
    return `${name}, for ${insuranceType} insurance, you'll typically need: ${docs}. Don't worry - I'll guide you through the entire process and help you gather everything needed. Most documents can be uploaded digitally. Do you have these documents readily available?`;
  }

  /**
   * Generate auto-specific responses
   */
  generateAutoSpecificResponse(message, name) {
    if (message.includes('vehicle') || message.includes('car') || message.includes('bike')) {
      return `${name}, I'd be happy to help with your vehicle insurance! Whether it's a car, bike, or commercial vehicle, we have specialized coverage options. What type of vehicle are you looking to insure, and do you have any specific concerns about coverage?`;
    }
    return `${name}, for auto insurance, I can help you with comprehensive coverage, third-party liability, add-on covers like zero depreciation, engine protection, and roadside assistance. What specific aspect of auto insurance interests you most?`;
  }

  /**
   * Generate health-specific responses
   */
  generateHealthSpecificResponse(message, name) {
    if (message.includes('family') || message.includes('spouse') || message.includes('children')) {
      return `${name}, family health insurance is a great choice! Family floater plans cover your entire family under one policy with shared sum insured. This is usually more economical than individual policies. How many family members would you like to include?`;
    }
    return `${name}, health insurance is one of the most important investments you can make. With rising medical costs, having good health coverage gives you peace of mind. Are you looking for basic hospitalization coverage or comprehensive health protection?`;
  }

  /**
   * Generate life insurance specific responses
   */
  generateLifeSpecificResponse(message, name) {
    if (message.includes('family') || message.includes('children') || message.includes('spouse')) {
      return `${name}, term life insurance is the best way to ensure your family's financial security. The coverage amount should typically be 10-15 times your annual income. This ensures your family can maintain their lifestyle and meet financial goals even in your absence. What's your primary concern for your family's future?`;
    }
    return `${name}, term life insurance provides maximum coverage at minimum cost. It's pure protection - if something happens to you, your nominees receive the full sum assured. The earlier you start, the lower your premiums. What coverage amount are you considering?`;
  }

  /**
   * Generate savings-specific responses
   */
  generateSavingsSpecificResponse(message, name) {
    if (message.includes('retirement') || message.includes('future') || message.includes('goal')) {
      return `${name}, savings plans are excellent for long-term wealth creation! They combine life insurance with systematic savings, offering guaranteed returns plus tax benefits. Whether it's retirement planning, child's education, or buying a home, we can structure a plan to meet your specific goals. What's your primary financial objective?`;
    }
    return `${name}, savings plans offer the dual benefit of protection and wealth creation. With guaranteed returns and tax benefits under Section 80C, they're a smart way to build your financial future. What's your investment timeline and risk appetite?`;
  }

  /**
   * Generate home-specific responses
   */
  generateHomeSpecificResponse(message, name) {
    if (message.includes('apartment') || message.includes('house') || message.includes('property')) {
      return `${name}, protecting your home is protecting your biggest investment! Home insurance covers both the structure and contents, plus provides liability protection. Whether you own a house, apartment, or are renting, we have suitable coverage options. What type of property are you looking to insure?`;
    }
    return `${name}, home insurance is often overlooked but incredibly important. It protects against natural disasters, theft, fire, and even provides temporary accommodation if your home becomes uninhabitable. Given the increasing frequency of natural disasters, it's becoming essential. What aspects of home protection concern you most?`;
  }

  /**
   * Generate default helpful response
   */
  generateDefaultResponse(insuranceType, name) {
    return `${name}, I'm here to help you with all aspects of ${insuranceType} insurance! Whether you want to know about coverage options, pricing, claims process, or need help choosing the right policy, I've got you covered. What specific information would be most helpful for you right now?`;
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