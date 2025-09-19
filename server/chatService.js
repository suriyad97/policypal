import { DatabaseService } from './databaseService.js';

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || process.env.LLM_ENDPOINT || process.env.VITE_LLM_ENDPOINT || '',
  subscriptionKey: process.env.AZURE_OPENAI_SUBSCRIPTION_KEY || process.env.LLM_SUBSCRIPTION_KEY || process.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_DEPLOYMENT_NAME || process.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_MODEL_NAME || process.env.VITE_LLM_MODEL_NAME || 'gpt-4o-mini',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.LLM_API_VERSION || process.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

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
      auto: `The customer is looking for auto insurance for their vehicle.`,
      health: `The customer is looking for health insurance.`,
      term_life: `The customer is looking for life insurance coverage.`,
      home: `The customer is looking for home insurance coverage.`
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

    return `You are PolicyPal, a professional and friendly insurance advisor. You are helping ${formData.name} from ${formData.zipCode} with their insurance needs.

Customer Details:
- Name: ${formData.name}
- Insurance Type: ${formData.insuranceType}
${customerId ? `- Customer ID: ${customerId}` : ''}

Context: ${insuranceContext[formData.insuranceType] || 'The customer is looking for insurance coverage.'}
${productsOverview}
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
   * Generate initial welcome message based on form data
   */
  generateInitialMessage(formData = {}) {
    const { name = 'there', insuranceType = 'insurance', zipCode = 'your area' } = formData;
    
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
    const details = context || {};
    const typeKey = typeof details.insuranceType === 'string' && details.insuranceType.trim()
      ? details.insuranceType.trim()
      : 'insurance';
    const displayName = this.formatName(details.name);
    const displayZip = this.formatLocation(details.zipCode);
    const typeLabel = this.formatInsuranceTypeLabel(typeKey);

    // Price/Cost related queries
    if (this.containsKeywords(lowerMessage, ['price', 'cost', 'premium', 'rate', 'quote', 'how much'])) {
      if (typeKey === 'health') {
        return this.generateHealthPriceResponse(displayName, displayZip);
      } else if (typeKey === 'auto') {
        return this.generateAutoPriceResponse(displayName, displayZip);
      } else {
        return this.generateGenericPriceResponse(displayName, displayZip, typeLabel);
      }
    }

    // Coverage related queries
    if (this.containsKeywords(lowerMessage, ['coverage', 'cover', 'benefit', 'what does', 'include'])) {
      if (typeKey === 'health') {
        return this.generateHealthCoverageResponse(displayName);
      } else if (typeKey === 'auto') {
        return this.generateAutoCoverageResponse(displayName);
      } else {
        return this.generateGenericCoverageResponse(displayName, typeLabel);
      }
    }

    // Claims related queries
    if (this.containsKeywords(lowerMessage, ['claim', 'claims', 'accident', 'damage', 'file'])) {
      if (typeKey === 'health') {
        return this.generateHealthClaimsResponse(displayName);
      } else {
        return this.generateGenericClaimsResponse(displayName, typeLabel);
      }
    }

    // Comparison queries
    if (this.containsKeywords(lowerMessage, ['compare', 'difference', 'better', 'vs', 'versus'])) {
      return this.generateComparisonResponse(displayName, typeLabel);
    }

    // Timeline queries
    if (this.containsKeywords(lowerMessage, ['when', 'start', 'begin', 'effective', 'activate'])) {
      if (typeKey === 'health') {
        return this.generateHealthTimelineResponse(displayName);
      }
      return this.generateTimelineResponse(displayName, typeKey);
    }

    // Requirements queries
    if (this.containsKeywords(lowerMessage, ['need', 'require', 'document', 'information', 'details'])) {
      if (typeKey === 'health') {
        return this.generateHealthRequirementsResponse(displayName);
      }
      return this.generateRequirementsResponse(displayName, typeKey);
    }

    // Insurance type specific responses
    if (typeKey === 'health') {
      return this.generateHealthSpecificResponse(lowerMessage, displayName);
    } else if (typeKey === 'auto') {
      return this.generateAutoSpecificResponse(lowerMessage, displayName);
    } else {
      return this.generateDefaultResponse(displayName, typeLabel);
    }
  }

  /**
   * Generate default response for other insurance types
   */
  generateDefaultResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);
    return `${safeName}, I'm here to help you with your ${label} insurance needs. Could you please share more details about what you're looking for or any specific questions you have?`;
  }

  /**
   * Generate auto insurance pricing guidance
   */
  generateAutoPriceResponse(name, zipCode) {
    const safeName = this.formatName(name);
    const safeZip = this.formatLocation(zipCode);
    return `${safeName}, comprehensive auto plans in ${safeZip} usually range from ₹5,000 to ₹18,000 annually depending on the car's age, claim history, and add-ons like zero depreciation or roadside assistance. Share your vehicle make, model year, and daily usage so I can narrow the estimate and line up tailored quotes.`;
  }

  /**
   * Generate generic insurance pricing guidance
   */
  generateGenericPriceResponse(name, zipCode, insuranceType) {
    const safeName = this.formatName(name);
    const safeZip = this.formatLocation(zipCode);
    const label = this.formatInsuranceTypeLabel(insuranceType);
    return `${safeName}, ${label} pricing in ${safeZip} depends on the coverage amount, your risk profile, and any riders you choose. Let me know the protection level you expect and your budget guardrails so I can shortlist the most relevant plans.`;
  }

  /**
   * Generate auto insurance coverage guidance
   */
  generateAutoCoverageResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, a well-rounded auto policy combines third-party liability, own-damage cover, personal accident protection, and add-ons such as zero depreciation, engine safeguard, and roadside assistance. Which of these matter most so I can focus on plans that fit you?`;
  }

  /**
   * Generate generic insurance coverage guidance
   */
  generateGenericCoverageResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);
    return `${safeName}, ${label} coverage can be tailored across core benefits, optional riders, and service perks. Tell me the situations you most want covered so I can align the coverage structure accordingly.`;
  }

  /**
   * Generate generic insurance claims guidance
   */
  generateGenericClaimsResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);
    return `${safeName}, ${label} claims typically start with quick intimation, digital document upload, and insurer verification. Straightforward cases close within 3-5 working days, faster when we opt for cashless networks. Have you filed a claim before or should I walk through each step?`;
  }

  /**
   * Generate comparison guidance across insurers
   */
  generateComparisonResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);
    return `${safeName}, happy to compare ${label} providers. I usually weigh premium, coverage breadth, claim settlement ratio, service quality, and rider flexibility. Share your top priorities and I'll line up a clear short list.`;
  }

  /**
   * Generate timeline guidance for policy activation
   */
  generateTimelineResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);

    switch (insuranceType) {
      case 'auto':
        return `${safeName}, auto policies can activate within a few hours once we submit vehicle details and inspection photos. Renewals without a break go live almost instantly. Should I outline the upload steps for you?`;
      case 'home':
        return `${safeName}, home insurance typically starts within 24-48 hours after valuation confirmation. If there's a home loan, we can match the activation date to the lender's requirement. When would you like coverage to begin?`;
      case 'term_life':
        return `${safeName}, term life issuance usually takes 2-5 days after eKYC and any required medicals. The sooner we finish the health questionnaire, the faster we can lock in protection. Are weekdays or weekends better for a quick health check?`;
      default:
        return `${safeName}, ${label} policies usually activate once payment is received and documents are verified - generally within 1-2 business days. If you have a target start date, let me know so I can align the steps.`;
    }
  }

  /**
   * Generate documentation requirements guidance
   */
  generateRequirementsResponse(name, insuranceType) {
    const safeName = this.formatName(name);
    const label = this.formatInsuranceTypeLabel(insuranceType);

    switch (insuranceType) {
      case 'auto':
        return `${safeName}, for auto coverage you'll typically need the vehicle registration, previous policy (if any), inspection photos, and standard ID/address proof. I can send a quick checklist and help you upload everything from your phone. Shall I do that?`;
      case 'home':
        return `${safeName}, home insurers usually ask for property ownership proof, ID/address documents, and sometimes valuation or loan papers. A short inventory of valuables helps if you want contents cover - would you like a template for that?`;
      case 'term_life':
        return `${safeName}, term life applications require PAN, address proof, income proof, and a brief medical questionnaire. Depending on the cover amount, a nurse visit or medical centre check-up might be scheduled. Are those documents handy?`;
      default:
        return `${safeName}, for ${label} policies you'll need standard KYC (ID and address proof) plus any supporting documents for add-on benefits. Once I know the plan you're leaning toward I can send a personalised checklist.`;
    }
  }

  /**
   * Generate auto-specific follow-up questions
   */
  generateAutoSpecificResponse(message, name) {
    const safeName = this.formatName(name);

    if (message.includes('no claim bonus') || message.includes('ncb')) {
      return `${safeName}, protecting your no-claim bonus can cut premiums by up to 50%. If you're switching insurers we can transfer it with a simple certificate - want me to arrange that?`;
    }

    if (message.includes('zero dep') || message.includes('zero-dep') || message.includes('add-on')) {
      return `${safeName}, add-ons like zero depreciation, engine protection, or return-to-invoice are great for newer cars. Let me know your vehicle age and I'll highlight the add-ons worth paying for.`;
    }

    if (message.includes('idv') || message.includes('insured declared value')) {
      return `${safeName}, the insured declared value (IDV) is the maximum payout for total loss. Setting it near the current market value keeps claims fair without overpaying premium. Want me to estimate the right IDV for your car?`;
    }

    if (message.includes('renew')) {
      return `${safeName}, renewals are quick - share your expiring policy and current odometer reading, and we can issue a fresh policy today. Have you had any gaps in coverage I should know about?`;
    }

    return `${safeName}, tell me a bit about your daily driving, parking spot, and any accessories you rely on. That helps me tailor coverage and discounts that will actually benefit you.`;
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
        age = context[key];
        break;
      }
    }

    let gender;
    for (const key of genderKeys) {
      if (context[key]) {
        gender = context[key];
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
   * Generate health insurance price responses
   */
  generateHealthPriceResponse(name, zipCode) {
    const safeName = this.formatName(name);
    const safeZip = this.formatLocation(zipCode);
    return `${safeName}, health insurance premiums vary based on age, coverage, and location. In ${safeZip}, individual plans typically start from ₹8,000 annually, while family floater plans range from ₹12,000 to ₹25,000. Factors affecting pricing include age, pre-existing conditions, sum insured, and hospital network. Would you like me to find plans that fit your budget and coverage needs?`;
  }

  /**
   * Generate health insurance coverage responses
   */
  generateHealthCoverageResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, health insurance coverage includes: hospitalization expenses, pre and post hospitalization (30-60 days), day-care procedures, ambulance charges, and cashless treatment at network hospitals. Many plans also include wellness benefits, preventive checkups, and coverage for critical illnesses. What specific health concerns or treatments do you want covered?`;
  }

  /**
   * Generate health insurance claims responses
   */
  generateHealthClaimsResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, health insurance claims are processed in two ways: cashless (direct settlement with hospital) and reimbursement. For cashless claims, show your health card at network hospitals. For reimbursement, submit bills within 30 days. Most cashless claims are approved within 2-4 hours, and reimbursement claims take 7-15 days. Have you had experience with health insurance claims before?`;
  }

  /**
   * Generate health insurance comparison responses
   */
  generateHealthComparisonResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, that's smart! I can help you compare health insurance plans based on: premium costs, sum insured, hospital network size, claim settlement ratio, waiting periods, and coverage benefits. Each insurer has strengths - some have larger hospital networks, others offer better critical illness coverage. Would you like me to show you a comparison of top health insurers?`;
  }

  /**
   * Generate health insurance timeline responses
   */
  generateHealthTimelineResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, health insurance policies typically become effective immediately for accidents, but have waiting periods for illnesses: 30 days for most illnesses, 2-4 years for pre-existing conditions, and 9 months to 4 years for maternity benefits. Emergency coverage starts from day one. Would you like to start your application today?`;
  }

  /**
   * Generate health insurance requirements responses
   */
  generateHealthRequirementsResponse(name) {
    const safeName = this.formatName(name);
    return `${safeName}, for health insurance, you'll typically need: age proof, address proof, income proof, and medical checkup reports (usually required for sum insured above ₹5 lakhs or age above 45). For family plans, you'll need documents for all members. Most documents can be uploaded digitally. Do you have these documents readily available?`;
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
    const safeName = this.formatName(name);

    if (message.includes('family') || message.includes('spouse') || message.includes('children')) {
      return `${safeName}, family health insurance is a great choice! Family floater plans cover your entire family under one policy with shared sum insured. This is usually more economical than individual policies. How many family members would you like to include, and what's your preferred sum insured amount?`;
    }

    if (message.includes('individual') || message.includes('personal') || message.includes('myself')) {
      return `${safeName}, individual health insurance gives you dedicated coverage with your own sum insured. This ensures your coverage isn't shared with others. What sum insured are you considering, and do you have any specific health concerns or preferred hospitals?`;
    }

    if (message.includes('pre-existing') || message.includes('medical condition') || message.includes('diabetes') || message.includes('hypertension')) {
      return `${safeName}, pre-existing conditions are covered after waiting periods (typically 2-4 years). Some insurers offer shorter waiting periods or immediate coverage for certain conditions. It's important to declare all conditions honestly. What specific conditions are you concerned about?`;
    }

    if (message.includes('hospital') || message.includes('network') || message.includes('cashless')) {
      return `${safeName}, network hospitals are crucial for cashless treatment. Most insurers have 5,000+ network hospitals across India. You can get treatment without paying upfront at these hospitals. Would you like me to check which hospitals in your area are covered by different insurers?`;
    }

    return `${safeName}, health insurance is one of the most important investments you can make. With rising medical costs, having good health coverage gives you peace of mind and financial protection. What specific aspect of health insurance would you like to know more about?`;
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
