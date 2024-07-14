import React from "react";
import { Button } from "@/components/ui/button";

function FloatingActionButton({ openConnection, setIsChatbotOpen }) {
  const openChatbot = () => {
    openConnection();
    setIsChatbotOpen(true);
  };

  return (
    <div className="fixed bottom-8 right-8">
      <Button
        className=" bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg text-2xl flex items-center justify-center w-20 h-20"
        aria-label="Open chatbot"
        onClick={openChatbot}
      >
        ?
      </Button>
    </div>
  );
}

export default FloatingActionButton;
