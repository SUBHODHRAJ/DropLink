# Vercel Deployment Guide for DropLink

## Architecture Overview
DropLink is a full-stack system consisting of:
1. **Frontend (React.js + Vite + Tailwind CSS)**: Runs with optimal performance on **Vercel** Edge Network.
2. **Backend (ASP.NET Core .NET 10 + MySQL 8 + SignalR + 100 GB+ Storage Engine)**: Hosted on a persistent server (Railway, Render, Fly.io, DigitalOcean, AWS, or your own local laptop as host).

> **Why can't the .NET backend run inside Vercel Serverless?**
> Vercel Serverless Functions have a 4.5 MB body limit (blocking large file chunk transfers), strict 10–60s timeouts, ephemeral read-only storage, and do not support stateful SignalR WebSockets or .NET Kestrel daemons. Thus, the industry standard architecture is: **Vercel for Frontend** + **Persistent Container for Backend**.

---

## 🚀 Deploying Frontend to Vercel (2 Ways)

### Method 1: Using GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Deploy DropLink to Vercel"
   git branch -M main
   git remote add origin https://github.com/your-username/DropLink.git
   git push -u origin main
   ```

2. **Import into Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your `DropLink` repository.
   - **Framework Preset**: Vite
   - **Root Directory**: Select `frontend` (or leave as root with the included root `vercel.json`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set Environment Variable in Vercel:**
   - In the Vercel Project Settings > **Environment Variables**:
     - Key: `VITE_API_URL`
     - Value: `https://your-backend-api.com` (or your public backend URL)
   - Click **Deploy**!

---

### Method 2: Deploying via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy directly from the `frontend` folder:
   ```bash
   cd frontend
   vercel
   ```
   Follow the prompts to link your Vercel account and deploy.

3. To deploy to production:
   ```bash
   vercel --prod
   ```

---

## 🌐 Connecting to the Backend

Once deployed on Vercel:
- Your frontend will be live at: `https://your-droplink.vercel.app`
- In your Vercel dashboard, point `VITE_API_URL` to your backend endpoint (e.g. `https://api.droplink.yourdomain.com`).
- The frontend will automatically route all API requests and real-time SignalR WebSockets to your backend.
