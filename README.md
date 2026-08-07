# SortStudio 🎡

A modern, highly customizable, and robust random draw studio built with React, TypeScript, and Zustand. 
This application features advanced balancing and "fair play" mechanics, customizable sound effects, animations, and detailed configuration options, making it ideal for giveaways, raffles, team selections, and much more.

## 🚀 Features

### Advanced Balancing and Fair Play ⚖️
- **Time Accumulation (Pity System):** Automatically increases the weight/win chance of participants who have not been selected in previous rounds.
- **Win Division (Balancing):** Dynamically reduces the probability of participants winning repeatedly by dividing their weight based on the number of previous wins.
- **Anti-Repetition Engine:** Prevents the same item from being drawn consecutively within a configurable number of rounds.
- **Visual Weight Indicator:** Option to visually display on the wheel how dynamic weights (accumulation and division) affect the slices in real-time.

### Multiple Draw Modes 🎡
- **Classic Wheel:** The traditional spinning wheel layout.
- **Horizon Mode:** A horizontal scrolling selector, similar to casino slot machines.
- **Mystery Box Mode:** A suspenseful display that reveals the winner after an unboxing animation.

### Game Modes 🎮
- **Standard Mode:** Classic random draw.
- **Elimination Mode (Deathmatch):** Automatically eliminates winners or specific participants round by round until only a Grand Winner remains. Features automatic continuation options and dramatic sounds.
- **Auto-Remove Winner:** Automatically removes drawn items from the wheel for subsequent rounds.

### Immersive Audio and Visuals ✨
- Custom sound effects for spin "ticks" and winner announcements.
- Add your own custom audios (supports importing custom files).
- Confetti explosion animations when announcing a winner.
- Highly customizable interface themes, fonts, and colors.
- Precise controls over spin duration and animations.

### Data Management 💾
- **Local Persistence (Local Storage):** All settings, participants, and results history are automatically saved to the browser's IndexedDB / LocalStorage.
- Complete results history with timestamps.

## 🛠️ Technologies Used

- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS (v4)
- **State Management:** Zustand
- **Animations:** Motion (Framer Motion)
- **Local Database:** `idb-keyval` (IndexedDB for secure storage)
- **Icons:** Lucide React
- **Build Tool:** Vite

## 📦 Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   Make sure you have Node.js installed.
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Build for production:**
   ```bash
   npm run build
   ```
   Production files will be generated in the `dist` folder.

## ⚙️ Architecture Highlights

### `useWheelData` Hook
Calculates dynamic weights, angle limits, and SVG paths for the wheel slices. It takes into account base weights, the accumulation system (pity system), and the win reduction logic to compute the final display and probability mechanics.

### `useWheelActions` Hook
Manages the core spin mechanics, random number generation using the Cryptography API (`crypto.getRandomValues`) to ensure unpredictability, and applies the logic for elimination and anti-repetition modes.

### `useAppStore` (Zustand)
A centralized state that manages:
- Application settings and visual themes.
- Participant lists (Items).
- Results history.
- Sound and volume settings.
- Advanced wheel metrics (spin duration, timeouts).

## 🤝 How to Contribute

Contributions are welcome! Feel free to open issues, submit pull requests, or suggest new features to improve the system mechanics and interface.

## 📝 License

This project is open-source and available under the MIT License.
