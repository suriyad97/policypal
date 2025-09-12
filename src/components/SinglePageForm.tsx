import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ArrowRight, User, MapPin, Calendar, Car, Heart, Shield, Briefcase, Phone, Mail, CheckCircle, Users, UserCheck, Hash, Building, CreditCard, Baby } from 'lucide-react';

export interface FormData {
  name: string;
  email: string;
  phone: string;
  zipCode: string;
  insuranceType: string;
  
  // Car insurance specific
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  
  // Health insurance specific
  age?: string;
  gender?: string;
  medicalHistory?: string;
  
  // Term life insurance specific
  lifeAge?: string;
  lifeGender?: string;
  coverageAmount?: string;
  relationship?: string;
  
  // Savings plan specific
  savingsAge?: string;
  savingsGender?: string;
  monthlyInvestment?: string;
  investmentGoal?: string;
  
  currentProvider?: string;
}

interface SinglePageFormProps {
  onComplete: (data: FormData) => void;
}

const insuranceTypes = [
  { id: 'car', label: 'Car', icon: Car, color: 'from-blue-500 to-blue-600' },
  { id: 'term', label: 'Term', icon: Shield, color: 'from-purple-500 to-purple-600' },
  { id: 'health', label: 'Health', icon: Heart, color: 'from-red-500 to-red-600' },
  { id: 'savings', label: 'Savings', icon: Briefcase, color: 'from-green-500 to-green-600' }
];

const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
const genderOptions = ['Male', 'Female'];
const relationshipOptions = [
  { id: 'self', label: 'Self', icon: User },
  { id: 'spouse', label: 'Spouse', icon: Users },
  { id: 'parents', label: 'Parents', icon: UserCheck }
];

const vehicleYears = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', 'Older'];
const coverageAmounts = ['₹10 Lakh', '₹25 Lakh', '₹50 Lakh', '₹1 Crore', '₹2 Crore', '₹5 Crore'];
const monthlyInvestments = ['₹1,000', '₹2,500', '₹5,000', '₹10,000', '₹25,000', '₹50,000+'];
const investmentGoals = ['Retirement', 'Child Education', 'Home Purchase', 'Emergency Fund', 'Wealth Creation'];

