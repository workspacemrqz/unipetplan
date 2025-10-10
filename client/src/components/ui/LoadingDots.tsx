interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export default function LoadingDots({ 
  size = 'md', 
  color = 'white',
  className = '' 
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      <div 
        className={`${dotSize} rounded-full`}
        style={{
          backgroundColor: color,
          animation: 'pulse-scale 1.4s ease-in-out infinite',
          animationDelay: '0s'
        }}
      ></div>
      <div 
        className={`${dotSize} rounded-full`}
        style={{
          backgroundColor: color,
          animation: 'pulse-scale 1.4s ease-in-out infinite',
          animationDelay: '0.2s'
        }}
      ></div>
      <div 
        className={`${dotSize} rounded-full`}
        style={{
          backgroundColor: color,
          animation: 'pulse-scale 1.4s ease-in-out infinite',
          animationDelay: '0.4s'
        }}
      ></div>
    </div>
  );
}
