import { forwardRef } from 'react';

interface ModernToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const ModernToggle = forwardRef<HTMLButtonElement, ModernToggleProps>(
  ({ checked = false, onCheckedChange, id, className = '', disabled = false }, ref) => {
    const handleToggle = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`toggle-modern ${checked ? 'active' : ''} ${className}`}
        onClick={handleToggle}
        data-testid={id ? `toggle-${id}` : 'modern-toggle'}
      />
    );
  }
);

ModernToggle.displayName = 'ModernToggle';

export { ModernToggle };