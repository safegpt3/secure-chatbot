import React from "react";
import { Button } from "@/components/ui/button";

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
}) {
  const toggleDataVisibility = () => {
    const newVisibility = !isDataVisible;
    setIsDataVisible(newVisibility);
    sendMessage({
      action: "userSettings",
      userId,
      memorySetting: isChatbotMemory,
      anonymizationSetting: newVisibility,
    });
  };

  const toggleChatbotMemory = () => {
    const newMemory = !isChatbotMemory;
    setIsChatbotMemory(newMemory);
    sendMessage({
      action: "userSettings",
      userId,
      memorySetting: newMemory,
      anonymizationSetting: isDataVisible,
    });
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
      <p className="text-gray-700">
        <span className="font-medium">Data Visible: </span>{" "}
        {isDataVisible.toString()}
      </p>
      <p className="text-gray-700">
        <span className="font-medium">Chatbot Memory: </span>{" "}
        {isChatbotMemory.toString()}
      </p>
      <Button
        className="m-2 t-8 bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleDataVisibility}
      >
        Data Visibility Toggle
      </Button>

      <Button
        className="m-2 mt-8 bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleChatbotMemory}
      >
        Chatbot Memory Toggle
      </Button>
    </div>
  );
}

export default DebugPannel;
