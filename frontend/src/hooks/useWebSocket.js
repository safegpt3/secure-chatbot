import { useEffect } from "react";

const useWebSocket = (
  wsRef,
  setIsConnected,
  setIsSending,
  setIsTimedOut,
  conversationId,
  handleNewMessage,
  userId
) => {
  const constructWsUrl = (baseUrl, conversationId, userId) => {
    const url = new URL(baseUrl);
    url.searchParams.append("conversationId", conversationId);
    if (userId) {
      url.searchParams.append("userId", userId);
    }
    return url.toString();
  };

  const openConnection = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const wsURL = constructWsUrl(
        import.meta.env.VITE_WS_URL,
        conversationId,
        userId
      );
      console.log("wsURL: ", wsURL);
      wsRef.current = new WebSocket(wsURL);

      wsRef.current.onopen = () => {
        console.log("onopen - WebSocket connection opened");
        setIsConnected(true);
        setIsTimedOut(false);
      };

      wsRef.current.onclose = (event) => {
        console.log("onclose - WebSocket connection closed", event);
        setIsConnected(false);
        if (event.code === 1001) {
          setIsTimedOut(true);
        }
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
    if (userId && conversationId) {
      closeConnection();
      openConnection();
    }
  }, [conversationId, userId]);

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
