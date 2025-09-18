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
      auto: `The customer is looking for auto insurance for their vehicle.`,
      health: `The customer is looking for health insurance.`,
      life: `The customer is looking for life insurance coverage.`,
      home: `The customer is looking for home insurance coverage.`
    };

    return `You are PolicyPal, a professional and friendly insurance advisor. You are helping ${formData.name} from ${formData.zipCode} with their insurance needs.

Customer Details:
- Name: ${formData.name}
- Location: ${formData.zipCode}
- Age: ${formData.age}
- Insurance Type: ${formData.insuranceType}
${customerId ? `- Customer ID: ${customerId}` : ''}

Context: ${insuranceContext[formData.insuranceType] || 'The customer is looking for insurance coverage.'}

Instructions:
1. Be professional, helpful, and knowledgeable about ${formData.insuranceType} insurance
2. Ask relevant follow-up questions to better understand their needs
3. Provide personalized recommendations
4. Explain insurance terms in simple language
5. Focus on finding the best coverage for their specific situation
6. Keep responses concise but informative (max 150 words)
7. Show empathy and build trust
8. Use a friendly, conversational tone

Start the conversation by acknowledging their ${formData.insuranceType} insurance needs and offering to help.`;
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
    const { name, insuranceType = 'insurance', zipCode } = formData;
    
    const messages = {
      auto: `Hello ${name}! 🚗 I'm PolicyPal, your personal auto insurance advisor. I see you're looking for auto insurance in ${zipCode}. I'd love to help you find the perfect coverage for your vehicle. What type of vehicle are you looking to insure?`,
      health: `Hello ${name}! 🏥 I'm PolicyPal, your personal health insurance advisor. I see you're looking for health insurance in ${zipCode}. Health coverage is so important for protecting you and your family! Are you looking for individual coverage or family coverage?`,
      life: `Hello ${name}! 🛡️ I'm PolicyPal, your personal life insurance advisor. I see you're looking for life insurance in ${zipCode}. Life insurance is such an important decision for protecting your loved ones. Are you looking for term life or whole life insurance?`,
      home: `Hello ${name}! 🏠 I'm PolicyPal, your personal home insurance advisor. I see you're looking for home insurance in ${zipCode}. I'd be happy to help! What type of property are you looking to insure - house, condo, or apartment?`
    };
    
    return messages[insuranceType] || `Hello ${name}! I'm PolicyPal, your personal insurance advisor. I'm here to help you find the right ${insuranceType} insurance coverage in ${zipCode}. What questions do you have?`;
  }

  /**
   * Generate contextual responses based on message content
   */
  generateResponse(message, context, history) {
    const lowerMessage = message.toLowerCase();
    const { name, zipCode, insuranceType = 'insurance' } = context;
    
    // Price/Cost related queries
    if (this.containsKeywords(lowerMessage, ['price', 'cost', 'premium', 'rate', 'quote', 'how much'])) {
      if (insuranceType === 'health') {
        return this.generateHealthPriceResponse(name, zipCode);
      } else if (insuranceType === 'auto') {
        return this.generateAutoPriceResponse(name, zipCode);
      } else {
        return this.generateGenericPriceResponse(name, zipCode, insuranceType);
      }
    }
    
    // Coverage related queries
    if (this.containsKeywords(lowerMessage, ['coverage', 'cover', 'benefit', 'what does', 'include'])) {
      if (insuranceType === 'health') {
        return this.generateHealthCoverageResponse(name);
      } else if (insuranceType === 'auto') {
        return this.generateAutoCoverageResponse(name);
      } else {
        return this.generateGenericCoverageResponse(name, insuranceType);
      }
    }
    
    // Claims related queries
    if (this.containsKeywords(lowerMessage, ['claim', 'claims', 'accident', 'damage', 'file'])) {
      if (insuranceType === 'health') {
        return this.generateHealthClaimsResponse(name);
      } else {
        return this.generateGenericClaimsResponse(name, insuranceType);
      }
    }
    
    // Comparison queries
    if (this.containsKeywords(lowerMessage, ['compare', 'difference', 'better', 'vs', 'versus'])) {
      return this.generateComparisonResponse(name, insuranceType);
    }
    
    // Timeline queries
    if (this.containsKeywords(lowerMessage, ['when', 'start', 'begin', 'effective', 'activate'])) {
      return this.generateTimelineResponse(name, insuranceType);
    }
    
    // Requirements queries
    if (this.containsKeywords(lowerMessage, ['need', 'require', 'document', 'information', 'details'])) {
      return this.generateRequirementsResponse(name, insuranceType);
    }
    
    // Insurance type specific responses
    if (insuranceType === 'health') {
      return this.generateHealthSpecificResponse(lowerMessage, name);
    } else if (insuranceType === 'auto') {
      return this.generateAutoSpecificResponse(lowerMessage, name);
    } else {
      return this.generateDefaultResponse(name, insuranceType);
    }
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