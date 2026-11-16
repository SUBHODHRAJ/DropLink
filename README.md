# DropLink 🚀
### Unified Local AirDrop, 100 GB+ Streaming, Document Editing & Smart Academic Study Library

DropLink is a modern, unified personal cloud and productivity platform engineered as an all-in-one ecosystem:
- **Workspace 1: Share** — AirDrop-style local Wi-Fi file transfer with QR pairing PIN, 100 GB+ HTTP chunked streaming engine, and global shareable internet links.
- **Workspace 2: Edit** — Word-style document editor and Keep-style notes powered by TipTap, clipboard image pasting, autosave, and server-side PDF compilation via QuestPDF.
- **Workspace 3: Study Library** — Academic PDF organizer by semester, subject, and unit, automatic document classification, OCR & text extraction (PdfPig), full-text academic search, integrated PDF reader with bookmarks, and AI study assistant.
- **Unified My Files** — Centralized file explorer across all workspaces with category filtering, favorites, and trash management.

---

## 🛠️ Technology Stack
- **Backend:** C# ASP.NET Core (.NET 10), Entity Framework Core (MySQL 8 Pomelo Provider), SignalR, QuestPDF, PdfPig, QRCoder, BCrypt.
- **Frontend:** React.js (Vite, JavaScript only), Tailwind CSS, Lucide React, TipTap Editor, SignalR Client, Canvas Confetti.
- **Database:** MySQL 8 (`droplink_db`).
- **File Engine:** 16 MB chunked streaming directly to disk with zero full-file RAM buffering and SHA-256 verification.

---

## ⚡ Quick Start (Windows)
1. Ensure MySQL 8 is running with database `droplink_db`.
2. Double-click `Start-DropLink.bat` in the root folder.
3. DropLink detects your local IP and opens `http://localhost:5000` automatically.
4. Scan the QR code on your mobile phone to connect and start sending files immediately!

---

## 📦 Project Structure
```
DropLink/
|-- frontend/           # React.js (Vite) client application
|-- backend/            # ASP.NET Core Web API with Controllers, Hubs & Services
|-- storage/
|   |-- local/          # Assembled persistent storage
|   |-- temporary/      # Upload chunks during transit
|-- deployment/         # Docker Compose, Dockerfiles, and Nginx configurations
|-- Start-DropLink.bat  # 1-Click Windows startup launcher
|-- DEVELOPMENT_STATUS.md # Full phase tracking and test verification logs
```
