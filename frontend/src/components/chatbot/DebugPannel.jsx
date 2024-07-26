import React from "react";
import { Button } from "@/components/ui/button";

function DebugPannel({
  conversationId,
  userId,
  isConnected,
  isTimedOut,
  isDataVisible,
  setIsDataVisible,
}) {
  const toggleDataVisibility = () => {
    setIsDataVisible(!isDataVisible);
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
      <Button
        className="mt-8 bg-black text-white font-semibold py-2 px-4 rounded hover:bg-gray-600"
        onClick={toggleDataVisibility}
      >
        Data Visibility Toggle
      </Button>
    </div>
  );
}

export default DebugPannel;
