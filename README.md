# CodeSync — Collaborative Real-Time Code Editor

CodeSync is a collaborative real-time code editor featuring live synchronized editing, cursor tracking, text/voice chat, a synchronized whiteboard, and remote code execution capabilities.

## Architecture

- **Client**: React + Vite + Tailwind/Custom CSS, CodeMirror (for editor), tldraw (for whiteboard), and Socket.io-client.
- **Server**: Node.js Express server + Socket.io for real-time WebSocket connection, with built-in code compilation using local compiler/interpreter sub-processes.

---

## Deployment Guide

This repository is optimized for deployment with:
- **Client** on **Vercel**
- **Server** on **Render**

### 1. Server Deployment (Render)

1. Sign up/Log in to [Render](https://render.com/).
2. Create a new **Web Service** and connect this repository.
3. Use the following configuration details (Render will auto-detect `render.yaml` if deployed using a Blueprint, or you can configure manually):
   - **Runtime**: `Node`
   - **Build Command**: `npm install` (in the `server` directory)
   - **Start Command**: `node server.js`
4. Set the following Environment Variables in the Render dashboard:
   - `PORT`: `3000` (or leave default, Render sets this automatically)
   - `CLIENT_URL`: `https://your-client-app.vercel.app` (your actual Vercel client URL)
   - `NODE_ENV`: `production`

### 2. Client Deployment (Vercel)

1. Sign up/Log in to [Vercel](https://vercel.com/).
2. Import a new Project and select this repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
4. Set the following Environment Variables in the Vercel dashboard:
   - `VITE_BACKEND_URL`: `https://your-server.onrender.com` (your deployed Render server URL)
   - `VITE_PISTON_API_URL`: `https://your-server.onrender.com/api/v2` (your deployed Render server execution URL)
5. Click **Deploy**. Vercel will build the React SPA and serve it via global CDN with automatic SSL.

---

## Local Development

To run the application locally:

### 1. Server
```bash
cd server
npm install
npm run dev
```

### 2. Client
```bash
cd client
npm install
npm run dev
```
