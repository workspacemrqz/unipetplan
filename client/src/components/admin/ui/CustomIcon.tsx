import React from 'react';

interface CustomIconProps {
  name: string;
  className?: string;
}

const CustomIcon: React.FC<CustomIconProps> = ({ name, className = "h-5 w-5" }) => {
  return (
    <img 
      src={`/Icons/${name}.svg`} 
      alt={name}
      className={className}
    />
  );
};

export default CustomIcon;
