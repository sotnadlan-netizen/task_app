"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

interface Props {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  processing: boolean;
}

export function AudioWaveform({ mediaStream, isRecording, processing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // GSAP-tweened multiplier — goes to 0 when processing starts (wave flattens)
  const ampRef = useRef({ value: 1 });

  // Setup / teardown AudioContext when stream changes
  useEffect(() => {
    if (!mediaStream) {
      if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { /* ignore */ } sourceRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      analyserRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;        // 64 frequency bins — smooth waveform
    analyser.smoothingTimeConstant = 0.82;
    const source = ctx.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    ampRef.current.value = 1;

    return () => {
      try { source.disconnect(); } catch { /* ignore */ }
      ctx.close().catch(() => {});
    };
  }, [mediaStream]);

  // GSAP ticker — draws waveform on every animation frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      if (!analyser || (!isRecording && !processing)) return;

      const bins = analyser.frequencyBinCount; // 64
      const data = new Uint8Array(bins);
      analyser.getByteTimeDomainData(data);

      // Violet → cyan gradient stroke
      const grad = ctx2d.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,   "rgba(124, 58, 237, 0.95)");
      grad.addColorStop(0.5, "rgba(139, 92, 246, 1)");
      grad.addColorStop(1,   "rgba(6, 182, 212, 0.90)");

      ctx2d.strokeStyle = grad;
      ctx2d.lineWidth = 2.5;
      ctx2d.lineJoin = "round";
      ctx2d.lineCap = "round";
      ctx2d.shadowColor = "rgba(124, 58, 237, 0.55)";
      ctx2d.shadowBlur = 14;

      const amp = ampRef.current.value;
      const step = W / (bins - 1);

      ctx2d.beginPath();
      for (let i = 0; i < bins; i++) {
        const normalised = (data[i] / 128.0 - 1) * amp;
        const x = i * step;
        const y = H / 2 + normalised * (H / 2 - 6);
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    };

    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  }, [isRecording, processing]);

  // When processing starts, tween amplitude to 0 so the wave flattens
  useEffect(() => {
    if (processing) {
      gsap.to(ampRef.current, {
        value: 0,
        duration: 0.85,
        ease: "power2.out",
      });
    } else {
      gsap.killTweensOf(ampRef.current);
      ampRef.current.value = 1;
    }
  }, [processing]);

  const visible = isRecording || processing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="waveform-container"
          initial={{ opacity: 0, scaleY: 0.5 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.3 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full overflow-hidden"
          style={{ height: 56 }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={480}
            height={56}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
