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
      role: messageData.role || "bot",
      type: messageData.type,
      options: messageData.options || [],
    };

    setConversation((conversation) => [...conversation, newMessage]);
    console.log("New message added to conversation:", conversation);
  };

  const updateLastMessage = (messageData) => {
    console.log("Updating last message: ", messageData);

    setConversation((conversation) => {
      const updatedConversation = [...conversation];
      if (updatedConversation.length > 0) {
        updatedConversation[updatedConversation.length - 1] = {
          text: messageData.text,
          role: messageData.role || "bot",
          type: messageData.type,
          options: messageData.options || [],
        };
      }

      return updatedConversation;
    });

    console.log("Last message updated in conversation:", conversation);
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
    updateLastMessage,
    resetConversation,
  };
};

export default useConversation;
