// Komponen utama untuk mendeteksi gesture tangan dan menjalankan aksi berdasarkan model
import React, { useEffect, useRef, useState, useMemo } from "react";
import { playSound } from "../utils/soundManager"; // 🔊 Untuk memainkan suara
import { toast } from "react-toastify";
import {
  loadModel, // 🔍 Load model ML dari TensorFlow.js
  screenshotAndUpload, // 📸 Screenshot dari halaman web
  screenshotFromStreamAndUpload, // 📸 Screenshot dari stream layar (jika diizinkan)
  fetchLastScreenshot, // 🖼️ Ambil screenshot terakhir dari server
} from "../utils/modelRestAPI";
import { setupCamera } from "../utils/cameraHandler"; // 📷 Modularisasi kamera dan proses deteksi gesture

const HandRecognition = () => {
  // 🎯 STATE utama
  const [model, setModel] = useState(null); // Model TensorFlow
  const [detectedClass, setDetectedClass] = useState(""); // Hasil klasifikasi gesture
  const [confidence, setConfidence] = useState(""); // Nilai confidence hasil prediksi
  const [cameraActive, setCameraActive] = useState(false); // Status kamera aktif/tidak
  const [imageUrl, setImageUrl] = useState(null); // Gambar hasil screenshot
  const [screenStream, setScreenStream] = useState(null); // Stream desktop user
  const [showFlash, setShowFlash] = useState(false); // Efek flash animasi saat copy
  const [pasteEffect, setPasteEffect] = useState(false); // Efek zoom animasi saat paste

  // 🔁 REFERENSI DOM dan state boolean
  const videoRef = useRef(null); // Video webcam tersembunyi
  const canvasRef = useRef(null); // Tempat menggambar deteksi tangan
  const cameraInstance = useRef(null); // Objek kamera dan hands
  const copiedRef = useRef(false); // 🔐 Mencegah spam gesture "copy"

  const labels = useMemo(() => ["copy", "paste"], []); // Daftar gesture yang dikenali

  // 🔄 Load model hanya sekali saat komponen mount
  useEffect(() => {
    loadModel(setModel);
  }, []);

  // 🔁 Jalankan proses kamera jika model sudah siap dan kamera diaktifkan
  useEffect(() => {
    setupCamera({
      cameraActive, // Status kamera aktif
      setDetectedClass, // Setter class gesture
      setConfidence, // Setter confidence
      setImageUrl, // Setter gambar hasil
      videoRef, // Referensi DOM video
      canvasRef, // Referensi DOM canvas
      cameraInstance, // Ref instance kamera
      copiedRef, // Ref boolean mencegah spam
      model, // Model TensorFlow
      labels, // Label gesture
      screenStream, // Stream desktop jika tersedia
      playSound, // Fungsi suara
      screenshotAndUpload, // Screenshot dari halaman
      screenshotFromStreamAndUpload, // Screenshot dari desktop
      fetchLastScreenshot, // Ambil gambar terakhir dari server
      setShowFlash, // Efek flash (copy)
      setPasteEffect, // Efek zoom gambar (paste)
    });
  }, [model, cameraActive, labels, screenStream]);

  // 🎛️ Toggle kamera on/off
  const toggleCamera = () => {
    setCameraActive((prev) => !prev);
  };

  // 📥 Minta izin capture layar desktop
  // 🆕 Gabungan tombol Start Detection (stream + kamera)
  const handleStartDetection = async () => {
    // Jika stream dan kamera sudah aktif klik restart detection = refresh halaman
    if (screenStream && cameraActive) {
      window.location.reload();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setScreenStream(stream); // Simpan stream desktop
      setCameraActive(true); // Langsung nyalakan kamera
      // alert("Screen capture permission granted!");
      toast.success("Screen capture permission granted!", { autoClose: 3000 });
      toast.info(
        "🖥️ Pastikan tab ini tetap terbuka dan aktif selama gesture digunakan!",
        { autoClose: 4000 }
      );

      // Reset jika user stop sharing
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setCameraActive(false); // 🆕 Matikan kamera juga saat sharing dihentikan
        toast.info("Screen sharing stopped.", { autoClose: 1500 });
      };
    } catch (err) {
      console.error("Screen capture permission denied:", err);
      toast.error("Screen capture permission denied!", { autoClose: 3000 });
    }
  };

  // 🆕 Fungsi untuk menghentikan kamera dan screen stream
  const handleStopDetection = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      toast.info("Screen sharing stopped.", { autoClose: 1500 });
    }
    setCameraActive(false);
  };

  return (
    <div className="container-fluid flex-fill px-3">
      {/* 🔦 Overlay flash animasi saat gesture "copy" */}
      {showFlash && <div className="flash-overlay" />}

      {/* 🧾 Area hasil dan tampilan kamera */}
      <div className="card bg-dark text-white shadow border-light mb-5">
        <div className="card-body px-4 py-4">
          {/* 📹 Elemen video tersembunyi untuk MediaPipe */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width="800"
            height="500"
            style={{ display: "none" }}
          />

          {/* 🎨 Canvas dan hasil screenshot */}
          <div className="d-flex flex-wrap justify-content-center align-items-start gap-4">
            <canvas
              ref={canvasRef}
              width="600"
              height="400"
              className="rounded border border-success"
              // style={{ transform: "scaleX(-1)" }}
              style={{ display: "none" }}
            />
          </div>

          {/* 🆕 Tombol gabungan Start Detection */}
          <div className="d-flex justify-content-center gap-3 mb-3">
            <button onClick={handleStartDetection} className="btn btn-success">
              {cameraActive && screenStream
                ? "Restart Detection"
                : "Start Detection"}
            </button>
            <button
              onClick={handleStopDetection}
              className="btn btn-danger"
              disabled={!cameraActive && !screenStream}
            >
              Stop Detection
            </button>
          </div>

          {/* 📊 Deteksi Gesture */}
          <div className="mt-2 text-center">
            <h4 className="text-info">Detection Result</h4>
            <p className="fs-5 mb-1">{detectedClass}</p>
            <p className="fs-6 text-secondary">Confidence: {confidence}%</p>
            {/* 🖼️ Gambar hasil screenshot */}
            {imageUrl && (
              <div>
                <h5 className="text-light">Screenshot Result:</h5>
                <img
                  src={imageUrl}
                  alt="Screenshot"
                  width="800"
                  height="500"
                  className={`img-thumbnail shadow mb-3 ${
                    pasteEffect ? "paste-animate" : ""
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandRecognition;
