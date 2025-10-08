import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  style?: React.CSSProperties;
  buttonText?: string;
  copiedText?: string;
  iconSize?: string;
}

export function CopyButton({ 
  textToCopy, 
  className = "px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2",
  style = {},
  buttonText = "Copiar Código PIX",
  copiedText = "Código Copiado!",
  iconSize = "w-5 h-5"
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handleCopy}
      className={className}
      style={{
        background: copied ? '#10B981' : (style.background || 'var(--btn-cotacao-gratuita-bg)'),
        color: style.color || 'white',
        transform: copied ? 'scale(0.98)' : 'scale(1)',
        border: 'none',
        ...style
      }}
      title="Copiar código"
    >
      {copied ? (
        <>
          <Check className={`${iconSize} animate-[fadeIn_0.3s_ease-in-out]`} />
          <span className="animate-[fadeIn_0.3s_ease-in-out]">{copiedText}</span>
        </>
      ) : (
        <>
          <Copy className={iconSize} />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}