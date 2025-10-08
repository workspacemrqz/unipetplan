import * as React from "react";
import { cn } from "@/lib/utils";

interface FormattedTextProps {
  text: string;
  className?: string;
  preserveWhitespace?: boolean;
  renderEmptyText?: boolean;
  emptyText?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  className,
  preserveWhitespace = true,
  renderEmptyText = true,
  emptyText = "Nenhum texto inserido"
}) => {
  if (!text || text.trim() === '') {
    return renderEmptyText ? (
      <span className={cn("text-muted-foreground italic", className)}>
        {emptyText}
      </span>
    ) : null;
  }

  // Split text by line breaks and render each line
  const lines = text.split('\n');
  
  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};

export { FormattedText };
