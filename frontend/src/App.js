import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <Footer />
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            border: "1px solid #27272a",
            color: "#fff",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            borderRadius: 0,
          },
        }}
      />
    </div>
  );
}

export default App;
