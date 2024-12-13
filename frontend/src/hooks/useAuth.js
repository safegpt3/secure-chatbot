import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const useAuth = (setUserId) => {
  useEffect(() => {
    // const token = new URLSearchParams(window.location.search).get("token");
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzRhYmNkIiwidXNlcm5hbWUiOiJ1c2VyIiwiaWF0IjoxNzIyMDI3NTE4LCJleHAiOjE3MjIwMzExMTh9.heIiDB2MbUsJrPK5wCAskWPNyQ0R_gFRsx6Pnlogmmk";
    if (token) {
      authenticateUser(token);
    } else {
      console.log("Auth token not provided.");
    }
  }, []);

  const authenticateUser = async (token) => {
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
