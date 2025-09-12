import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, DollarSign, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
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
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo and Brand */}
          <motion.div
            className="flex items-center justify-center mb-8"
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
          <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight">
            Find Better <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">Insurance</span>
            <br />in 30 Seconds
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Compare quotes from top insurers and save up to $847 per year
          </p>
          
          {/* Feature Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
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
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-gray-800 font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-gray-600 font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          
          {/* CTA Button */}
          <motion.button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-blue-500/50 transition-all duration-300 group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <span className="flex items-center space-x-3">
              <span>Get Started - It's Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
          
          <p className="text-gray-500 text-sm mt-4">No spam, no hidden fees. Just better insurance.</p>
        </motion.div>
      </div>
    </div>
  );
};