import React, { useState, useRef } from "react";
import FloatingActionButton from "@/components/chatbot/FloatingActionButton";
import Chatbot from "@/components/chatbot/Chatbot";
import useAuth from "@/hooks/useAuth";
import useConversation from "@/hooks/useConversation";
import useWebSocket from "@/hooks/useWebSocket";
import { v4 as uuidv4 } from "uuid";

import DebugPannel from "@/components/chatbot/DebugPannel";

function ChatbotPage() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const [userId, setUserId] = useState("");

  const [conversationId, setConversationId] = useState(
    localStorage.getItem("conversationId") || uuidv4()
  );

  const [conversation, setConversation] = useState(() => {
    const savedConversation = localStorage.getItem("conversation");
    return savedConversation ? JSON.parse(savedConversation) : [];
  });

  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isDataVisible, setIsDataVisible] = useState(true);
  const [isChatbotMemory, setIsChatbotMemory] = useState(true);

  useAuth(setUserId);

  const { handleNewMessage, resetConversation } = useConversation(
    conversationId,
    setConversationId,
    conversation,
    setConversation
  );

  const { openConnection, sendMessage } = useWebSocket(
    wsRef,
    setIsConnected,
    setIsSending,
    setIsTimedOut,
    conversationId,
    handleNewMessage,
    userId
  );

  return (
    <>
      <DebugPannel
        conversationId={conversationId}
        userId={userId}
        isConnected={isConnected}
        isTimedOut={isTimedOut}
        isDataVisible={isDataVisible}
        setIsDataVisible={setIsDataVisible}
        isChatbotMemory={isChatbotMemory}
        setIsChatbotMemory={setIsChatbotMemory}
        sendMessage={sendMessage}
        setIsSending={setIsSending}
      />
      {isChatbotOpen ? (
        <Chatbot
          userId={userId}
          conversationId={conversationId}
          conversation={conversation}
          handleNewMessage={handleNewMessage}
          resetConversation={resetConversation}
          isConnected={isConnected}
          isSending={isSending}
          isTimedOut={isTimedOut}
          openConnection={openConnection}
          sendMessage={sendMessage}
          setIsChatbotOpen={setIsChatbotOpen}
        />
      ) : (
        <FloatingActionButton
          openConnection={openConnection}
          setIsChatbotOpen={setIsChatbotOpen}
          setIsTimedOut={setIsTimedOut}
        />
      )}
    </>
  );
}

export default ChatbotPage;
