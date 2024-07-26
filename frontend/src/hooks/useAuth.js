import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const useAuth = (setUserId) => {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      authenticateUser(token);
    } else {
      console.log("Auth token not provided.");
    }
  }, []);

  const authenticateUser = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      const fetchedUserId = decodedToken.id;
      console.log("Authenticated user with token: ", token);
      setUserId(fetchedUserId);
    } catch (error) {
      console.error("Failed to decode token:", error);
    }
  };

  return { authenticateUser };
};

export default useAuth;
