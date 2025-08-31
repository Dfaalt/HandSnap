# HandSnap

A web application that can recognize hand gestures to perform actions such as taking screenshots and transferring files between devices. Built with **React (Vite)**, **TensorFlow\.js**, **MediaPipe Hands**, and **Flask** as the REST API.

> Demo (production): `https://hand-snap.vercel.app/`

---

## ✨ Features

* Real-time hand detection and gesture classification (currently 2 classes): `SS` (screenshot) and `transfer_SS` (send last screenshot).
* Automatic feedback when successful (flash, toast notification, sound) and clear error notifications.
* Screenshot saving and cross-device transfer via REST API.
* Control buttons for Start/Stop/Restart detection, plus open camera mode for receiving files.

---

## 🧰 Tech Stack

* **Frontend:** React + Vite, TensorFlow\.js, MediaPipe Hands
* **Backend:** Flask (REST API)
* **Build/Deploy:** Vercel (frontend), Railway/Render/Heroku (backend)

---

## 📦 Project Structure

```
HandSnap/
├─ public/
│  └─ model/                 # TFJS model files (model.json + shards)
├─ src/
│  ├─ assets/                # icons, sounds, static assets
│  ├─ components/            # UI components (buttons, camera, controls)
│  ├─ utils/                 # helpers (performanceLogger, gesture buffer), API client (Flask endpoints)
│  ├─ App.jsx                # main app component
│  └─ main.jsx               # entry point
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

---

## ✅ Prerequisites

* **Node.js** ≥ 18
* **Python** ≥ 3.10 (for backend)
* **Google Chrome** (recommended)
* Webcam + permission for **camera** & **screen capture**

---

## 🚀 Running the Frontend

1. **Clone & install**

```bash
git clone https://github.com/Dfaalt/HandSnap.git
cd HandSnap
npm install
```

2. **Place the model**

```
public/model/
  ├─ model.json
  └─ group1-shard1ofN.bin ... group1-shardNofN.bin
```

3. **Environment configuration (optional)** Create `.env` file:

```
VITE_API_BASE_URL=http://localhost:5000
```

4. **Run dev server**

```bash
npm run dev
```

Open in browser: `http://localhost:5173`

---

## 🐍 Running the Backend (Flask)

1. **Create virtual environment**

```bash
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # macOS/Linux
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Run Flask server**

```bash
python app.py
```

Local URL: `http://localhost:5000`

---

## 🎮 How to Use

1. Open the app in Chrome.
2. Click **Start Detection** and grant camera & screen capture permissions.
3. Perform gestures:

   * **SS** → take a screenshot (flash + toast + sound).
   * **transfer\_SS** → send screenshot (toast + animation + auto-download on receiver).
4. Additional controls:

   * **Restart Detection** — restart detection.
   * **Stop Detection** — stop camera & screen capture.
   * **Open Camera** — open receiver mode.

---

## ⚙️ Model Info

* **Input shape:** `[1, 10, 63]` → 10 timesteps × 21 landmarks × (x,y,z)
* **Classes:** `SS`, `transfer_SS`
* **Cooldown:** 1.5 seconds (prevent repeated triggers)

---

## 🧪 Performance Tips

* Use **WebGL** backend in TensorFlow\.js.
* Ensure proper lighting.
* Close heavy tabs in the browser.
* Ensure `requestAnimationFrame` is fully stopped before restarting detection.

---

## 🩹 Troubleshooting

* **Camera not detected:** check Chrome camera permissions.
* **Gesture misclassified:** keep hand stable, retrain model if needed.
* **Model failed to load:** ensure `public/model/` files exist.
* **CORS error:** enable Flask CORS, check `VITE_API_BASE_URL`.

---

## 🛠️ Scripts

```bash
npm run dev       # run dev server
npm run build     # production build
npm run preview   # preview build locally
```

---

## 🧱 Roadmap

* Add more gesture variations
* Better mobile support
* User login & authentication

---

## 🤝 Contributing

1. Fork the repository
2. Create branch: `git checkout -b feat/new-feature`
3. Commit: `git commit -m "feat: commit message"`
4. Push & open Pull Request

---

## 📄 License

MIT

---

## 🙌 Credits

* TensorFlow\.js, MediaPipe Hands
* React & Vite community
