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

  /**
   * Generate health insurance specific responses
   */
  generateHealthSpecificResponse(message, name) {
    if (message.includes('family') || message.includes('spouse') || message.includes('children')) {
      return `${name}, family health insurance is a great choice! Family floater plans cover your entire family under one policy with shared sum insured. This is usually more economical than individual policies. How many family members would you like to include?`;
    }
    
    // Default helpful response
    return this.generateDefaultResponse('health', name);
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