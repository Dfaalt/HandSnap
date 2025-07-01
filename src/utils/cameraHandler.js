// ✅ NEW: Tambahan untuk kamera + animasi gesture copy/paste
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands"; // MediaPipe untuk deteksi tangan
import { Camera } from "@mediapipe/camera_utils"; // Utilitas kamera dari MediaPipe
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils"; // Untuk menggambar titik tangan di canvas
import * as tf from "@tensorflow/tfjs"; // TensorFlow.js untuk prediksi gesture

/**
 * Setup kamera dan proses deteksi gesture tangan.
 * Dipanggil saat kamera diaktifkan & model sudah siap.
 *
 * @param {object} config - Konfigurasi setup.
 * @param {boolean} config.cameraActive - Status kamera aktif/tidak.
 * @param {function} config.setDetectedClass - Setter nama gesture yang terdeteksi.
 * @param {function} config.setConfidence - Setter confidence hasil prediksi.
 * @param {function} config.setImageUrl - Setter URL screenshot hasil paste.
 * @param {object} config.videoRef - Referensi ke elemen <video>.
 * @param {object} config.canvasRef - Referensi ke elemen <canvas>.
 * @param {object} config.cameraInstance - Ref untuk menyimpan kamera agar bisa stop saat tidak aktif.
 * @param {object} config.copiedRef - Ref boolean anti-spam untuk gesture "copy".
 * @param {object} config.model - Model TensorFlow untuk deteksi gesture.
 * @param {array} config.labels - Array label yang dikenali (misal: ["copy", "paste"]).
 * @param {object} config.screenStream - Stream dari layar (jika ada).
 * @param {function} config.playSound - Fungsi untuk memainkan suara.
 * @param {function} config.screenshotAndUpload - Fungsi screenshot biasa (pakai html2canvas).
 * @param {function} config.screenshotFromStreamAndUpload - Fungsi screenshot dari layar desktop.
 * @param {function} config.fetchLastScreenshot - Fungsi ambil gambar terakhir dari server.
 * @param {function} config.setShowFlash - (Opsional) Efek animasi flash saat copy.
 * @param {function} config.setPasteEffect - (Opsional) Efek animasi zoom saat paste.
 */
export const setupCamera = ({
  cameraActive,
  setDetectedClass,
  setConfidence,
  setImageUrl,
  videoRef,
  canvasRef,
  cameraInstance,
  copiedRef,
  model,
  labels,
  screenStream,
  playSound,
  screenshotAndUpload,
  screenshotFromStreamAndUpload,
  fetchLastScreenshot,
  setShowFlash,
  setPasteEffect,
}) => {
  if (!model) return; // ⛔ Jangan lanjut jika model belum ready

  // Jika kamera aktif dan belum ada instance kamera berjalan
  if (cameraActive && !cameraInstance.current) {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`, // CDN file MediaPipe
    });

    // Konfigurasi MediaPipe Hands
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    // Callback saat hasil tangan tersedia
    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Ambil titik tangan pertama
        const landmarks = results.multiHandLandmarks[0];

        // Ubah titik jadi array 1D dan buat tensor
        const inputData = landmarks.flatMap((lm) => [lm.x, lm.y]);
        const tensor = tf.tensor(inputData).reshape([1, 1, 42]);
        const prediction = model.predict(tensor); // 🔍 Prediksi gesture

        prediction.data().then((predictionArray) => {
          const maxIndex = predictionArray.indexOf(
            Math.max(...predictionArray)
          );
          const gesture = labels[maxIndex];
          setDetectedClass(`Class: ${gesture}`);
          setConfidence((predictionArray[maxIndex] * 100).toFixed(2));

          // 🖐️ GESTURE SS
          if (gesture === "SS" && !copiedRef.current) {
            copiedRef.current = true; // 🔐 Kunci gesture copy agar tidak spam
            playSound("SS"); // 🔊

            // 💡 Animasi flash saat screenshot
            if (setShowFlash) {
              setShowFlash(true);
              setTimeout(() => setShowFlash(false), 400);
            }

            // 📸 Screenshot layar atau elemen
            screenStream
              ? screenshotFromStreamAndUpload(screenStream)
              : screenshotAndUpload();
          }

          // 📩 GESTURE Transfer_SS
          // Simpan waktu terakhir transfer dilakukan
          if (!window.lastTransferTime) window.lastTransferTime = 0;

          const now = Date.now();
          const cooldown = 2000; // 2 detik cooldown

          if (
            gesture === "transfer_SS" &&
            now - window.lastTransferTime > cooldown
          ) {
            window.lastTransferTime = now;

            fetchLastScreenshot((imageUrl) => {
              const finalImage = imageUrl;
              if (!finalImage) {
                setDetectedClass("❌ Belum ada screenshot.");
                return;
              }

              playSound("transfer_SS");
              setImageUrl(finalImage);

              if (setPasteEffect) {
                setPasteEffect(true);
                setTimeout(() => setPasteEffect(false), 800);
              }

              // ⬇️ Auto-download
              const a = document.createElement("a");
              a.href = finalImage;
              a.download = "screenshot.png";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            });

            copiedRef.current = false; // unlock gesture SS
          }
        });
      } else {
        setDetectedClass("No hand detected");
        setConfidence("");
      }

      // ✍️ Gambar hasil tangan ke canvas
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 2,
          });
          drawLandmarks(canvasCtx, landmarks, {
            color: "#FF0000",
            lineWidth: 1,
          });
        }
      }

      canvasCtx.restore();
    });

    // 🎥 Setup kamera dan hubungkan dengan MediaPipe
    const cam = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cam.start(); // ✅ Jalankan kamera
    cameraInstance.current = { cam, hands }; // Simpan instance agar bisa stop nanti
  }

  // 🔴 Stop kamera saat tidak aktif
  if (!cameraActive && cameraInstance.current) {
    cameraInstance.current.cam.stop();
    cameraInstance.current = null;
  }
};
