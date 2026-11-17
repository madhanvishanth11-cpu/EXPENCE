import React from 'react';
import spendwiseLogoImg from '../assets/spendwise-logo.png';

/**
 * SpendWise Unified Brand Logo using your exact official logo asset
 */
export const Logo = ({ 
  size = 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  showText = true, 
  variant = 'dark',   // 'dark' | 'light'
  className = '' 
}) => {
  const iconSizes = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Uploaded Logo Image */}
      <img
        src={spendwiseLogoImg}
        alt="SpendWise"
        className={`${iconSizes[size] || iconSizes.md} object-contain rounded-xl shadow-xs shrink-0`}
      />

      {/* Typography alongside icon if requested */}
      {showText && (
        <div className="flex items-baseline">
          <span className={`font-extrabold tracking-tight ${textSizes[size] || textSizes.md} ${
            variant === 'light' ? 'text-white' : 'text-slate-900'
          }`}>
            Spend
          </span>
          <span className={`font-extrabold tracking-tight text-[#FF6A00] ${textSizes[size] || textSizes.md}`}>
            Wise
          </span>
        </div>
      )}
    </div>
  );
};
