import * as React from "react";
import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  text: string;
  maxLength: number;
  className?: string;
  showDetails?: boolean;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({
  text,
  maxLength,
  className,
  showDetails = false
}) => {
  const normalizedText = text.replace(/\r\n|\r|\n/g, '\n');
  const currentLength = normalizedText.length;
  const remaining = maxLength - currentLength;
  const isOverLimit = currentLength > maxLength;
  
  // Estatísticas detalhadas
  const lines = text.split('\n').length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  
  const getProgressColor = () => {
    if (isOverLimit) return "";
    if (remaining <= maxLength * 0.1) return "";
    if (remaining <= maxLength * 0.25) return "";
    return "";
  };

  const getProgressStyle = () => {
    if (isOverLimit) return { color: 'var(--text-error)' };
    if (remaining <= maxLength * 0.1) return { color: 'var(--bg-yellow)' };
    if (remaining <= maxLength * 0.25) return { color: 'var(--bg-orange)' };
    return { color: 'var(--bg-green)' };
  };

  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <div className="flex items-center justify-between">
        <span className={getProgressColor()} style={getProgressStyle()}>
          {currentLength}/{maxLength} caracteres
        </span>
        {isOverLimit && (
          <span className="font-medium" style={{ color: 'var(--text-error)' }}>
            +{Math.abs(remaining)} caracteres excedidos
          </span>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-1 text-xs text-muted-foreground/70">
          <span className="mr-3">{lines} linha{lines !== 1 ? 's' : ''}</span>
          <span>{words} palavra{words !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {/* Barra de progresso visual */}
      <div className="mt-1 w-full rounded-full h-1" style={{ background: 'var(--border-gray)' }}>
        <div
          className={cn(
            "h-1 rounded-full transition-all duration-200",
            ""
          )}
          style={{
            width: `${Math.min((currentLength / maxLength) * 100, 100)}%`,
            background: isOverLimit ? 'var(--bg-red-2)' : 'var(--bg-teal)'
          }}
        />
      </div>
    </div>
  );
};

export { CharacterCounter };
