import React from 'react';
import ChatAI from '@/components/chat/chat-ai';

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <>
      {children}
      <ChatAI />
    </>
  );
}