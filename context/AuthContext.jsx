import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // -------------------------
  // AUTH CHECK
  // -------------------------
  const checkAuth = async () => {
    if (!token) return;

    axios.defaults.headers.common["token"] = token;

    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        initSocket(data.user);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      logout(); // automatically clear invalid token
    }
  };

  // -------------------------
  // LOGIN
  // -------------------------
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        setToken(data.token);
        localStorage.setItem("token", data.token);
        axios.defaults.headers.common["token"] = data.token;
        toast.success(data.message);
        initSocket(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  // -------------------------
  // LOGOUT
  // -------------------------
  const logout = () => {
    setAuthUser(null);
    setToken(null);
    setOnlineUsers([]);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["token"];

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    toast.success("Logged out successfully");
  };

  // -------------------------
  // UPDATE PROFILE
  // -------------------------
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  // -------------------------
  // SOCKET CONNECTION
  // -------------------------
  const initSocket = (userData) => {
    if (!userData) return;

    // Disconnect old socket if exists
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(backendUrl, {
      query: { userId: userData._id }
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });

    setSocket(newSocket);
  };

  // -------------------------
  // INITIAL EFFECT
  // -------------------------
  useEffect(() => {
    checkAuth();
  }, []);

  // -------------------------
  // CONTEXT VALUE
  // -------------------------
  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
