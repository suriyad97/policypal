import 'dotenv/config';

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

async function testLLM() {
  console.log('🔍 Testing LLM Configuration...\n');
  
  // Check configuration
  console.log('Configuration:');
  console.log(`- Endpoint: ${LLM_CONFIG.endpoint ? '✅ Set' : '❌ Missing'} ${LLM_CONFIG.endpoint ? `(${LLM_CONFIG.endpoint})` : ''}`);
  console.log(`- Subscription Key: ${LLM_CONFIG.subscriptionKey ? '✅ Set' : '❌ Missing'} ${LLM_CONFIG.subscriptionKey ? `(${LLM_CONFIG.subscriptionKey.substring(0, 8)}...)` : ''}`);
  console.log(`- Deployment Name: ${LLM_CONFIG.deploymentName ? '✅ Set' : '❌ Missing'} ${LLM_CONFIG.deploymentName ? `(${LLM_CONFIG.deploymentName})` : ''}`);
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

    const requestBody = {
      messages: testMessages,
      max_tokens: 50,
      temperature: 0.1,
      model: LLM_CONFIG.modelName || LLM_CONFIG.deploymentName,
    };

    console.log('📤 Request URL:', LLM_CONFIG.endpoint);
    console.log('📤 Request Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_CONFIG.subscriptionKey.substring(0, 8)}...`,
    });
    console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('\n⏳ Sending request...\n');

    const response = await fetch(LLM_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.subscriptionKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📥 Raw Response Body:', responseText);
    console.log('📥 Response Body Length:', responseText.length);

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      console.log('Error details:', responseText);
      return false;
    }

    if (!responseText || responseText.trim().length === 0) {
      console.log('❌ Empty response from API');
      return false;
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Successfully parsed JSON response');
    } catch (jsonError) {
      console.log('❌ Failed to parse JSON response:', jsonError.message);
      console.log('Raw response was:', responseText);
      return false;
    }

    console.log('📋 Parsed Response:', JSON.stringify(data, null, 2));
    
    let content = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content;
      console.log('✅ Found content in choices[0].message.content');
    } else if (data.content) {
      content = data.content;
      console.log('✅ Found content in data.content');
    } else {
      console.log('⚠️  Unexpected response format - looking for content...');
      console.log('Available keys:', Object.keys(data));
      
      // Try to find content in other possible locations
      if (data.result && data.result.content) {
        content = data.result.content;
        console.log('✅ Found content in data.result.content');
      } else if (data.response) {
        content = data.response;
        console.log('✅ Found content in data.response');
      } else {
        console.log('❌ Could not find content in response');
        return false;
      }
    }

    console.log(`📝 LLM Response: "${content}"`);
    console.log('\n✅ LLM is working correctly!');
    return true;

  } catch (error) {
    console.log('❌ LLM API Error:', error.message);
    console.log('❌ Error Stack:', error.stack);
    return false;
  }
}

// Run the test
testLLM().then(success => {
  if (success) {
    console.log('\n🎉 Your LLM integration is ready to use!');
  } else {
    console.log('\n💡 Common fixes for LLM issues:');
    console.log('1. Check your .env file has the correct variables');
    console.log('2. Verify your Azure OpenAI endpoint URL format:');
    console.log('   - Should be: https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview');
    console.log('3. Check if your API key is valid and has proper permissions');
    console.log('4. Verify your deployment name matches what you created in Azure');
    console.log('5. Make sure your Azure OpenAI resource is active and not suspended');
    console.log('6. Try testing with a simple curl command first');
  }
  process.exit(success ? 0 : 1);
});