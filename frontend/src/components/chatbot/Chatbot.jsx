// Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import scribe from "scribe.js-ocr/scribe.js";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import CloseChatbotButton from "@/components/chatbot/CloseChatbotButton";
import RefreshChatbotButton from "@/components/chatbot/RefreshChatbotButton";
import ChoiceOptions from "@/components/chatbot/ChoiceOptions";
import Spinner from "@/components/chatbot/Spinner";
import { processVideoFile } from "@/components/chatbot/VideoProcessor";

function Chatbot({
  userId,
  conversationId,
  conversation,
  handleNewMessage,
  resetConversation,
  isConnected,
  isSending,
  isTimedOut,
  openConnection,
  sendMessage,
  setIsChatbotOpen,
}) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [processedText, setProcessedText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const lastMessageRef = useRef();
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setInput(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
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

  const handleFileSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;

    console.log("File submitted:", file);

    try {
      const fileType = file.type;
      if (fileType === "video/mp4") {
        // Process video file
        const text = await processVideoFile(file);
        console.log("Extracted text from video frames:", text);
        const formattedText = text.replace(/\n/g, " \n");
        setProcessedText(formattedText);
      } else {
        // Process image or PDF file
        await scribe.init({ ocr: true, font: true });
        const text = await scribe.extractText([file]);
        console.log("Extracted text from image or pdf:", text);
        const formattedText = text.replace(/\n/g, " \n");
        setProcessedText(formattedText);
      }
    } catch (error) {
      console.error("Error performing OCR on file:", error);
    }

    setFile(null);
  };

  const handleSendProcessedText = () => {
    const newMessage = {
      action: "send",
      userId,
      conversationId,
      messageId: uuidv4(),
      type: "text",
      text: processedText.trim(),
      role: "user",
      internalType: "text",
    };

    if (processedText.trim()) {
      sendMessage(newMessage);
      handleNewMessage(newMessage);
      setProcessedText("");
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

  const closeChatbot = () => {
    setIsChatbotOpen(false);
    console.log("Chatbot minimized.");
  };

  function scrollToBottom() {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const lastMessage = conversation[conversation.length - 1];
  const isLastMessageChoice = lastMessage && lastMessage.type === "choice";

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  return (
    <>
      <Card className="fixed bottom-8 right-4 w-[800px] h-[80vh] z-50 flex flex-col">
        <CardHeader className="flex justify-between items-center border-b-2 border-black">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="mr-2">
                <AvatarFallback>Bot</AvatarFallback>
                <AvatarImage src={assistantAvatar} />
              </Avatar>
              <div>
                <CardTitle>SafeGPT</CardTitle>
                <CardDescription>Virtual Assistant</CardDescription>
              </div>
            </div>
            <div className="flex items-center">
              <RefreshChatbotButton onConfirm={refreshChatbot} />
              <CloseChatbotButton onClick={closeChatbot} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex">
          {/* Main Chat Area */}
          <div className="flex-1">
            <ScrollArea className="flex flex-col h-full w-full pr-4 overflow-auto">
              {conversation &&
                conversation.map &&
                conversation.map((message, index) => (
                  <div
                    key={index}
                    ref={lastMessageRef}
                    className="flex w-full gap-3 text-slate-600 text-sm my-2"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {message.role === "user" ? "U" : "Bot"}
                      </AvatarFallback>
                      <AvatarImage
                        src={
                          message.role === "user"
                            ? userAvatar
                            : assistantAvatar
                        }
                      />
                    </Avatar>
                    <p className="leading-relaxed ">
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
            <CardFooter className="flex-none">
              {isLastMessageChoice ? (
                <ScrollArea className="h-full w-full max-h-[150px] overflow-auto">
                  <ChoiceOptions
                    options={lastMessage.options}
                    onChoiceSelect={handleChoiceSubmit}
                  />
                </ScrollArea>
              ) : (
                <div className="w-full">
                  <form
                    className="w-full flex gap-2"
                    onSubmit={handleTextSubmit}
                  >
                    <Input
                      placeholder="Type your message..."
                      value={input}
                      onChange={handleInputChange}
                      disabled={!isConnected || isSending}
                    />
                    <Button
                      type="submit"
                      disabled={!isConnected || isSending}
                    >
                      {isSending ? <Spinner /> : "Send"}
                    </Button>
                    <Button type="button" onClick={toggleListening}>
                      {isListening ? "Stop" : "Speak"}
                    </Button>
                  </form>
                  <form
                    className="w-full flex gap-2 mt-2"
                    onSubmit={handleFileSubmit}
                  >
                    <input type="file" onChange={handleFileChange} />
                    <Button
                      type="submit"
                      disabled={!isConnected || isSending}
                    >
                      {isSending ? <Spinner /> : "Upload"}
                    </Button>
                  </form>
                </div>
              )}
            </CardFooter>
          </div>
          {/* Side Panel for Processed Text */}
          {processedText && (
            <div className="w-1/3 border-l border-gray-200 p-4">
              <h3 className="text-lg font-bold mb-2">Processed Text</h3>
              <ScrollArea className="h-full w-full overflow-auto">
                <p className="text-sm whitespace-pre-wrap">{processedText}</p>
              </ScrollArea>
              <Button className="mt-2" onClick={handleSendProcessedText}>
                Send to Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {isTimedOut && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <Alert className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <AlertTitle>Connection timed out</AlertTitle>
            <AlertDescription>
              You have timed out due to inactivity. Would you like to reconnect?
            </AlertDescription>
            <div className="mt-4">
              <Button className="mr-2" onClick={openConnection}>
                Yes, Reconnect
              </Button>
              <Button onClick={closeChatbot} className="mr-2">
                No, Close chatbot
              </Button>
            </div>
          </Alert>
        </div>
      )}
    </>
  );
}

export default Chatbot;
