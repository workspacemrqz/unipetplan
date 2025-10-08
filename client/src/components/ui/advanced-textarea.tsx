import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Eye, Edit, EyeOff } from "lucide-react";

interface AdvancedTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  showPreview?: boolean;
  previewClassName?: string;
  onPreviewToggle?: (isPreview: boolean) => void;
}

const AdvancedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AdvancedTextareaProps
>(({ 
  className, 
  label, 
  showPreview = false, 
  previewClassName,
  onPreviewToggle,
  ...props 
}, ref) => {
  const [isPreview, setIsPreview] = React.useState(showPreview);
  const [textareaHeight, setTextareaHeight] = React.useState<number>(80);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize function
  const adjustHeight = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(80, scrollHeight);
      setTextareaHeight(newHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // Adjust height on value change
  React.useEffect(() => {
    adjustHeight();
  }, [props.value, adjustHeight]);

  // Handle preview toggle
  const handlePreviewToggle = () => {
    const newPreviewState = !isPreview;
    setIsPreview(newPreviewState);
    onPreviewToggle?.(newPreviewState);
  };

  // Function to render text with line breaks
  const renderFormattedText = (text: string) => {
    if (!text) return <span className="text-muted-foreground">Nenhum texto inserido</span>;
    
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line || <br />}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewToggle}
            className="h-7 px-2 text-xs"
          >
            {isPreview ? (
              <>
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      )}
      
      {isPreview ? (
        <div
          className={cn(
            "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base whitespace-pre-wrap break-words",
            previewClassName
          )}
          style={{ minHeight: `${textareaHeight}px` }}
        >
          {renderFormattedText(props.value as string || '')}
        </div>
      ) : (
        <textarea
          ref={(node) => {
            // Handle both refs
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            // Use type assertion to handle the read-only property
            (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }}
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
            className
          )}
          style={{ height: `${textareaHeight}px` }}
          onInput={adjustHeight}
          {...props}
        />
      )}
    </div>
  );
});

AdvancedTextarea.displayName = "AdvancedTextarea";

export { AdvancedTextarea };
