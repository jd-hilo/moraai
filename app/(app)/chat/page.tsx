import { Suspense } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[#888]">Loading...</div>}>
      <ChatInterface />
    </Suspense>
  );
}