export const SinglePageForm: React.FC<SinglePageFormProps> = ({ onComplete }) => {
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  
  const formData = watch();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete({
      ...data,
      insuranceType: selectedInsurance
    });
  };

  const renderDynamicFields = () => {
    switch (selectedInsurance) {
      case 'car':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Registration Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('vehicleNumber', { required: 'Vehicle number is required' })}
                    type="text"
                    placeholder="e.g., MH01AB1234"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                  />
                </div>
                {errors.vehicleNumber && <span className="text-red-500 text-sm mt-1 block">{errors.vehicleNumber.message}</span>}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model</label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('vehicleModel', { required: 'Vehicle model is required' })}
                    type="text"
                    placeholder="e.g., Maruti Swift"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                  />
                </div>
                {errors.vehicleModel && <span className="text-red-500 text-sm mt-1 block">{errors.vehicleModel.message}</span>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Vehicle Year</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {vehicleYears.map((year, index) => (
                  <motion.label
                    key={year}
                    className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                      formData.vehicleYear === year 
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
                      {...register('vehicleYear', { required: 'Vehicle year is required' })}
                      type="radio"
                      value={year}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{year}</span>
                  </motion.label>
                ))}
              </div>
              {errors.vehicleYear && <span className="text-red-500 text-sm">{errors.vehicleYear.message}</span>}
            </div>
          </motion.div>
        );

      case 'health':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Insurance Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Age Range</label>
                <div className="grid grid-cols-2 gap-3">
                  {ageRanges.map((range, index) => (
                    <motion.label
                      key={range}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.age === range 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-200 bg-white hover:border-red-300'
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

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {genderOptions.map((gender, index) => (
                    <motion.label
                      key={gender}
                      className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.gender === gender 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        {...register('gender', { required: 'Gender is required' })}
                        type="radio"
                        value={gender}
                        className="sr-only"
                      />
                      <span className="font-medium">{gender}</span>
                    </motion.label>
                  ))}
                </div>
                {errors.gender && <span className="text-red-500 text-sm">{errors.gender.message}</span>}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Any Pre-existing Medical Conditions? (Optional)</label>
              <textarea
                {...register('medicalHistory')}
                placeholder="Please mention any medical conditions, surgeries, or ongoing treatments"
                rows={3}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white resize-none"
              />
            </div>
          </motion.div>
        );

      case 'term':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Term Life Insurance Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Age Range</label>
                <div className="grid grid-cols-2 gap-3">
                  {ageRanges.map((range, index) => (
                    <motion.label
                      key={range}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.lifeAge === range 
                          ? 'border-purple-500 bg-purple-50 text-purple-700' 
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        {...register('lifeAge', { required: 'Age range is required' })}
                        type="radio"
                        value={range}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm">{range}</span>
                    </motion.label>
                  ))}
                </div>
                {errors.lifeAge && <span className="text-red-500 text-sm">{errors.lifeAge.message}</span>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {genderOptions.map((gender, index) => (
                    <motion.label
                      key={gender}
                      className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.lifeGender === gender 
                          ? 'border-purple-500 bg-purple-50 text-purple-700' 
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        {...register('lifeGender', { required: 'Gender is required' })}
                        type="radio"
                        value={gender}
                        className="sr-only"
                      />
                      <span className="font-medium">{gender}</span>
                    </motion.label>
                  ))}
                </div>
                {errors.lifeGender && <span className="text-red-500 text-sm">{errors.lifeGender.message}</span>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Coverage Amount</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {coverageAmounts.map((amount, index) => (
                  <motion.label
                    key={amount}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                      formData.coverageAmount === amount 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      {...register('coverageAmount', { required: 'Coverage amount is required' })}
                      type="radio"
                      value={amount}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{amount}</span>
                  </motion.label>
                ))}
              </div>
              {errors.coverageAmount && <span className="text-red-500 text-sm">{errors.coverageAmount.message}</span>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Who do you want to insure?</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {relationshipOptions.map((relationship, index) => (
                  <motion.label
                    key={relationship.id}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                      formData.relationship === relationship.id 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      {...register('relationship', { required: 'Relationship is required' })}
                      type="radio"
                      value={relationship.id}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <relationship.icon className="w-6 h-6" />
                      <span className="font-medium">{relationship.label}</span>
                    </div>
                  </motion.label>
                ))}
              </div>
              {errors.relationship && <span className="text-red-500 text-sm">{errors.relationship.message}</span>}
            </div>
          </motion.div>
        );

      case 'savings':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Savings Plan Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Age Range</label>
                <div className="grid grid-cols-2 gap-3">
                  {ageRanges.map((range, index) => (
                    <motion.label
                      key={range}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.savingsAge === range 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        {...register('savingsAge', { required: 'Age range is required' })}
                        type="radio"
                        value={range}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm">{range}</span>
                    </motion.label>
                  ))}
                </div>
                {errors.savingsAge && <span className="text-red-500 text-sm">{errors.savingsAge.message}</span>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {genderOptions.map((gender, index) => (
                    <motion.label
                      key={gender}
                      className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                        formData.savingsGender === gender 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        {...register('savingsGender', { required: 'Gender is required' })}
                        type="radio"
                        value={gender}
                        className="sr-only"
                      />
                      <span className="font-medium">{gender}</span>
                    </motion.label>
                  ))}
                </div>
                {errors.savingsGender && <span className="text-red-500 text-sm">{errors.savingsGender.message}</span>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Monthly Investment Amount</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {monthlyInvestments.map((amount, index) => (
                  <motion.label
                    key={amount}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                      formData.monthlyInvestment === amount 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      {...register('monthlyInvestment', { required: 'Monthly investment is required' })}
                      type="radio"
                      value={amount}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{amount}</span>
                  </motion.label>
                ))}
              </div>
              {errors.monthlyInvestment && <span className="text-red-500 text-sm">{errors.monthlyInvestment.message}</span>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Investment Goal</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {investmentGoals.map((goal, index) => (
                  <motion.label
                    key={goal}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md ${
                      formData.investmentGoal === goal 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <input
                      {...register('investmentGoal', { required: 'Investment goal is required' })}
                      type="radio"
                      value={goal}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{goal}</span>
                  </motion.label>
                ))}
              </div>
              {errors.investmentGoal && <span className="text-red-500 text-sm">{errors.investmentGoal.message}</span>}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-semibold">PolicyPal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Trusted Insurance, Fantastic Savings!
          </h1>
          <p className="text-gray-600">Get personalized quotes instantly</p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="space-y-8">
              {/* Insurance Type Selection */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 text-center">
                  What type of insurance do you need?
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {insuranceTypes.map((type, index) => (
                    <motion.button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedInsurance(type.id)}
                      className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                        selectedInsurance === type.id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`w-12 h-12 mx-auto mb-3 bg-gradient-to-r ${type.color} rounded-xl flex items-center justify-center shadow-md`}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-800 text-sm">{type.label}</h3>
                    </motion.button>
                  ))}
                </div>
                {!selectedInsurance && (
                  <p className="text-red-500 text-sm text-center">Please select an insurance type</p>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('name', { required: 'Name is required' })}
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.name && <span className="text-red-500 text-sm mt-1 block">{errors.name.message}</span>}
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('zipCode', { required: 'ZIP code is required' })}
                      type="text"
                      placeholder="Enter your ZIP code"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>
                  {errors.zipCode && <span className="text-red-500 text-sm mt-1 block">{errors.zipCode.message}</span>}
                </div>
              </div>

              {/* Dynamic Fields Based on Insurance Type */}
              <AnimatePresence mode="wait">
                {selectedInsurance && (
                  <motion.div
                    key={selectedInsurance}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderDynamicFields()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contact Information */}
              {selectedInsurance && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          {...register('email', { 
                            required: 'Email is required',
                            pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                          })}
                          type="email"
                          placeholder="Enter your email address"
                          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                        />
                      </div>
                      {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email.message}</span>}
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          {...register('phone', { required: 'Phone number is required' })}
                          type="tel"
                          placeholder="Enter your phone number"
                          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                        />
                      </div>
                      {errors.phone && <span className="text-red-500 text-sm mt-1 block">{errors.phone.message}</span>}
                    </div>
                  </div>

                  {/* Current Provider */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Insurance Provider (Optional)</label>
                    <input
                      {...register('currentProvider')}
                      type="text"
                      placeholder="Who's your current provider? (Help us beat their rates!)"
                      className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !selectedInsurance}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <span>Finding Your Best Rates...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Get My Quotes</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-gray-500 text-sm">
                    🔒 Your information is secure and will never be shared
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};