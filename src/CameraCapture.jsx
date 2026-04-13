import React, { useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Start camera
  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API not supported by your browser.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      alert("Camera access denied or not supported.");
      console.error("getUserMedia error:", err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      videoRef.current.srcObject = null;
    }
  };

  // Capture photo from video
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;  // fallback width
    canvas.height = video.videoHeight || 480; // fallback height

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");
    setPhotos((prev) => [...prev, imageData]);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Camera Capture</h2>
      <div>
        <button onClick={startCamera} disabled={!!stream}>Start Camera</button>
        <button onClick={capturePhoto} disabled={!stream}>Capture Photo</button>
        <button onClick={stopCamera} disabled={!stream}>Stop Camera</button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "320px", height: "240px", marginTop: 10, border: "1px solid #ccc" }}
      />

      <div style={{ marginTop: 20 }}>
        <h3>Captured Photos:</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {photos.map((src, i) => (
            <img key={i} src={src} alt={`Captured ${i}`} width={160} style={{ border: "1px solid #aaa" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
