"use client";

import { useEffect, useRef } from "react";

/**
 * Very gentle floating dots — like dust motes in warm light.
 * No connections, no glowing hubs, no traveling pulses.
 * Just slow, quiet motion that makes the background feel alive without screaming "tech."
 */
export function HeroParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;

    type Mote = { x: number; y: number; r: number; alpha: number; vx: number; vy: number; drift: number };
    let motes: Mote[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (motes.length === 0) seed();
    }

    function seed() {
      motes = [];
      const count = Math.floor((w * h) / 18000);
      for (let i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.8 + Math.random() * 1.4,
          alpha: 0.06 + Math.random() * 0.1,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.08,
          drift: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t: number) {
      if (!visible) { raf = requestAnimationFrame(draw); return; }
      ctx!.clearRect(0, 0, w, h);
      const sec = t / 1000;

      for (const m of motes) {
        m.x += m.vx + Math.sin(sec * 0.3 + m.drift) * 0.04;
        m.y += m.vy + Math.cos(sec * 0.2 + m.drift) * 0.03;

        // soft wrap
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;
        if (m.y < -10) m.y = h + 10;
        if (m.y > h + 10) m.y = -10;

        ctx!.fillStyle = `rgba(148,163,174,${m.alpha})`;
        ctx!.beginPath();
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 },
    );
    observer.observe(canvas);

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
