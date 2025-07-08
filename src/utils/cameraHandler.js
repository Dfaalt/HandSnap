import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import * as tf from "@tensorflow/tfjs";
import { toast } from "react-toastify";

// 🎯 Fungsi untuk menggambar hasil deteksi ke canvas output
const drawResultsToCanvas = (results, canvasRef) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  ctx.save(); // Simpan state canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan canvas
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height); // Tampilkan kamera

  // Gambar landmark tangan jika ada
  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach((landmarks) => {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 2,
      });
      drawLandmarks(ctx, landmarks, {
        color: "#FF0000",
        lineWidth: 1,
      });
    });
  }

  ctx.restore(); // Kembalikan state canvas
};

// ✌️ Tangani gesture "SS" (screenshot)
const handleGestureSS = ({
  playSound,
  setShowFlash,
  screenStream,
  screenshotFromStreamAndUpload,
  copiedRef,
}) => {
  copiedRef.current = true; // Hindari multiple trigger
  playSound("SS");

  // Tampilkan animasi flash
  if (setShowFlash) {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 400);
  }

  // Jika screen stream aktif, ambil screenshot dari stream
  if (screenStream) {
    screenshotFromStreamAndUpload(screenStream);
  } else {
    console.warn(
      "❌ screenStream tidak tersedia, tidak dapat mengambil screenshot."
    );
    toast.warn(
      "Enable screen share by clicking 'Start Detection' to take a screenshot!",
      {
        autoClose: 3000,
        position: "top-center",
      }
    );
  }
};

// 🖐 Tangani gesture "transfer_SS" (paste + download)
const handleGestureTransfer = ({
  fetchLastScreenshot,
  playSound,
  setImageUrl,
  setPasteEffect,
  setDetectedClass,
  copiedRef,
}) => {
  // Batasi frekuensi gesture ini agar tidak spam
  if (!window.lastTransferTime) window.lastTransferTime = 0;
  const now = Date.now();
  const cooldown = 2500;
  if (now - window.lastTransferTime < cooldown) return;
  window.lastTransferTime = now;

  // Ambil screenshot terakhir dari server
  fetchLastScreenshot((imageUrl) => {
    if (!imageUrl) {
      setDetectedClass("❌ Belum ada screenshot.");
      return;
    }

    playSound("transfer_SS");
    setImageUrl(imageUrl);

    // Aktifkan animasi paste
    if (setPasteEffect) {
      setPasteEffect(true);
      setTimeout(() => setPasteEffect(false), 800);
    }

    // Unduh gambar secara otomatis
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = "screenshot.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 500); // Delay 500ms sebelum download

    window.lastTransferTime = Date.now();
    copiedRef.current = false; // Reset agar bisa screenshot lagi
  });
};

// 🎥 Fungsi utama untuk mengatur kamera dan deteksi tangan
export const setupCamera = ({
  cameraActive,
  setDetectedClass,
  setConfidence,
  setImageUrl,
  videoRef,
  canvasRef,
  handPresenceRef,
  frameCounterRef,
  cameraInstance,
  copiedRef,
  model,
  labels,
  screenStream,
  playSound,
  screenshotFromStreamAndUpload,
  fetchLastScreenshot,
  setShowFlash,
  setPasteEffect,
}) => {
  if (!model) return; // Model belum siap

  // ✅ Start kamera jika aktif dan belum jalan
  if (cameraActive && !cameraInstance.current) {
    // Inisialisasi MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    // Callback setiap kali hasil deteksi tersedia
    hands.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];

      if (landmarks) {
        // Tambah counter jika tangan terdeteksi
        frameCounterRef.current++;
        if (frameCounterRef.current >= 5) {
          handPresenceRef.current = true;
        }

        if (handPresenceRef.current) {
          const prediction = tf.tidy(() => {
            const inputData = landmarks.flatMap((lm) => [lm.x, lm.y, lm.z]);
            const tensor = tf.tensor(inputData).reshape([1, 1, 63]);
            return model.predict(tensor);
          });

          prediction.data().then((predArr) => {
            const maxIndex = predArr.indexOf(Math.max(...predArr));
            const gesture = labels[maxIndex];
            const confidence = (predArr[maxIndex] * 100).toFixed(2);

            setDetectedClass(`Class: ${gesture}`);
            setConfidence(confidence);

            // Tangani gesture berdasarkan prediksi
            if (gesture === "SS" && !copiedRef.current) {
              handleGestureSS({
                playSound,
                setShowFlash,
                screenStream,
                screenshotFromStreamAndUpload,
                videoRef,
                copiedRef,
              });
            }

            if (gesture === "transfer_SS") {
              handleGestureTransfer({
                fetchLastScreenshot,
                playSound,
                setImageUrl,
                setPasteEffect,
                setDetectedClass,
                copiedRef,
              });
            }
          });
        } else {
          setDetectedClass("Detecting hand...");
          setConfidence("");
        }
      } else {
        // Reset jika tangan hilang
        frameCounterRef.current = 0;
        handPresenceRef.current = false;
        setDetectedClass("No hand detected");
        setConfidence("");
      }

      // Gambar ke canvas
      drawResultsToCanvas(results, canvasRef);
    });

    // 🔁 Jalankan kamera
    const cam = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cam.start();
    cameraInstance.current = { cam, hands }; // Simpan instance kamera
  }

  // 🛑 Hentikan kamera jika tidak aktif
  if (!cameraActive && cameraInstance.current) {
    cameraInstance.current.cam.stop(); // Stop MediaPipe camera
    cameraInstance.current = null;
  }
};
