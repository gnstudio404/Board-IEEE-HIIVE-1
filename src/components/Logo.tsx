import React from 'react';
import { LOGO_BASE64, LOGO_WITH_TEXT_BASE64 } from '../constants/logos';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'withText';
}

/**
 * Logo component that uses embedded base64 images to ensure visibility in all environments.
 */
export const Logo: React.FC<LogoProps> = ({ className = "h-12", variant = 'default' }) => {
  const src = variant === 'withText' ? LOGO_WITH_TEXT_BASE64 : LOGO_BASE64;
  
  return (
    <img 
      src={src} 
      alt="IEEE HIIVE Board Logo" 
      className={`object-contain w-auto relative z-[100] ${className}`}
    />
  );
};

export default Logo;
