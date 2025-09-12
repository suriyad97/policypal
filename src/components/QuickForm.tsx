import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ArrowRight, User, MapPin, Calendar, Car, Home, Heart, Shield, Truck, Recycle as Motorcycle, Zap, Building2, Warehouse, Briefcase, Baby, Users, UserCheck, Stethoscope, Pill, Activity } from 'lucide-react';

export interface FormData {
  name: string;
  email: string;
  phone: string;
  zipCode: string;
  age: string;
  insuranceType: string;
  currentProvider?: string;
}

interface QuickFormProps {
  onComplete: (data: FormData) => void;
}

const insuranceTypes = [
  { 
    id: 'auto', 
    label: 'Auto Insurance', 
    icon: Car, 
    color: 'from-blue-500 to-blue-600',
    description: 'Protect your vehicle',
    subTypes: [
      { id: 'car', label: 'Car', icon: Car },
      { id: 'truck', label: 'Truck/SUV', icon: Truck },
      { id: 'motorcycle', label: 'Motorcycle', icon: Motorcycle },
      { id: 'electric', label: 'Electric Vehicle', icon: Zap }
    ]
  },
  { 
    id: 'home', 
    label: 'Home Insurance', 
    icon: Home, 
    color: 'from-green-500 to-green-600',
    description: 'Secure your home',
    subTypes: [
      { id: 'house', label: 'House', icon: Home },
      { id: 'condo', label: 'Condo', icon: Building2 },
      { id: 'apartment', label: 'Apartment', icon: Building2 },
      { id: 'commercial', label: 'Commercial', icon: Warehouse }
    ]
  },
  { 
    id: 'health', 
    label: 'Health Insurance', 
    icon: Heart, 
    color: 'from-red-500 to-red-600',
    description: 'Care for your health',
    subTypes: [
      { id: 'individual', label: 'Individual', icon: User },
      { id: 'family', label: 'Family', icon: Users },
      { id: 'senior', label: 'Senior', icon: UserCheck },
      { id: 'student', label: 'Student', icon: Baby }
    ]
  },
  { 
    id: 'life', 
    label: 'Life Insurance', 
    icon: Shield, 
    color: 'from-purple-500 to-purple-600',
    description: 'Protect your loved ones',
    subTypes: [
      { id: 'term', label: 'Term Life', icon: Calendar },
      { id: 'whole', label: 'Whole Life', icon: Shield },
      { id: 'universal', label: 'Universal', icon: Activity }
    ]
  },
  { 
    id: 'business', 
    label: 'Business Insurance', 
    icon: Briefcase, 
    color: 'from-orange-500 to-orange-600',
    description: 'Protect your business',
    subTypes: [
      { id: 'liability', label: 'General Liability', icon: Shield },
      { id: 'property', label: 'Property', icon: Building2 },
      { id: 'workers', label: 'Workers Comp', icon: Users }
    ]
  }
];

const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];

export const QuickForm: React.FC<QuickFormProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [selectedSubType, setSelectedSubType] = useState<string>('');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  
  const formData = watch();
  
  const steps = [
    {
      title: "What type of insurance do you need?",
      subtitle: "Choose the coverage that matters most to you",
      component: (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {insuranceTypes.map((type, index) => (
            <motion.button
              key={type.id}
              type="button"
              onClick={() => {
                setSelectedInsurance(type.id);
                setTimeout(() => setStep(1), 300);
              }}
              className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                selectedInsurance === type.id 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${type.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                <type.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">{type.label}</h3>
              <p className="text-gray-600 text-sm">{type.description}</p>
            </motion.button>
          ))}
        </motion.div>
      )
    },
    {
      title: "What specific type do you need?",
      subtitle: "Help us find the perfect coverage for you",
      component: (
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {insuranceTypes.find(type => type.id === selectedInsurance)?.subTypes.map((subType, index) => (
            <motion.button
              key={subType.id}
              type="button"
              onClick={() => {
                setSelectedSubType(subType.id);
                setTimeout(() => setStep(2), 300);
              }}
              className={`group p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                selectedSubType === subType.id 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100 rounded-lg flex items-center justify-center transition-all duration-300">
                <subType.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">{subType.label}</h4>
            </motion.button>
          ))}
        </motion.div>
      )
    },
    {
      title: "Tell PolicyPal about yourself",
      subtitle: "Just a few quick details to get you the best rates",
      component: (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                {...register('name', { required: 'Name is required' })}
                type="text"
                placeholder="Enter your full name"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
              {errors.name && <span className="text-red-500 text-sm mt-1 block">{errors.name.message}</span>}
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                {...register('zipCode', { required: 'ZIP code is required' })}
                type="text"
                placeholder="Enter your ZIP code"
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              />
              {errors.zipCode && <span className="text-red-500 text-sm mt-1 block">{errors.zipCode.message}</span>}
            </div>
          </div>
            
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Age Range</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {ageRanges.map((range, index) => (
                <motion.label
                  key={range}
                  className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                    formData.age === range 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <input
                    {...register('age', { required: 'Age range is required' })}
                    type="radio"
                    value={range}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{range}</span>
                </motion.label>
              ))}
            </div>
            {errors.age && <span className="text-red-500 text-sm">{errors.age.message}</span>}
          </div>
        </motion.div>
      )
    },
    {
      title: "How can PolicyPal reach you?",
      subtitle: "We'll send you personalized quotes instantly",
      component: (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input
            {...register('email', { 
              required: 'Email is required',
              pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
            })}
            type="email"
            placeholder="Enter your email address"
            className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
          />
          {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email.message}</span>}
          </div>
          
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            {...register('phone', { required: 'Phone number is required' })}
            type="tel"
            placeholder="Enter your phone number"
            className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
          />
          {errors.phone && <span className="text-red-500 text-sm mt-1 block">{errors.phone.message}</span>}
          </div>
          
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Provider (Optional)</label>
          <input
            {...register('currentProvider')}
            type="text"
            placeholder="Who's your current provider?"
            className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
          />
          </div>
        </motion.div>
      )
    }
  ];

  const onSubmit = (data: FormData) => {
    onComplete({
      ...data,
      insuranceType: selectedInsurance,
      subType: selectedSubType
    });
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <motion.div
        className="max-w-2xl w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-semibold">PolicyPal</span>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {step + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              placeholder="Current Provider (Help PolicyPal beat their rates!)"
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                {steps[step].title}
              </h2>
              {steps[step].subtitle && (
                <p className="text-gray-600 text-center mb-8 text-lg">
                  {steps[step].subtitle}
                </p>
              )}
              
              {steps[step].component}
            </motion.div>
          </AnimatePresence>

          {step < steps.length - 1 && selectedInsurance && step > 0 && (
            <motion.button
              type="button"
              onClick={() => {
                if (step === 1 && !selectedSubType) return;
                setStep(step + 1);
              }}
              disabled={step === 1 && !selectedSubType}
              className="w-full mt-8 bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}

          {step === steps.length - 1 && (
            <motion.button
              type="submit"
              className="w-full mt-8 bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span>Connect with PolicyPal</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}
        </form>
      </motion.div>
    </div>
  );
};