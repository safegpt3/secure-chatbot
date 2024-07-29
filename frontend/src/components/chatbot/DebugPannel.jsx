import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/chatbot/Spinner";

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
  setIsSending,
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(
          `YOUR_BACKEND_API_ENDPOINT?userId=${userId}`,
          {
            method: "GET",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const data = await response.json();
        setIsDataVisible(data.anonymizationSetting);
        setIsChatbotMemory(data.memorySetting);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, [userId, setIsDataVisible, setIsChatbotMemory]);

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

  if (loading) {
    return <Spinner />;
  }

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
        disabled={setIsSending}
      >
        {setIsSending ? <Spinner /> : "Data Visibility Toggle"}
      </Button>

      <Button
        className="m-2 mt-8 bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleChatbotMemory}
        disabled={setIsSending}
      >
        {setIsSending ? <Spinner /> : "Chatbot Memory Toggle"}
      </Button>
    </div>
  );
}

export default DebugPannel;
