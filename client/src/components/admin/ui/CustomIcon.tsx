import React from 'react';

interface CustomIconProps {
  name: string;
  className?: string;
  color?: 'gray' | 'primary' | 'teal' | 'white';
}

const CustomIcon: React.FC<CustomIconProps> = ({ name, className = "h-5 w-5", color = 'gray' }) => {
  // Define os filtros CSS para cada cor baseados nos ícones lucide-react originais
  const getColorFilter = () => {
    switch (color) {
      case 'gray':
        // Corresponde a text-gray-600 (#4B5563)
        return 'brightness(0) saturate(100%) invert(30%) sepia(11%) saturate(478%) hue-rotate(176deg) brightness(98%) contrast(84%)';
      case 'primary':
        // Corresponde a text-primary (teal principal do sistema)
        return 'brightness(0) saturate(100%) invert(44%) sepia(59%) saturate(506%) hue-rotate(131deg) brightness(97%) contrast(94%)';
      case 'teal':
        // Corresponde a var(--icon-teal) usado em features.tsx
        return 'brightness(0) saturate(100%) invert(44%) sepia(59%) saturate(506%) hue-rotate(131deg) brightness(97%) contrast(94%)';
      case 'white':
        // Para ícones brancos
        return 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)';
      default:
        return 'none';
    }
  };

  return (
    <img 
      src={`/Icons/${name}.svg`} 
      alt={name}
      className={className}
      style={{ filter: getColorFilter() }}
    />
  );
};

export default CustomIcon;
