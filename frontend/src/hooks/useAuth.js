import { useState, useEffect } from "react";

const useAuth = () => {
  // stub implementation

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      authenticateUser(token);
    } else {
      console.log("Auth token not provided.");
    }
  }, []);

  const authenticateUser = (token) => {
    console.log("authenticated user with token: ", token);
    // You might want to set the user ID here based on the response from your server
    // For example:
    // setUserId(fetchedUserId);
  };

  return { authenticateUser };
};

export default useAuth;
