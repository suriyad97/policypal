import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, MessageCircle, X, Shield, Star, Award, Users } from 'lucide-react';

export interface SimpleFormData {
  name: string;
  email: string;
  phone: string;
  pincode: string;
}

interface AcknowledgmentPageProps {
  formData: SimpleFormData;
  onChatRequest: () => void;
  onDeclineChat: () => void;
}

export const AcknowledgmentPage: React.FC<AcknowledgmentPageProps> = ({ 
  formData, 
  onChatRequest, 
  onDeclineChat 
}) => {
  const [showChatRequest, setShowChatRequest] = React.useState(true);

  const handleDeclineChat = () => {
    setShowChatRequest(false);
    onDeclineChat();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <motion.div
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Success Icon */}
        <motion.div
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>

        {/* Thank You Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Thank You, {formData.name}! 🎉
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Your information has been successfully submitted. We appreciate your interest in finding better insurance coverage!
          </p>
        </motion.div>

        {/* Submitted Information */}
        <motion.div
          className="bg-gray-50 rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Submitted Information:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">📧 Email:</span>
              <span className="text-gray-600">{formData.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">📱 Phone:</span>
              <span className="text-gray-600">{formData.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">📍 Pincode:</span>
              <span className="text-gray-600">{formData.pincode}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">✅ Status:</span>
              <span className="text-green-600 font-semibold">Submitted</span>
            </div>
          </div>
        </motion.div>

        {/* Chat Request Section */}
        {showChatRequest && (
          <motion.div
            className="bg-blue-50 rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Can you please provide more details for further assistance?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Our AI-powered insurance advisor can help you find personalized quotes, compare coverage options, and answer any questions you have about insurance policies.
            </p>

            {/* Benefits of Chat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">Personalized Quotes</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">Expert Guidance</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">24/7 Support</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center">
              <motion.button
                onClick={onChatRequest}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-5 h-5" />
                <span>Yes, I'd like assistance</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Company Trust Indicators */}

        {/* Final Thank You - Always show */}
        {!showChatRequest && (
          <motion.div
            className="mt-6 pt-6 border-t border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Thank you for your submission!</h3>
              <p className="text-gray-500 text-sm">
                We'll be in touch soon with your personalized insurance recommendations!
              </p>
            </div>
          </motion.div>
        )}

        {/* Original Final Thank You - Show when chat request is visible */}
        {showChatRequest && (
          <motion.div
            className="mt-6 pt-6 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-gray-500 text-sm">
              We'll be in touch soon with your personalized insurance recommendations!
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};