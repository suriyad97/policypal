import { DatabaseService } from './databaseService.js';

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: buildAzureOpenAIEndpoint(),
  subscriptionKey: process.env.AZURE_OPENAI_SUBSCRIPTION_KEY || process.env.LLM_SUBSCRIPTION_KEY || process.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_DEPLOYMENT_NAME || process.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_MODEL_NAME || process.env.VITE_LLM_MODEL_NAME || 'gpt-4o-mini',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.LLM_API_VERSION || process.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

/**
 * Build the complete Azure OpenAI endpoint URL
 */
function buildAzureOpenAIEndpoint() {
  const baseUrl = process.env.AZURE_OPENAI_ENDPOINT || process.env.LLM_ENDPOINT || process.env.VITE_LLM_ENDPOINT || '';
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_DEPLOYMENT_NAME || process.env.VITE_LLM_DEPLOYMENT_NAME || '';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.LLM_API_VERSION || process.env.VITE_LLM_API_VERSION || '2024-02-15-preview';
  
  if (!baseUrl || !deploymentName) {
    return '';
  }
  
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Build the complete endpoint
  return `${cleanBaseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
}

export class ChatService {
  constructor(databaseService = null) {
    this.sessions = new Map();
    this.databaseService = databaseService || new DatabaseService();
    this.recommendationBatchSize = 2;
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

      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from LLM API');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error('Invalid JSON response from LLM API');
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else if (data.content) {
        return data.content;
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('LLM API Error:', error);
      throw error; // Always propagate error, never fallback
    }
  }

  /**
   * Generate system prompt based on form data and context
   */
  generateSystemPrompt(formData, customerId = null, productRecommendations = []) {
    const insuranceContext = {
      auto: `The customer is looking for auto insurance. Focus on understanding their vehicle, driving habits, current coverage gaps, and budget concerns.`,
      health: `The customer is looking for health insurance. Ask about their health needs, family coverage, preferred hospitals, and any specific medical concerns.`,
      term_life: `The customer is looking for life insurance. Understand their family situation, financial obligations, coverage goals, and beneficiary needs.`,
      home: `The customer is looking for home insurance. Learn about their property type, location risks, valuable items, and coverage preferences.`,
      savings: `The customer is interested in savings/investment plans. Understand their financial goals, risk tolerance, investment timeline, and retirement planning needs.`
    };

    const productLines = Array.isArray(productRecommendations)
      ? productRecommendations.slice(0, 3).map((product, index) => {
          const premium = typeof product.premium_amount === 'number'
            ? `₹${product.premium_amount.toLocaleString('en-IN')}/year`
            : product.premium_amount;
          const provider = product.provider_name ? ` by ${product.provider_name}` : '';
          const coverage = product.coverage_details ? ` — ${product.coverage_details}` : '';
          return `${index + 1}. ${product.product_name}${provider} (${premium})${coverage}`;
        })
      : [];

    const productsOverview = productLines.length
      ? '\nRecommended Plans:\n' + productLines.join('\n') + '\n'
      : '';

    const demographicInfo = this.extractDemographicInfo(formData);
    const ageInfo = demographicInfo.age ? ` (Age: ${demographicInfo.age})` : '';
    const genderInfo = demographicInfo.gender ? ` (Gender: ${demographicInfo.gender})` : '';

    return `You are PolicyPal, a knowledgeable and empathetic insurance advisor with 10+ years of experience. You're having a personal consultation with ${formData.name} from ${formData.zipCode}${ageInfo}${genderInfo}.

CUSTOMER PROFILE:
- Name: ${formData.name}
- Location: ${formData.zipCode}
- Insurance Need: ${formData.insuranceType}${ageInfo}${genderInfo}
${customerId ? `- Customer ID: ${customerId}` : ''}

CONSULTATION FOCUS: ${insuranceContext[formData.insuranceType] || 'The customer is looking for insurance coverage.'}
${productsOverview}
CONVERSATION GUIDELINES:
1. **Be Personal & Empathetic**: Address ${formData.name} by name, acknowledge their specific situation, and show genuine care for their needs
2. **Ask Meaningful Questions**: Go beyond basic info - understand their lifestyle, concerns, family situation, and financial priorities
3. **Educate & Simplify**: Explain insurance concepts clearly, use analogies, and help them understand what they're buying
4. **Be Consultative**: Don't just sell - genuinely help them find the right coverage for their unique situation
5. **Share Insights**: Provide valuable tips, industry knowledge, and help them avoid common mistakes
6. **Build Trust**: Be transparent about costs, limitations, and alternatives. Admit when something might not be the best fit
7. **Keep It Conversational**: Use natural language, ask follow-ups, and maintain a warm, professional tone
8. **Be Comprehensive**: Cover all aspects - coverage details, costs, claims process, exclusions, and next steps

CONVERSATION FLOW:
- Start by acknowledging their ${formData.insuranceType} insurance needs
- Ask 2-3 thoughtful questions to understand their situation better
- Provide personalized insights and recommendations
- Explain options clearly with pros/cons
- Address any concerns or questions they might have
- Guide them toward the best decision for their needs

RESPONSE STYLE:
- Keep responses 100-200 words (conversational but informative)
- Use ${formData.name}'s name occasionally to personalize
- Ask one meaningful follow-up question per response
- Include specific details about ${formData.insuranceType} insurance
- Be encouraging and supportive
- Use bullet points or short paragraphs for readability

Remember: You're not just selling insurance - you're helping ${formData.name} protect what matters most to them. Make this conversation valuable and memorable.`;
  }

  /**
   * Safely format the customer's preferred name for responses
   */
  formatName(name) {
    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    return 'there';
  }

  /**
   * Safely format the customer's location or ZIP code for responses
   */
  formatLocation(zipCode) {
    if (typeof zipCode === 'string') {
      const trimmed = zipCode.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    return 'your area';
  }

  /**
   * Convert an internal insurance type key into a user-friendly label
   */
  formatInsuranceTypeLabel(insuranceType) {
    if (typeof insuranceType !== 'string') {
      return 'insurance';
    }

    const trimmed = insuranceType.trim();
    if (!trimmed.length) {
      return 'insurance';
    }

    return trimmed.replace(/_/g, ' ');
  }

  /**
   * Initialize chat session with customer data
   */
  async initializeChat(sessionId, formData, customerId = null) {
    try {
      const context = formData ? { ...formData } : {};
      const sessionData = {
        formData: { ...context },
        history: [],
        context,
        customerId,
        productRecommendations: [],
        suggestedProductIndex: 0
      };

      await this.refreshProductRecommendations(sessionData, { force: true });
      this.sessions.set(sessionId, sessionData);

      let initialMessage;
      const systemPrompt = this.generateSystemPrompt(sessionData.context, customerId, sessionData.productRecommendations);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Hello, I would like to get started with my insurance quote.' }
      ];
      // Only use LLM, propagate error if fails
      initialMessage = await this.callLLMAPI(messages);

      if (sessionData.productRecommendations?.length) {
        initialMessage = await this.addProductRecommendations(sessionId, initialMessage, {
          includeFollowUp: true,
          count: 1
        });
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
      let session = this.sessions.get(sessionId);
      if (!session) {
        // Auto-initialize session if missing
        await this.initializeChat(sessionId, formData || {}, null);
        session = this.sessions.get(sessionId);
        if (!session) {
          throw new Error('Session not found.');
        }
      }

      let forceProductRefresh = false;
      if (formData && typeof formData === 'object') {
        const watchedFields = ['insuranceType', 'age', 'lifeAge', 'savingsAge', 'gender', 'lifeGender', 'savingsGender'];
        forceProductRefresh = watchedFields.some(field => formData[field] && formData[field] !== session.context?.[field]);
        session.formData = { ...session.formData, ...formData };
        session.context = { ...session.context, ...formData };
      }

      await this.refreshProductRecommendations(session, { force: forceProductRefresh });

      // Add user message to history
      session.history.push({ role: 'user', content: message, timestamp: new Date() });

      // Only use LLM for response, propagate error if fails
      const systemPrompt = this.generateSystemPrompt(session.context, session.customerId, session.productRecommendations);
      const conversationHistory = [
        { role: 'system', content: systemPrompt },
        ...session.history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];
      // Only use LLM, propagate error if fails
      let response = await this.callLLMAPI(conversationHistory);

      if (session.productRecommendations?.length) {
        response = await this.addProductRecommendations(sessionId, response, {
          includeFollowUp: true,
          count: 1
        });
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
   * Refresh cached product recommendations for a session
   */
  async refreshProductRecommendations(session, { force = false } = {}) {
    if (!session || !this.databaseService) {
      return;
    }

    if (!session.context?.insuranceType) {
      return;
    }

    const shouldFetch = force || !Array.isArray(session.productRecommendations) || session.productRecommendations.length === 0;

    if (!shouldFetch) {
      return;
    }

    const products = await this.fetchProductRecommendations(session.context);
    session.productRecommendations = products;
    session.suggestedProductIndex = 0;
  }

  /**
   * Fetch product recommendations using the configured database service
   */
  async fetchProductRecommendations(context = {}) {
    if (!this.databaseService || typeof this.databaseService.getInsuranceProducts !== 'function') {
      return [];
    }

    try {
      const insuranceType = context?.insuranceType
        ? (typeof this.databaseService.mapInsuranceType === 'function'
            ? this.databaseService.mapInsuranceType(context.insuranceType)
            : context.insuranceType.toLowerCase())
        : null;

      if (!insuranceType) {
        return [];
      }

      const { age, gender } = this.extractDemographicInfo(context);
      const products = await this.databaseService.getInsuranceProducts(insuranceType, age, gender);
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.warn('Unable to fetch product recommendations:', error);
      return [];
    }
  }

  /**
   * Extract demographic info from context for product filtering
   */
  extractDemographicInfo(context = {}) {
    const ageKeys = ['age', 'lifeAge', 'savingsAge', 'healthAge', 'autoAge', 'homeAge'];
    const genderKeys = ['gender', 'lifeGender', 'savingsGender', 'healthGender'];

    let age;
    for (const key of ageKeys) {
      if (context[key]) {
        age = parseInt(context[key]);
        break;
      }
    }

    let gender;
    for (const key of genderKeys) {
      if (context[key]) {
        gender = context[key].toLowerCase();
        break;
      }
    }

    return { age, gender };
  }

  /**
   * Format a product recommendation into a concise summary
   */
  formatProductSummary(product) {
    if (!product) {
      return '';
    }

    const provider = product.provider_name ? ` by ${product.provider_name}` : '';
    const premium = typeof product.premium_amount === 'number'
      ? `₹${product.premium_amount.toLocaleString('en-IN')}/year`
      : product.premium_amount;
    const coverage = product.coverage_details ? ` ${product.coverage_details}` : '';

    return `- ${product.product_name}${provider} — approx ${premium}.${coverage}`.trim();
  }

  /**
   * Retrieve the next batch of product suggestions for a session
   */
  getNextProductSuggestions(session, count) {
    if (!session || !Array.isArray(session.productRecommendations) || session.productRecommendations.length === 0) {
      return [];
    }

    const startIndex = session.suggestedProductIndex || 0;
    const suggestions = session.productRecommendations.slice(startIndex, startIndex + Math.max(1, count));
    session.suggestedProductIndex = startIndex + suggestions.length;
    return suggestions;
  }

  /**
   * Append product recommendations to a response when available
   */
  async addProductRecommendations(sessionId, baseMessage, options = {}) {
    if (!baseMessage) {
      return baseMessage;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return baseMessage;
    }

    const { includeFollowUp = true, count = this.recommendationBatchSize } = options;

    await this.refreshProductRecommendations(session);

    const suggestions = this.getNextProductSuggestions(session, count);
    if (!suggestions.length) {
      this.sessions.set(sessionId, session);
      return baseMessage;
    }

    const lines = suggestions.map(product => this.formatProductSummary(product)).filter(Boolean).join('\n');
    const intro = suggestions.length === 1
      ? 'Here is a plan that matches what you have shared so far:'
      : 'Here are a couple of plans that match what you have shared so far:';
    const followUp = includeFollowUp
      ? '\n\nWould you like me to focus on any of these or narrow things down further?'
      : '';

    const enriched = `${baseMessage}\n\n${intro}\n${lines}${followUp}`;
    this.sessions.set(sessionId, session);
    return enriched;
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

  /**
   * Check if LLM API is working
   */
  async isLLMAvailable() {
    try {
      const testMessages = [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Ping' }
      ];
      const response = await this.callLLMAPI(testMessages);
      return typeof response === 'string' && response.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Clean up old sessions every hour
setInterval(() => {
  const chatService = new ChatService();
  chatService.clearOldSessions();
}, 60 * 60 * 1000);
