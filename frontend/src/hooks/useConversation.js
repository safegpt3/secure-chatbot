import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const useConversation = (
  conversationId,
  setConversationId,
  conversation,
  setConversation
) => {
  useEffect(() => {
    localStorage.setItem("conversation", JSON.stringify(conversation));
  }, [conversation]);

  useEffect(() => {
    localStorage.setItem("conversationId", conversationId);
  }, [conversationId]);

  const handleNewMessage = (messageData) => {
    console.log("New message: ", messageData);

    const newMessage = {
      text: messageData.text,
      role: messageData.role || "assistant",
      type: messageData.type,
      options: messageData.options || [],
    };

    setConversation((conversation) => [...conversation, newMessage]);
    console.log("New message added to conversation:", conversation);
  };

  const resetConversation = () => {
    setConversation([]);
    localStorage.removeItem("conversation");
    console.log("Stored conversation deleted.");
    setConversationId(uuidv4());
    console.log("New conversationId created.");
  };

  return {
    handleNewMessage,
    resetConversation,
  };
};

export default useConversation;
