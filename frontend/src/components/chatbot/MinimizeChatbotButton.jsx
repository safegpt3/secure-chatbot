import React from "react";
import { Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

const MinimizeChatbotButton = ({ onClick }) => {
  return (
    <Button variant="ghost" onClick={onClick} aria-label="Minimize Chatbot">
      <Minus />
    </Button>
  );
};

export default MinimizeChatbotButton;
