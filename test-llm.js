import 'dotenv/config';

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || process.env.LLM_ENDPOINT || process.env.VITE_LLM_ENDPOINT || '',
  subscriptionKey: process.env.AZURE_OPENAI_SUBSCRIPTION_KEY || process.env.LLM_SUBSCRIPTION_KEY || process.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_DEPLOYMENT_NAME || process.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.LLM_MODEL_NAME || process.env.VITE_LLM_MODEL_NAME || 'gpt-4o-mini',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.LLM_API_VERSION || process.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

async function testLLM() {
  console.log('🔍 Testing LLM Configuration...\n');
  
  // Check configuration
  console.log('Configuration:');
  console.log(`- Endpoint: ${LLM_CONFIG.endpoint ? '✅ Set' : '❌ Missing'}`);
  console.log(`- Subscription Key: ${LLM_CONFIG.subscriptionKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`- Deployment Name: ${LLM_CONFIG.deploymentName ? '✅ Set' : '❌ Missing'}`);
  console.log(`- Model Name: ${LLM_CONFIG.modelName}`);
  console.log(`- API Version: ${LLM_CONFIG.apiVersion}\n`);

  if (!LLM_CONFIG.endpoint || !LLM_CONFIG.subscriptionKey) {
    console.log('❌ LLM is NOT configured properly. Missing required environment variables.');
    console.log('\nRequired environment variables:');
    console.log('- LLM_ENDPOINT or VITE_LLM_ENDPOINT');
    console.log('- LLM_SUBSCRIPTION_KEY or VITE_LLM_SUBSCRIPTION_KEY');
    console.log('- LLM_DEPLOYMENT_NAME or VITE_LLM_DEPLOYMENT_NAME (optional)');
    return false;
  }

  console.log('🧪 Testing LLM API call...\n');

  try {
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant. Respond with exactly "LLM is working!" and nothing else.' },
      { role: 'user', content: 'Test message' }
    ];

    const response = await fetch(LLM_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.subscriptionKey}`,
      },
      body: JSON.stringify({
        messages: testMessages,
        max_tokens: 50,
        temperature: 0.1,
        model: LLM_CONFIG.modelName || LLM_CONFIG.deploymentName,
      }),
    });

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ LLM API Response received successfully!');
    
    let content = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content;
    } else if (data.content) {
      content = data.content;
    } else {
      console.log('⚠️  Unexpected response format:', JSON.stringify(data, null, 2));
      return false;
    }

    console.log(`📝 LLM Response: "${content}"`);
    console.log('\n✅ LLM is working correctly!');
    return true;

  } catch (error) {
    console.log('❌ LLM API Error:', error.message);
    return false;
  }
}

// Run the test
testLLM().then(success => {
  if (success) {
    console.log('\n🎉 Your LLM integration is ready to use!');
  } else {
    console.log('\n💡 To fix LLM issues:');
    console.log('1. Check your environment variables in .env file');
    console.log('2. Verify your Azure OpenAI or LLM service credentials');
    console.log('3. Ensure your endpoint URL is correct');
    console.log('4. Check if your deployment/model name is valid');
  }
  process.exit(success ? 0 : 1);
});