import React from 'react';
import { motion } from 'framer-motion';

interface CustomSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onCheckedChange,
  id,
  className = '',
  disabled = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex h-8 w-16 items-center rounded-full 
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-blue-500/30
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
          : 'bg-gray-300 dark:bg-gray-600'
        }
        ${className}
      `}
    >
      {/* Background icons/text for better visibility */}
      <span className="absolute left-1.5 text-[10px] font-semibold text-white pointer-events-none">
        {checked ? 'ON' : ''}
      </span>
      <span className="absolute right-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
        {!checked ? 'OFF' : ''}
      </span>
      
      {/* Animated toggle circle */}
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30
        }}
        className={`
          absolute h-6 w-6 rounded-full shadow-md
          ${checked 
            ? 'translate-x-9 bg-white' 
            : 'translate-x-1 bg-white'
          }
        `}
      >
        {/* Inner indicator */}
        <div className={`
          absolute inset-0 m-1 rounded-full transition-colors duration-300
          ${checked 
            ? 'bg-blue-500' 
            : 'bg-gray-400'
          }
        `} />
      </motion.div>
    </button>
  );
};

// Alternative design without framer-motion
export const SimpleSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onCheckedChange,
  id,
  className = '',
  disabled = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex h-10 w-20 items-center rounded-full 
        border-2 transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-4 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked 
          ? 'bg-green-500 border-green-600 focus:ring-green-500/30' 
          : 'bg-red-500 border-red-600 focus:ring-red-500/30'
        }
        ${className}
      `}
    >
      {/* Status text */}
      <span className={`
        absolute text-xs font-bold text-white transition-all duration-300
        ${checked ? 'left-2' : 'right-2'}
      `}>
        {checked ? 'ON' : 'OFF'}
      </span>
      
      {/* Toggle circle */}
      <div
        className={`
          absolute h-7 w-7 rounded-full bg-white shadow-lg
          transition-transform duration-300 ease-in-out
          ${checked ? 'translate-x-11' : 'translate-x-1'}
        `}
      >
        {/* Icon indicators */}
        <div className="flex h-full w-full items-center justify-center">
          {checked ? (
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};