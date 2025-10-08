import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CustomCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const CustomCheckbox = React.forwardRef<HTMLInputElement, CustomCheckboxProps>(
  ({ className, label, description, id, checked, ...props }, ref) => {
    const stableId = React.useId();
    const checkboxId = id || `checkbox-${stableId}`;
    
    // CSS to force transparent background
    React.useEffect(() => {
      const style = document.createElement('style');
      style.textContent = `
        .custom-checkbox-wrapper,
        .custom-checkbox-wrapper *:not(.custom-checkbox-input) {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }
        .custom-checkbox-wrapper label {
          background: none !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }
        /* Ensure parent containers don't apply background */
        .mb-2:has(.custom-checkbox-wrapper) {
          background: transparent !important;
          background-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }, []);
    
    return (
      <div className="custom-checkbox-wrapper flex items-center gap-2" style={{ background: 'none !important', backgroundColor: 'transparent !important' }}>
        <div className="relative flex items-center justify-center" style={{ background: 'none' }}>
          <input
            {...props}
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            className="sr-only peer"
          />
          <div 
            className={cn(
              "custom-checkbox-input h-4 w-4 rounded-sm border flex items-center justify-center transition-all duration-200 cursor-pointer",
              "",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              className
            )}
            style={{
              backgroundColor: checked ? 'rgb(var(--checkbox-success))' : 'rgb(var(--bg-white))',
              borderColor: checked ? 'rgb(var(--checkbox-success))' : 'rgb(var(--checkbox-border))',
              boxShadow: props.disabled ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.25)' : 'none',
            }}
            data-checked={checked ? "true" : "false"}
            onClick={() => {
              const event = { target: { checked: !checked } } as React.ChangeEvent<HTMLInputElement>;
              props.onChange?.(event);
            }}
          >
            {checked && (
              <Check 
                className="h-3 w-3 text-[rgb(var(--success-foreground))]"
                strokeWidth={3}
              />
            )}
          </div>
        </div>
        {label && (
          <label 
            htmlFor={checkboxId} 
            className="text-sm font-medium cursor-pointer select-none"
            style={{ 
              background: 'transparent !important',
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important'
            }}
          >
            {label}
          </label>
        )}
        {description && (
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
    );
  }
);

CustomCheckbox.displayName = "CustomCheckbox";

export { CustomCheckbox };