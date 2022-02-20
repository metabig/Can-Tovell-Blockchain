import React, { useState, useEffect } from "react";

function App() {
  let [sensor, setSensor] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8100/api/history/sensor1")
      .then((res) => res.json())
      .then((json) => setSensor(JSON.stringify(json)));
  }, []);

  return <div>{sensor && <code>{sensor}</code>}</div>;
}

export default App;
