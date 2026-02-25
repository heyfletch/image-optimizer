import { useEffect, useState } from "react";
import { startSidecar, sendRequest } from "./lib/ipc";

function App() {
  const [status, setStatus] = useState("Starting sidecar...");

  useEffect(() => {
    startSidecar()
      .then(() =>
        sendRequest({
          action: "ping",
          inputPath: "",
          outputPath: "",
          settings: {
            format: "same",
            quality: 92,
            width: null,
            height: null,
            maintainAspectRatio: true,
            maxFileSize: null,
            svgMode: null,
          },
        })
      )
      .then((response) => {
        console.log("Ping response:", response);
        setStatus(response.success ? "Sidecar connected" : "Sidecar error");
      })
      .catch((err) => {
        console.error("Sidecar failed:", err);
        setStatus("Sidecar failed to start");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-800">Image Optimizer</h1>
        <p className="mt-2 text-gray-500">{status}</p>
      </div>
    </div>
  );
}

export default App;
