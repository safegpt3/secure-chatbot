import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/chatbot/Spinner";

function DebugPannel({
  conversationId,
  userId,
  isConnected,
  isTimedOut,
  isDataVisible,
  setIsDataVisible,
  isChatbotMemory,
  setIsChatbotMemory,
  sendMessage,
  isSending,
  setIsSending,
}) {
  const toggleDataVisibility = async () => {
    const newVisibility = !isDataVisible;
    setIsDataVisible(newVisibility);
    setIsSending(true);
    try {
      await sendMessage({
        action: "userSettings",
        userId,
        memorySetting: isChatbotMemory,
        anonymizationSetting: newVisibility,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
    }
    setIsSending(false);
  };

  const toggleChatbotMemory = async () => {
    const newMemory = !isChatbotMemory;
    setIsChatbotMemory(newMemory);
    setIsSending(true);
    try {
      await sendMessage({
        action: "userSettings",
        userId,
        memorySetting: newMemory,
        anonymizationSetting: isDataVisible,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
    }
    setIsSending(false);
  };

  return (
    <div className="bg-gray-50 shadow-md rounded-lg p-6 max-w-lg m-4">
      <p className="text-gray-700">
        <span className="font-medium">Conversation ID:</span> {conversationId}
      </p>
      <p className="text-gray-700">
        <span className="font-medium">User ID:</span> {userId}
      </p>
      <p className="text-gray-700">
        <span className="font-medium">WebSocket Connected:</span>{" "}
        {isConnected.toString()}
      </p>
      <p className="text-gray-700">
        <span className="font-medium">Timed Out:</span> {isTimedOut.toString()}
      </p>
      <Button
        className="m-2 t-8 bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleDataVisibility}
        disabled={isSending}
      >
        {isSending ? <Spinner /> : "Data Visibility Toggle"}
      </Button>

      <Button
        className="m-2 mt-8 bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleChatbotMemory}
        disabled={isSending}
      >
        {isSending ? <Spinner /> : "Chatbot Memory Toggle"}
      </Button>
    </div>
  );
}

export default DebugPannel;
