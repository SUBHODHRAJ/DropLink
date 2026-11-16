import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  Upload,
  CheckCircle2,
  AlertCircle,
  Wifi,
  FileCheck,
  Send,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

export default function MobileSharePortal() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';

  const [pin, setPin] = useState(initialPin);
  const [deviceName, setDeviceName] = useState(() => {
    return navigator.userAgent.includes('Android') ? 'Android Device' :
           navigator.userAgent.includes('iPhone') ? 'iPhone' :
           navigator.userAgent.includes('iPad') ? 'iPad' : 'Mobile Browser';
  });
  const [isPaired, setIsPaired] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { name, percent, speed, status }
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Auto-pair if PIN is in query parameter
  useEffect(() => {
    if (initialPin) {
      handlePair(initialPin);
    }
  }, [initialPin]);

  const handlePair = async (pinToUse) => {
    setErrorMsg('');
    try {
      const devId = localStorage.getItem('droplink_mobile_devid') || 'mob_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('droplink_mobile_devid', devId);

      const res = await api.post('/share/pair-device', {
        deviceIdentifier: devId,
        deviceName: deviceName,
        deviceType: 'Mobile',
        pin: pinToUse || pin
      });

      if (res.data.success) {
        setIsPaired(true);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Pairing failed. Please verify PIN on your laptop.');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const CHUNK_SIZE = 16 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    setUploadProgress({
      name: file.name,
      percent: 0,
      status: 'Sending to Laptop...',
      speed: 'Calculating...'
    });

    try {
      const initRes = await api.post('/share/upload-session', {
        fileName: file.name,
        totalSize: file.size,
        totalChunks: totalChunks,
        chunkSize: CHUNK_SIZE,
        senderDevice: deviceName
      });

      const sessionId = initRes.data.sessionId;
      const startTime = Date.now();
      let uploaded = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        await api.post(`/share/upload-chunk/${sessionId}/${i}`, chunk, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });

        uploaded += chunk.size;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = ((uploaded / (elapsed || 1)) / (1024 * 1024)).toFixed(1) + ' MB/s';
        const percent = Math.round((uploaded / file.size) * 100);

        setUploadProgress({
          name: file.name,
          percent: percent,
          status: 'Uploading...',
          speed: speed
        });
      }

      await api.post(`/share/assemble/${sessionId}`);

      setUploadProgress({
        name: file.name,
        percent: 100,
        status: 'Transferred Successfully!',
        speed: 'Done'
      });

      confetti({ particleCount: 80, spread: 60 });
    } catch (err) {
      setUploadProgress(prev => ({
        ...prev,
        status: 'Error: ' + (err.response?.data?.message || err.message)
      }));
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Mobile Header */}
      <div className="pt-4 pb-2 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold border border-brand-500/20">
          <Wifi className="w-3.5 h-3.5" /> DropLink Mobile AirDrop
        </div>
        <h1 className="text-2xl font-black text-white">Send Files to Laptop</h1>
        <p className="text-xs text-slate-400">High speed direct Wi-Fi file transfer</p>
      </div>

      {/* Main Container */}
      <div className="my-auto py-6">
        {!isPaired ? (
          <div className="bg-surface-100 p-6 rounded-3xl border border-slate-800 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-white text-base">Pair with Laptop</h2>
              <p className="text-xs text-slate-400">
                Enter the 6-digit PIN visible on your laptop screen.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-surface-200 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">6-Digit PIN</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 583921"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-surface-200 border border-slate-700 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={() => handlePair()}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 transition text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Connect & Pair</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface-100 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Connected to Laptop
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-brand-500/60 bg-brand-500/5 hover:bg-brand-500/10 cursor-pointer flex flex-col items-center justify-center space-y-3 transition active:scale-95"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">Select File to Send</h3>
                <p className="text-xs text-slate-400">Photos, Videos, PDFs, or large files</p>
              </div>
            </div>

            {uploadProgress && (
              <div className="p-4 rounded-2xl bg-surface-200 border border-slate-700 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                    {uploadProgress.name}
                  </span>
                  <span className="font-mono text-brand-400 font-bold">
                    {uploadProgress.percent}%
                  </span>
                </div>

                <div className="w-full bg-surface-300 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>{uploadProgress.status}</span>
                  <span className="font-mono">{uploadProgress.speed}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-500 pb-2">
        DropLink Local Wi-Fi Ecosystem • Zero Internet Required
      </div>
    </div>
  );
}
