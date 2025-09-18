import React from "react";
import { ChakraProvider, Box, createSystem, defaultConfig } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Header from './Header';


const system = createSystem(defaultConfig);

export const App: React.FC = () => {
  return (
    <ChakraProvider value={system}>
      <BrowserRouter>
        <Box as="main">
          <Header />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
          </Routes>
        </Box>
      </BrowserRouter>
    </ChakraProvider>
  );
};

export default App;
