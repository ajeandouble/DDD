import { createContext, useContext } from "react";

export const SSEContext = createContext(false);
export const useSSEConnected = () => useContext(SSEContext);
