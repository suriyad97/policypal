import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, DollarSign, ArrowRight, User, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

export interface SimpleFormData {
  name: string;
  email: string;
  phone: string;
  pincode: string;
}

interface HeroSectionProps {
  onFormSubmit: (data: SimpleFormData) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onFormSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<SimpleFormData>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: SimpleFormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    onFormSubmit(data);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-32 left-10 w-24 h-24 bg-blue-400/20 rounded-full blur-xl"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left Side - Hero Content */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo and Brand */}
            <motion.div
              className="flex items-center justify-center lg:justify-start mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-800">PolicyPal</h3>
                    <p className="text-blue-600 text-sm font-semibold">Trusted Insurance Partner</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
              Find Better <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">Insurance</span>
              <br />in 30 Seconds
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed font-medium">
              Compare quotes from top insurers and save up to $847 per year
            </p>
            
            {/* Feature Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {[
                { icon: Clock, title: "Quick Quotes", desc: "Get quotes in 30 seconds", color: "from-blue-400 to-indigo-500" },
                { icon: DollarSign, title: "Save Money", desc: "Average savings $847/year", color: "from-green-400 to-emerald-500" },
                { icon: Shield, title: "Trusted", desc: "50+ top-rated insurers", color: "from-purple-400 to-indigo-500" }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-xl p-4 shadow-lg border border-gray-100"
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-gray-800 font-bold text-lg mb-1">{feature.title}</h3>
                  <p className="text-gray-600 font-medium text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          
          {/* Right Side - Lead Form */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
              {/* Form Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Get Your Free Quote
                </h2>
                <p className="text-gray-600">
                  Just a few details to get started
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name Field */}
                <div className="relative">
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
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.name && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.name.message}</span>
                  )}
                </div>

                {/* Email Field */}
                <div className="relative">
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
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.email && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.email.message}</span>
                  )}
                </div>

                {/* Phone Field */}
                <div className="relative">
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
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.phone && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.phone.message}</span>
                  )}
                </div>

                {/* Pincode Field */}
                <div className="relative">
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
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.pincode && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.pincode.message}</span>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                      <span>Get Free Quote</span>
                    </>
                  )}
                </motion.button>
                <p className="text-center text-gray-500 text-xs mt-4">
                  🔒 Your information is secure and will never be shared
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};