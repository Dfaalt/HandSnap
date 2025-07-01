import html2canvas from "html2canvas";
import axios from "axios";
import * as tf from "@tensorflow/tfjs";

//panggil model
export const loadModel = async (setModel) => {
  try {
    const model = await tf.loadLayersModel("/model/model.json");
    setModel(model);
    console.log("Model loaded!");
  } catch (err) {
    console.error("Model load error:", err);
  }
};

//post screenshot dg gesture langsung ke db
export const screenshotAndUpload = async () => {
  const element = document.body;
  const canvas = await html2canvas(element);
  canvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "screenshot.png");
    try {
      await axios.post("http://127.0.0.1:5000/api/image", formData);
      console.log("Screenshot uploaded");
    } catch (err) {
      console.error("Upload SS error:", err);
    }
  }, "image/png");
};

// Fungsi screenshot desktop berdasarkan stream/share screen page yang sudah didapat
export const screenshotFromStreamAndUpload = async (screenStream) => {
  try {
    if (!screenStream) throw new Error("No screen stream provided");
    const track = screenStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "screenshot-desktop.png");
      try {
        await axios.post("http://127.0.0.1:5000/api/image", formData);
        console.log("Desktop screenshot uploaded");
      } catch (err) {
        console.error("Upload SS desktop error:", err);
      }
    }, "image/png");
  } catch (err) {
    console.error("Screen capture desktop error:", err);
    // fallback ke screenshot halaman web
    await screenshotAndUpload();
  }
};

//fungsi untuk menampilkan hasil hand gesture terbaru
export const fetchLastScreenshot = async (setImageUrl) => {
  try {
    const res = await axios.get("http://127.0.0.1:5000/api/image/last");
    const hex = res.data.image_data;
    const binary = hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16));
    const blob = new Blob([new Uint8Array(binary)], { type: "image/png" });
    const imageUrl = URL.createObjectURL(blob);
    setImageUrl(imageUrl);
  } catch (err) {
    console.error("Fetch last data error:", err);
  }
};
