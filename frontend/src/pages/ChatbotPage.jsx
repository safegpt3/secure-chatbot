import React, { useState, useRef } from "react";
import FloatingActionButton from "@/components/chatbot/FloatingActionButton";
import Chatbot from "@/components/chatbot/Chatbot";
import useAuth from "@/hooks/useAuth";
import useConversation from "@/hooks/useConversation";
import useWebSocket from "@/hooks/useWebSocket";
import { v4 as uuidv4 } from "uuid";

function ChatbotPage() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const [userId, setUserId] = useState("1234abcd");

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

  useAuth(userId, setUserId);

  const { handleNewMessage, resetConversation } = useConversation(
    conversationId,
    setConversationId,
    conversation,
    setConversation
  );

  const { openConnection, closeConnection, sendMessage } = useWebSocket(
    wsRef,
    isConnected,
    setIsConnected,
    isSending,
    setIsSending,
    conversationId,
    handleNewMessage
  );

  return (
    <>
      <div>
        <p>conversationId: {conversationId}</p>
        <p>userId: {userId}</p>
        <p>Is websocket connected: {isConnected.toString()}</p>
      </div>
      {isChatbotOpen ? (
        <Chatbot
          userId={userId}
          conversationId={conversationId}
          conversation={conversation}
          handleNewMessage={handleNewMessage}
          resetConversation={resetConversation}
          isConnected={isConnected}
          isSending={isSending}
          openConnection={openConnection}
          closeConnection={closeConnection}
          sendMessage={sendMessage}
          setIsChatbotOpen={setIsChatbotOpen}
        />
      ) : (
        <FloatingActionButton
          openConnection={openConnection}
          setIsChatbotOpen={setIsChatbotOpen}
        />
      )}
    </>
  );
}

export default ChatbotPage;
