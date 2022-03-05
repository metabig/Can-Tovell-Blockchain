import React from "react";
import CustomNavBar from "./components/CustomNavBar";
import Dashboard from "./components/Dashboard";
import ChartView from "./components/ChartView";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const Footer = () => (
  <footer className="page-footer font-small blue pt-4">
    <div
      style={{ color: "rgb(52, 71, 103)" }}
      className="footer-copyright text-center py-3"
    >
      <b>Repte Blockchain 4SDG</b> · Antoni Bergas Galmés · Guillem Pascual
      Martí · Inés Sunyer Guiscafré
    </div>
  </footer>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CustomNavBar />
              <Dashboard />
              <Footer />
            </>
          }
        />
        <Route
          path="/:id"
          element={
            <>
              <CustomNavBar />
              <ChartView />
              <Footer />
            </>
          }
        ></Route>
      </Routes>
    </Router>
  );
}

export default App;
