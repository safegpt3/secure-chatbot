import { useState, useRef, useEffect } from "react";

const useWebSocket = (
  wsRef,
  isConnected,
  setIsConnected,
  isSending,
  setIsSending,
  conversationId,
  handleNewMessage
) => {
  const wsURL = process.env.WS_URL;

  const firstRenderRef = useRef(true);

  const openConnection = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current = new WebSocket(wsURL + conversationId);

      wsRef.current.onopen = () => {
        console.log("onopen - WebSocket connection opened");
        setIsConnected(true);
      };

      wsRef.current.onclose = (event) => {
        console.log("onclose - WebSocket connection closed", event);
        setIsConnected(false);
      };

      wsRef.current.onmessage = (event) => {
        recieveMessage(event);
        console.log("onmessage - message received:", event.data);
      };

      wsRef.current.onerror = (error) => {
        console.log("onerror - error in WebSocket connection:", error);
      };
    } else {
      console.log("WebSocket connection already open.");
    }
  };

  const closeConnection = () => {
    if (wsRef.current) {
      wsRef.current.close();
      console.log("WebSocket connection closed");
    }
  };

  const sendMessage = (message) => {
    if (wsRef.current) {
      setIsSending(true);
      wsRef.current.send(JSON.stringify(message));
      console.log("Sent message: ", message);
    } else {
      console.log("Cannot send message, WebSocket is not connected");
    }
  };

  const recieveMessage = (event) => {
    const messageData = JSON.parse(event.data);
    handleNewMessage(messageData);
    setIsSending(false);
  };

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
    } else {
      closeConnection();
      openConnection();
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, []);

  return {
    openConnection,
    closeConnection,
    sendMessage,
    recieveMessage,
  };
};

export default useWebSocket;
