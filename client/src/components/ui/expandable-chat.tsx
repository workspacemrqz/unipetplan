"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ChatPosition = "bottom-right" | "bottom-left";
export type ChatSize = "sm" | "md" | "lg" | "xl" | "full";

const CHAT_BORDER_COLOR = '#689FA0';

const chatConfig = {
  dimensions: {
    sm: "w-[300px] h-[450px] max-w-[90vw] max-h-[80vh] sm:w-[320px] sm:h-[500px]",
    md: "w-[340px] h-[500px] max-w-[90vw] max-h-[80vh] sm:w-[384px] sm:h-[600px]",
    lg: "w-[380px] h-[550px] max-w-[90vw] max-h-[80vh] sm:w-[512px] sm:h-[700px]",
    xl: "w-[420px] h-[600px] max-w-[90vw] max-h-[80vh] sm:w-[576px] sm:h-[800px]",
    full: "w-[90vw] h-[80vh] sm:w-[95vw] sm:h-[90vh]",
  },
  positions: {
    "bottom-right": "bottom-5 right-5",
    "bottom-left": "bottom-5 left-5",
  },
  chatPositions: {
    "bottom-right": "bottom-[calc(100%+10px)] right-0",
    "bottom-left": "bottom-[calc(100%+10px)] left-0",
  },
  states: {
    open: "pointer-events-auto opacity-100 visible scale-100 translate-y-0",
    closed:
      "pointer-events-none opacity-0 invisible scale-100 sm:translate-y-5",
  },
};

interface ExpandableChatProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: ChatPosition;
  size?: ChatSize;
  icon?: React.ReactNode;
}

const ExpandableChat: React.FC<ExpandableChatProps> = ({
  className,
  position = "bottom-right",
  size = "md",
  icon,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <div
      className={cn(`fixed ${chatConfig.positions[position]} z-50`, className)}
      {...props}
    >
      {/* Shadow wrapper - external */}
      <div
        ref={chatRef}
        className={cn(
          "rounded-lg transition-all duration-200 ease-out absolute",
          chatConfig.chatPositions[position],
          chatConfig.dimensions[size],
          isOpen ? chatConfig.states.open : chatConfig.states.closed,
        )}
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Content wrapper - internal with border and overflow */}
        <div
          className="flex flex-col bg-background rounded-lg h-full w-full overflow-hidden"
          style={{
            border: `1px solid ${CHAT_BORDER_COLOR}`,
          }}
        >
          {children}
        </div>
      </div>
      <ExpandableChatToggle
        icon={icon}
        isOpen={isOpen}
        toggleChat={toggleChat}
      />
    </div>
  );
};

ExpandableChat.displayName = "ExpandableChat";

const ExpandableChatHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex items-center justify-between p-4 bg-primary text-primary-foreground relative", className)}
    style={{
      borderBottom: `1px solid ${CHAT_BORDER_COLOR}`,
    }}
    {...props}
  >
    {props.children}
  </div>
);

ExpandableChatHeader.displayName = "ExpandableChatHeader";

const ExpandableChatBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("flex-grow overflow-y-auto p-4 bg-muted modern-chat-scrollbar", className)} {...props} />;

ExpandableChatBody.displayName = "ExpandableChatBody";

const ExpandableChatFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div 
    className={cn("p-4 bg-background", className)} 
    style={{
      borderTop: `1px solid ${CHAT_BORDER_COLOR}`,
    }}
    {...props} 
  />
);

ExpandableChatFooter.displayName = "ExpandableChatFooter";

interface ExpandableChatToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  isOpen: boolean;
  toggleChat: () => void;
}

const PureCSSChatIcon = () => (
  <div
    style={{
      width: '24px',
      height: '18px',
      backgroundColor: 'rgb(var(--primary-foreground))',
      borderRadius: '8px 8px 2px 8px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        position: 'absolute',
        bottom: '-4px',
        left: '4px',
        width: '0',
        height: '0',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid rgb(var(--primary-foreground))',
      }}
    />
    <div style={{ display: 'flex', gap: '2px' }}>
      <div style={{ width: '3px', height: '3px', backgroundColor: 'rgb(var(--primary))', borderRadius: '50%' }} />
      <div style={{ width: '3px', height: '3px', backgroundColor: 'rgb(var(--primary))', borderRadius: '50%' }} />
      <div style={{ width: '3px', height: '3px', backgroundColor: 'rgb(var(--primary))', borderRadius: '50%' }} />
    </div>
  </div>
);

const PureCSSCloseIcon = () => (
  <div
    style={{
      width: '24px',
      height: '24px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        position: 'absolute',
        width: '20px',
        height: '2px',
        backgroundColor: 'rgb(var(--primary-foreground))',
        transform: 'rotate(45deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: '20px',
        height: '2px',
        backgroundColor: 'rgb(var(--primary-foreground))',
        transform: 'rotate(-45deg)',
      }}
    />
  </div>
);

const ExpandableChatToggle: React.FC<ExpandableChatToggleProps> = ({
  className,
  icon,
  isOpen,
  toggleChat,
  ...props
}) => (
  <button
    onClick={toggleChat}
    style={{
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'rgb(var(--primary))',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      outline: 'none',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
    }}
    {...props}
  >
    {isOpen ? <PureCSSCloseIcon /> : (icon || <PureCSSChatIcon />)}
  </button>
);

ExpandableChatToggle.displayName = "ExpandableChatToggle";

export {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
};
