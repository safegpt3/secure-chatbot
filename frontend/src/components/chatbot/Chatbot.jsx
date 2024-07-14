import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import userAvatar from "@/assets/user_profile_icon.png";
import assistantAvatar from "@/assets/bot_profile_icon.png";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { RefreshCcw } from "lucide-react";

import CloseChatbotButton from "@/components/chatbot/CloseChatbotButton";
import MinimizeChatbotButton from "@/components/chatbot/MinimizeChatbotButton";
import RefreshChatbotButton from "@/components/chatbot/RefreshChatbotButton";
import ChoiceOptions from "@/components/chatbot/ChoiceOptions";

function Chatbot({
  userId,
  conversationId,
  conversation,
  handleNewMessage,
  resetConversation,
  isConnected,
  isSending,
  closeConnection,
  sendMessage,
  setIsChatbotOpen,
}) {
  const [input, setInput] = useState("");

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleTextSubmit = (event) => {
    event.preventDefault();
    console.log("Form submitted with input:", input);

    const newMessage = {
      action: "send",
      userId,
      conversationId,
      messageId: uuidv4(),
      type: "text",
      text: input.trim(),
      role: "user",
      internalType: "text",
    };

    if (input.trim()) {
      sendMessage(newMessage);
      handleNewMessage(newMessage);
      setInput("");
    }
  };

  const handleChoiceSubmit = (choice) => {
    console.log("Choice selected:", choice);

    const newMessage = {
      action: "send",
      userId,
      conversationId,
      messageId: uuidv4(),
      type: "text",
      text: choice.label,
      role: "user",
      internalType: "choice",
      payload: { value: choice.value },
    };

    sendMessage(newMessage);
    handleNewMessage(newMessage);
  };

  const refreshChatbot = () => {
    resetConversation();
    console.log("Chatbot refreshed.");
  };

  const minimizeChatbot = () => {
    setIsChatbotOpen(false);
    console.log("Chatbot minimized.");
  };

  const closeChatbot = () => {
    resetConversation();
    closeConnection();
    setIsChatbotOpen(false);
    console.log("Chatbot closed.");
  };

  const lastMessage = conversation[conversation.length - 1];
  const isLastMessageChoice = lastMessage && lastMessage.type === "choice";

  return (
    <Card className="fixed bottom-8 right-4 w-[440px] h-[80vh] z-50 flex flex-col">
      <CardHeader className="flex justify-between items-center border-b-2 border-black">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="mr-2">
              <AvatarFallback>Bot</AvatarFallback>
              <AvatarImage src={assistantAvatar} />
            </Avatar>
            <div>
              <CardTitle>Sano</CardTitle>
              <CardDescription>Virtual Assistant</CardDescription>
            </div>
          </div>
          <div className="flex items-center">
            <RefreshChatbotButton onConfirm={refreshChatbot} />
            <MinimizeChatbotButton onClick={minimizeChatbot} />
            <CloseChatbotButton onConfirm={closeChatbot} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="flex flex-col h-full w-full pr-4 overflow-auto">
          {conversation &&
            conversation.map &&
            conversation.map((message, index) => (
              <div
                key={index}
                className="flex w-full gap-3 text-slate-600 text-sm my-2"
              >
                <Avatar>
                  <AvatarFallback>
                    {message.role === "user" ? "U" : "Bot"}
                  </AvatarFallback>
                  <AvatarImage
                    src={message.role === "user" ? userAvatar : assistantAvatar}
                  />
                </Avatar>
                <p className="leading-relaxed">
                  <span className="block font-bold text-slate-700">
                    {message.role === "user" ? "User" : "Bot"}
                  </span>
                  {message.text}
                </p>
              </div>
            ))}
          {isSending && (
            <div className="flex w-full gap-3 text-slate-600 text-sm my-2">
              <Avatar>
                <AvatarFallback>Bot</AvatarFallback>
                <AvatarImage src={assistantAvatar} />
              </Avatar>
              <p className="leading-relaxed">
                <span className="block font-bold text-slate-700">Bot</span>
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-none">
        {isLastMessageChoice ? (
          <ScrollArea className="h-full w-full max-h-[150px] overflow-auto">
            <ChoiceOptions
              options={lastMessage.options}
              onChoiceSelect={handleChoiceSubmit}
            />
          </ScrollArea>
        ) : (
          <form className="w-full flex gap-2" onSubmit={handleTextSubmit}>
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
              disabled={!isConnected || isSending}
            />
            <Button type="submit" disabled={!isConnected || isSending}>
              {isSending ? <RefreshCcw /> : "Send"}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}

export default Chatbot;
