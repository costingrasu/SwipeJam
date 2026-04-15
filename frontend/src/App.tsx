import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Jams from "./pages/Jams";
import JamSession from "./pages/JamSession";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Header from "./components/Header";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-dough flex items-center justify-center font-bold text-jam-purple text-xl">Loading SwipeJam...</div>;
  }

  return user ? (
    <div className="min-h-screen bg-dough flex flex-col items-center">
      <Header />
      <main className="flex-1 w-full max-w-7xl">
        {children}
      </main>
    </div>
  ) : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-dough flex items-center justify-center font-bold text-jam-purple text-xl">Loading SwipeJam...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/jams" element={<PrivateRoute><Jams /></PrivateRoute>} />
      <Route path="/jam/:id" element={<PrivateRoute><JamSession /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
