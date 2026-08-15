# RescueLink AI — Desktop & Mobile Native PWA Widget Integration

RescueLink AI is built as a **Progressive Web App (PWA)**, allowing citizens, emergency dispatchers, and response agencies to install **Public Happenings & SOS Telemetry** as a **native Desktop App Window (Windows, macOS, Linux)** and **Mobile Home Screen Widget (Android, iOS)** without opening a browser URL bar.

---

## 💻 📲 Core Capabilities

1. **Direct Native Installation API (`beforeinstallprompt`)**:
   - Tapping the **`Install App / Widget 📲💻`** button directly invokes the native Chrome/Edge browser installation prompt.
   - Installs a standalone desktop app window (with desktop icon & taskbar pinning) or mobile home screen widget.

2. **Standalone Window Mode (`display: standalone`)**:
   - Removes browser address bars, navigation controls, and URL inputs.
   - Operates in full-screen native app viewport with `theme-color: #581c87` matching system window title bars.

3. **Offline Telemetry & Service Worker (`/sw.js`)**:
   - Uses `/sw.js` cache-first strategy for instant app launching even under poor mobile or desktop internet connectivity during severe typhoons.

---

## 💻 How to Install on Desktop (Windows / macOS / Linux / ChromeOS)

1. Open `https://your-domain.com/happenings` in Chrome, Edge, or Brave.
2. Click the **`Install App / Widget 📲💻`** button in the header (or click the **⊕ Install** icon in the browser address bar).
3. Click **"Install"** when prompted.
4. **Happenings** launches in a frameless native desktop app window and pins to your Windows Taskbar or macOS Dock!

---

## 📲 How to Install on Mobile Devices (Android / iOS)

### Android (Chrome / Edge / Brave):
1. Open `https://your-domain.com/happenings` on Android Chrome.
2. Tap **`Install App / Widget 📲💻`**.
3. Tap **"Install"** on the native Android prompt.

### iOS (iPhone / iPad Safari):
1. Open `https://your-domain.com/happenings` in Safari.
2. Tap the Safari **Share** icon at the bottom.
3. Select **"Add to Home Screen"** and tap **Add**.
