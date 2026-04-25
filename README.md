# 🎭 FaceAttend — Portable Face Recognition Attendance System

A standalone, locally-runnable attendance system using real-time face recognition. This version is built to be **portable**, using **Excel (`data.xlsx`)** as its database—no complex database installation required!

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎥 **Live Recognition** | Real-time webcam face detection & matching. |
| 👤 **User Registration** | Register users with Face ID and Employee ID. |
| 📋 **Excel Database** | Data is stored in `data.xlsx` for easy viewing and portability. |
| 📅 **Clean Exports** | Automatically splits registration and attendance into readable **Date** and **Time** columns. |
| 🔒 **"Useless Data" Hidden** | Technical face data (descriptors) is kept in a separate sheet to keep your logs clean. |
| 🌐 **100% Offline** | Face recognition runs entirely in your browser—no data leaves your PC. |
| 🚀 **One-Click Start** | Simply run `start.bat` to launch both backend and frontend. |

---

## 🛠️ Requirements & Utilities

To run this project, you need the following installed on your PC:

1.  **[Node.js](https://nodejs.org/) (preferred node-v24.15.0-x64)**: The core engine that runs the application.
2.  **A Webcam**: For face detection and registration.
3.  **Modern Browser**: Chrome, Edge, or Firefox (Chrome recommended).
4.  **Excel / Spreadsheet Viewer**: To view the `data.xlsx` database.

---

## 🚀 Quick Start (How to Use)

### 1. Initial Setup
The first time you use the app on a new PC, you need to install the hidden dependencies.
- Open a terminal/command prompt in the project folder.
- Run the following commands:
  ```bash
  cd backend && npm install
  cd ../frontend && npm install
  ```

### 2. Launching the App
Simply double-click the **`start.bat`** file in the main folder.
- This will open two windows (Backend and Frontend).
- Wait for them to load.
- Your browser should automatically open, or you can go to: **`http://localhost:3000`**

---

## 🎯 Application Workflow

### Step 1: Register Users
1. Go to the **Register** page.
2. Enter the **Name** and **Employee ID**.
3. Click **"Capture & Register"**. The system will capture face data and save it to the Excel database.

### Step 2: Mark Attendance
1. Go to the **Attendance** page.
2. Click **"Start Attendance"**.
3. Stand in front of the camera. When your face is recognized, attendance is marked instantly.
4. The system prevents marking attendance more than once per day.

### Step 3: View Data
- Open the **`data.xlsx`** file in the root directory.
- **Users Sheet**: Shows registered users with separate `date` and `time` of registration.
- **Attendance Sheet**: Shows all attendance logs with `date`, `time`, `name`, and `status`.
- **FaceData Sheet**: (Hidden Data) Contains the technical face descriptors. **Do not modify this sheet.**

---

## 🔧 Troubleshooting

- **Camera not working?** Ensure no other app (like Zoom or Teams) is using the camera. Allow camera access in your browser settings.
- **Backend error?** Ensure Node.js is installed correctly by typing `node -v` in a terminal.
- **Excel file locked?** Close `data.xlsx` before running the app to allow the system to write new attendance records.

---

## 📂 Project Structure

- `backend/`: The server that manages data and Excel writing.
- `frontend/`: The user interface and face recognition engine.
- `data.xlsx`: Your portable database file.
- `start.bat`: The shortcut to start the entire system.

---

## 🔒 Privacy & Security

- **No Images Stored**: We do not store your actual photos. We only store numerical "face descriptors" (math vectors) that cannot be turned back into photos.
- **Local Data**: All data stays on your PC. No internet is required after the initial setup.
