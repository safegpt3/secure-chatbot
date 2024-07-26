import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CloseChatbotButton = ({ onClick }) => {
  return (
    <Button variant="ghost" onClick={onClick} aria-label="Close Chatbot">
      <X />
    </Button>
  );
};

export default CloseChatbotButton;
