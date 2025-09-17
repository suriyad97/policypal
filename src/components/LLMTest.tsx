import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: import.meta.env.VITE_LLM_ENDPOINT || '',
  subscriptionKey: import.meta.env.VITE_LLM_SUBSCRIPTION_KEY || '',
  deploymentName: import.meta.env.VITE_LLM_DEPLOYMENT_NAME || '', 
  modelName: import.meta.env.VITE_LLM_MODEL_NAME || 'gpt-3.5-turbo',
  apiVersion: import.meta.env.VITE_LLM_API_VERSION || '2024-02-15-preview'
};

interface TestResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const LLMTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const testLLMEndpoint = async () => {
    setIsLoading(true);
    setTestResults([]);

    // Test 1: Check configuration
    addResult({
      status: 'warning',
      message: 'Checking LLM configuration...',
    });

    if (!LLM_CONFIG.endpoint) {
      addResult({
        status: 'error',
        message: 'VITE_LLM_ENDPOINT is not configured',
        details: 'Please set VITE_LLM_ENDPOINT in your .env file'
      });
    } else {
      addResult({
        status: 'success',
        message: `LLM Endpoint configured: ${LLM_CONFIG.endpoint}`,
      });
    }

    if (!LLM_CONFIG.subscriptionKey) {
      addResult({
        status: 'error',
        message: 'VITE_LLM_SUBSCRIPTION_KEY is not configured',
        details: 'Please set VITE_LLM_SUBSCRIPTION_KEY in your .env file'
      });
    } else {
      addResult({
        status: 'success',
        message: `Subscription key configured (${LLM_CONFIG.subscriptionKey.substring(0, 8)}...)`
      });
    }

    // Test 2: Try to make a simple API call
    if (LLM_CONFIG.endpoint && LLM_CONFIG.subscriptionKey) {
      addResult({
        status: 'warning',
        message: 'Testing API connection...',
      });

      try {
        const testMessage = {
          messages: [
            { role: 'user', content: 'Hello, this is a test message. Please respond with "Test successful".' }
          ],
          max_tokens: 50,
          temperature: 0.1,
          model: LLM_CONFIG.modelName || LLM_CONFIG.deploymentName,
        };

        const response = await fetch(LLM_CONFIG.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLM_CONFIG.subscriptionKey}`,
            // For Azure OpenAI, you might need this header instead:
            // 'api-key': LLM_CONFIG.subscriptionKey,
          },
          body: JSON.stringify(testMessage),
        });

        addResult({
          status: response.ok ? 'success' : 'error',
          message: `API Response: ${response.status} ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Handle different API response formats
          let responseContent = '';
          if (data.choices && data.choices[0] && data.choices[0].message) {
            responseContent = data.choices[0].message.content;
          } else if (data.content) {
            responseContent = data.content;
          } else {
            responseContent = 'Unknown response format';
          }

          addResult({
            status: 'success',
            message: `LLM Response: ${responseContent}`,
            details: data
          });
        } else {
          const errorText = await response.text();
          addResult({
            status: 'error',
            message: 'API call failed',
            details: errorText
          });
        }
      } catch (error) {
        addResult({
          status: 'error',
          message: `Network error: ${error.message}`,
          details: error
        });
      }
    }

    // Test 3: Check environment variables
    addResult({
      status: 'warning',
      message: 'Environment variables summary:',
      details: {
        VITE_LLM_ENDPOINT: LLM_CONFIG.endpoint ? 'Set' : 'Not set',
        VITE_LLM_SUBSCRIPTION_KEY: LLM_CONFIG.subscriptionKey ? 'Set' : 'Not set',
        VITE_LLM_DEPLOYMENT_NAME: LLM_CONFIG.deploymentName ? 'Set' : 'Not set',
        VITE_LLM_MODEL_NAME: LLM_CONFIG.modelName,
        VITE_LLM_API_VERSION: LLM_CONFIG.apiVersion
      }
    });

    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">LLM Endpoint Test</h1>
        
        <div className="mb-6">
          <motion.button
            onClick={testLLMEndpoint}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Test LLM Connection</span>
              </>
            )}
          </motion.button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Test Results:</h2>
            {testResults.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                          Show details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                          {typeof result.details === 'string' 
                            ? result.details 
                            : JSON.stringify(result.details, null, 2)
                          }
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Configuration Help:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Set <code>VITE_LLM_ENDPOINT</code> to your LLM API endpoint URL</p>
            <p>• Set <code>VITE_LLM_SUBSCRIPTION_KEY</code> to your API key</p>
            <p>• For Azure OpenAI, you may need to use the <code>api-key</code> header instead of <code>Authorization</code></p>
            <p>• Make sure your endpoint supports the OpenAI chat completions format</p>
          </div>
        </div>
      </div>
    </div>
  );
};