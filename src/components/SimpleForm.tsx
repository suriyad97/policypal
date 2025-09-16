import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, CheckCircle, MessageCircle, X, Shield } from 'lucide-react';

export interface SimpleFormData {
  name: string;
  email: string;
  phone: string;
  pincode: string;
}

interface SimpleFormProps {
  onComplete: (data: SimpleFormData) => void;
  onChatRequest: (data: SimpleFormData) => void;
}

export const SimpleForm: React.FC<SimpleFormProps> = ({ onComplete, onChatRequest }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SimpleFormData | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<SimpleFormData>();

  const onSubmit = async (data: SimpleFormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setFormData(data);
    setIsSubmitted(true);
    setIsSubmitting(false);
    onComplete(data);
  };

  const handleChatRequest = () => {
    if (formData) {
      onChatRequest(formData);
    }
  };

  const handleNoThanks = () => {
    // Just stay on acknowledgment page
    console.log('User declined chat assistance');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100"
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Thank You, {formData?.name}! 🎉
            </h2>
            <p className="text-gray-600 mb-8">
              Your information has been successfully submitted. We appreciate your interest in our services!
            </p>
          </motion.div>

          {/* Chat Request Section */}
          <motion.div
            className="bg-blue-50 rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Need More Help?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Can you please provide more details for further assistance? Our AI assistant can help you with personalized recommendations.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              <motion.button
                onClick={handleChatRequest}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-5 h-5" />
                <span>Yes, I'd like assistance</span>
              </motion.button>

              <motion.button
                onClick={handleNoThanks}
                className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                <span>No, thanks</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            className="text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p>We'll be in touch soon!</p>
            <p className="mt-1">📧 {formData?.email} • 📱 {formData?.phone}</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-semibold">PolicyPal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Get Started Today
          </h1>
          <p className="text-gray-600">
            Just a few details to connect with you
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                {...register('name', { 
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                type="text"
                placeholder="Enter your full name"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
            </div>
            {errors.name && (
              <span className="text-red-500 text-sm mt-1 block">{errors.name.message}</span>
            )}
          </motion.div>

          {/* Email Field */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { 
                    value: /^\S+@\S+$/i, 
                    message: 'Please enter a valid email address' 
                  }
                })}
                type="email"
                placeholder="Enter your email address"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
            </div>
            {errors.email && (
              <span className="text-red-500 text-sm mt-1 block">{errors.email.message}</span>
            )}
          </motion.div>

          {/* Phone Field */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[0-9]{10,15}$/,
                    message: 'Please enter a valid phone number (10-15 digits)'
                  }
                })}
                type="tel"
                placeholder="Enter your phone number"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
            </div>
            {errors.phone && (
              <span className="text-red-500 text-sm mt-1 block">{errors.phone.message}</span>
            )}
          </motion.div>

          {/* Pincode Field */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pincode *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                {...register('pincode', { 
                  required: 'Pincode is required',
                  pattern: {
                    value: /^[0-9]{5,6}$/,
                    message: 'Please enter a valid pincode (5-6 digits)'
                  }
                })}
                type="text"
                placeholder="Enter your pincode"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
            </div>
            {errors.pincode && (
              <span className="text-red-500 text-sm mt-1 block">{errors.pincode.message}</span>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Submit</span>
              </>
            )}
          </motion.button>

          <motion.p
            className="text-center text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            🔒 Your information is secure and will never be shared
          </motion.p>
        </form>
      </motion.div>
    </div>
  );
};