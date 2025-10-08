"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Settings } from "lucide-react";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat";
import { ChatInput } from "@/components/ui/chat-input";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSettings {
  welcomeMessage: string;
  placeholderText: string;
  buttonIcon: string;
  botIcon?: string | null; // Foto de perfil - aparece no header
  userIcon?: string | null;
  supportIcon?: string | null; // Foto do suporte - aparece nas mensagens
  isEnabled: boolean;
  chatPosition: "bottom-right" | "bottom-left";
  chatSize: "sm" | "md" | "lg" | "xl" | "full";
  primaryColor?: string;
  secondaryColor?: string;
  chatTitle?: string;
}

const generateSessionId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};



export default function ChatAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sessionId] = useState(() => generateSessionId());
  const [settings, setSettings] = useState<ChatSettings>({
    welcomeMessage: "Olá! Como posso te ajudar hoje?",
    placeholderText: "Digite sua mensagem...",
    buttonIcon: "MessageSquare",
    isEnabled: false, // Começa como false para não aparecer antes de carregar do banco
    chatPosition: "bottom-right",
    chatSize: "md"
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  
  // Buffer para acumular mensagens
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Load chat settings and conversation history
  useEffect(() => {
    const loadChatData = async () => {
      try {
        // Load settings
        const settingsResponse = await fetch("/api/chat/settings");
        if (settingsResponse.ok) {
          const chatSettings = await settingsResponse.json();
          console.log('🔍 [CHAT] Loaded chat settings:', chatSettings);
          console.log('🔍 [CHAT] Bot icon:', chatSettings.botIcon ? (typeof chatSettings.botIcon === 'string' ? 'Present (' + chatSettings.botIcon.substring(0, 50) + '...)' : 'Present (Binary Data)') : 'Not set');
          console.log('🔍 [CHAT] Support icon:', chatSettings.supportIcon ? (typeof chatSettings.supportIcon === 'string' ? 'Present (' + chatSettings.supportIcon.substring(0, 50) + '...)' : 'Present (Binary Data)') : 'Not set');
          setSettings(prev => ({ ...prev, ...chatSettings }));
          // Pequeno delay para garantir que não apareça antes das configurações serem aplicadas
          setTimeout(() => {
            setSettingsLoaded(true);
          }, 100);
        } else {
          // Se não conseguir carregar as configurações, marca como carregado mas desabilitado
          setTimeout(() => {
            setSettingsLoaded(true);
          }, 100);
        }

        // Load conversation history
        const historyResponse = await fetch(`/api/chat/conversations/${sessionId}`);
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          const formattedHistory = history.map((conv: any) => [
            {
              id: `${conv.id}_user`,
              content: conv.userMessage,
              isUser: true,
              timestamp: new Date(conv.timestamp)
            },
            conv.botResponse ? {
              id: `${conv.id}_bot`,
              content: conv.botResponse,
              isUser: false,
              timestamp: new Date(conv.timestamp)
            } : null
          ]).flat().filter(Boolean);
          
          setMessages(formattedHistory);
        }

        // If there's history, it's already set in the formattedHistory above
      } catch (error) {
        console.error("Error loading chat data:", error);
      }
    };

    loadChatData();
  }, [sessionId]);

  // Cleanup do timer quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);



  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Função para enviar todas as mensagens do buffer para o webhook
  const sendBufferedMessages = async (bufferedMessages: string[]) => {
    if (bufferedMessages.length === 0) return;

    const combinedMessage = bufferedMessages.join('\n\n');
    
    try {
      setIsLoading(true);
      
      // Verificar se é a primeira vez enviando mensagens (primeira resposta)
      const botMessagesCount = messages.filter(msg => !msg.isUser).length;
      const isFirstResponse = botMessagesCount === 0;
      
      if (isFirstResponse) {
        // Adicionar mensagem de atendimento automático antes da primeira resposta
        const attendantMessage: Message = {
          id: `attendant_${Date.now()}`,
          content: "Um de nossos atendentes estará com você em até 4 minutos. Pedimos que aguarde um instante",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, attendantMessage]);
      }
      
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: combinedMessage,
          sessionId,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: `bot_${Date.now()}`,
          content: data.response || "Desculpe, não consegui processar sua mensagem.",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending buffered messages:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "Desculpe, ocorreu um erro. Tente novamente mais tarde.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsBuffering(false);
      setMessageBuffer([]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue.trim();
    setInputValue("");

    // Check if this is the first user message (only count user messages before adding current one)
    const userMessagesCount = messages.filter(msg => msg.isUser).length;
    const isFirstMessage = userMessagesCount === 1; // Agora é 1 porque já adicionamos a mensagem atual
    
    if (isFirstMessage) {
      // Iniciar o buffer com a primeira mensagem
      setMessageBuffer([messageContent]);
      setIsBuffering(true);
      
      // Configurar timer para enviar após 20 segundos
      bufferTimerRef.current = setTimeout(() => {
        setMessageBuffer(currentBuffer => {
          sendBufferedMessages(currentBuffer);
          return [];
        });
      }, 20000);
      
      return;
    }

    // Se já está no modo buffer, adicionar mensagem ao buffer
    if (isBuffering) {
      setMessageBuffer(prev => [...prev, messageContent]);
      
      // Resetar o timer para mais 20 segundos
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
      
      bufferTimerRef.current = setTimeout(() => {
        setMessageBuffer(currentBuffer => {
          sendBufferedMessages(currentBuffer);
          return [];
        });
      }, 20000);
      
      return;
    }

    // Se não está no modo buffer, processar normalmente (isso não deve acontecer após a primeira mensagem)
    try {
      setIsLoading(true);
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          timestamp: userMessage.timestamp.toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: `bot_${Date.now()}`,
          content: data.response || "Desculpe, não consegui processar sua mensagem.",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "Desculpe, ocorreu um erro. Tente novamente mais tarde.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Function to process message content and make links clickable
  const processMessageContent = (content: string) => {
    const parts = content.split(/(https:\/\/unipetplan\.com\.br\/planos)/g);
    
    return parts.map((part, index) => {
      if (part === 'https://unipetplan.com.br/planos') {
        return (
          <span
            key={index}
            onClick={() => navigate('/planos')}
            style={{
              color: 'var(--text-teal)',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            data-testid="link-planos"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Não renderizar até que as configurações sejam carregadas do banco
  // E verificar se realmente está habilitado
  if (!settingsLoaded || !settings?.isEnabled) {
    return null;
  }

  return (
    <ExpandableChat
      position={settings.chatPosition}
      size={settings.chatSize}
    >
      <ExpandableChatHeader>
        <div className="flex items-center space-x-3">
          <div className="relative">
            {settings.botIcon ? (
              <img src={settings.botIcon} alt="Assistente" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--bg-teal-light)] flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[var(--bg-emerald)] rounded-full border-2 border-[var(--bg-teal)]" />
          </div>
          <div>
            <span className="font-medium text-base">{settings.chatTitle || "Atendimento Virtual"}</span>
            <p className="text-xs text-[var(--text-light)]/90">Disponível</p>
          </div>
        </div>
      </ExpandableChatHeader>

      <ExpandableChatBody>
        <div className="space-y-4">
          {/* Mensagem de boas-vindas centralizada */}
          {messages.length === 0 && settings.welcomeMessage && (
            <div className="flex justify-center items-center py-8">
              <div className="bg-[var(--bg-cream-light)] rounded-lg px-4 py-3 text-center max-w-xs">
                <p className="text-[var(--text-dark-primary)] text-base">{settings.welcomeMessage}</p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start animate-fade-in",
                message.isUser ? "justify-end" : "justify-start space-x-2"
              )}
            >
              {!message.isUser && (
                <div className="flex-shrink-0 relative">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-teal)] flex items-center justify-center shadow-sm">
                    {settings.botIcon ? (
                      <img src={settings.userIcon || settings.botIcon} alt="Bot" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <Settings className="h-4 w-4 text-[var(--text-light)]" />
                    )}
                  </div>
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm relative",
                  message.isUser 
                    ? "bg-[var(--bg-teal)] text-[var(--text-light)] rounded-br-sm" 
                    : "bg-[var(--bg-cream-lighter)] border border-[var(--border-teal-light)] text-[var(--text-dark-primary)] rounded-bl-sm"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.isUser ? message.content : processMessageContent(message.content)}
                </p>
                <div className={cn(
                  "absolute w-2 h-2 transform rotate-45",
                  message.isUser 
                    ? "bg-[var(--bg-teal)] -right-1 bottom-3" 
                    : "bg-[var(--bg-cream-lighter)] border-l border-b border-[var(--border-teal-light)] -left-1 top-3"
                )} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-2 animate-fade-in">
              <div className="flex-shrink-0 relative">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-teal)] flex items-center justify-center shadow-sm">
                  {settings.botIcon ? (
                    <img src={settings.userIcon || settings.botIcon} alt="Bot" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <Settings className="h-4 w-4 text-[var(--text-light)]" />
                  )}
                </div>
              </div>
              <div className="bg-[var(--bg-cream-lighter)] border border-[var(--border-teal-light)] rounded-lg rounded-bl-sm px-3 py-2 shadow-sm relative">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-[var(--bg-teal)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[var(--bg-teal)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[var(--bg-teal)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-[var(--text-dark-secondary)]">Digitando...</span>
                </div>
                <div className="absolute w-2 h-2 bg-[var(--bg-cream-lighter)] border-l border-b border-[var(--border-teal-light)] transform rotate-45 -left-1 top-3" />
              </div>
            </div>
          )}
          {isBuffering && !isLoading && (
            <div className="flex items-center justify-center py-2">
              <div className="bg-[var(--bg-teal-lighter)] border border-[var(--border-teal-light)] rounded-lg px-3 py-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[var(--bg-teal)] rounded-full animate-pulse" />
                  <span className="text-xs text-[var(--text-teal)]">
                    Aguardando mais mensagens... ({messageBuffer.length} mensagem{messageBuffer.length > 1 ? 's' : ''} no buffer)
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ExpandableChatBody>

      <ExpandableChatFooter>
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <ChatInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={settings.placeholderText}
              disabled={isLoading}
              className="rounded-lg border-[var(--border-teal-light)] transition-all duration-200 bg-[var(--bg-cream-light)]"
            />
          </div>
          {inputValue.trim() && (
            <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-teal)',
              border: 'none',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px 0 var(--shadow-medium)',
              opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1,
              pointerEvents: (!inputValue.trim() || isLoading) ? 'none' : 'auto',
              animation: 'fadeInUp 0.3s ease-out',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              if (!(!inputValue.trim() || isLoading)) {
                e.currentTarget.style.backgroundColor = "var(--bg-teal-dark)";
                e.currentTarget.style.boxShadow = "0 2px 4px 0 var(--shadow-dark)";
              }
            }}
            onMouseLeave={(e) => {
              if (!(!inputValue.trim() || isLoading)) {
                e.currentTarget.style.backgroundColor = "var(--bg-teal)";
                e.currentTarget.style.boxShadow = "0 1px 2px 0 var(--shadow-medium)";
              }
            }}
          >
            {isLoading ? (
              <Loader2 style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }} className="animate-spin" />
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                height="22px" 
                viewBox="0 -960 960 960" 
                width="22px" 
                fill="currentColor"
                style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
              >
                <path d="M442.5-170v-476L223-426.5 170-480l310-310 310 310-53 53.5L517.5-646v476h-75Z"/>
              </svg>
            )}
            </button>
          )}
        </div>
      </ExpandableChatFooter>
    </ExpandableChat>
  );
}