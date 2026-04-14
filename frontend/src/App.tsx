import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
  // TODO: We will replace this with real Context state in Step 3 after bridging with backend
  const isAuthenticated = false;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={isAuthenticated ? <Home /> : <Navigate to="/login" replace />}
        />
        {/* TODO: Add back CreateJam and JamSession protected routes in Phase 3 & 4 */}
      </Routes>
    </Router>
  );
}

export default App;
