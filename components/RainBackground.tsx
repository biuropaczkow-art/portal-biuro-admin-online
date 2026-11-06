"use client";

import { useEffect, useRef } from "react";

export function RainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;

    const drops: any[] = [];
    const staticDrops: any[] = [];
    
    const maxDrops = 150; 
    const maxStaticDrops = 400; 

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      generateStaticDrops();
    }

    function generateStaticDrops() {
      staticDrops.length = 0;
      for(let i = 0; i < maxStaticDrops; i++) {
        staticDrops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.3 + 0.05
        });
      }
    }

    class Drop {
      x: number = 0;
      y: number = 0;
      r: number = 0;
      speed: number = 0;
      life: number = 0;
      maxLife: number = 0;
      wobble: number = 0;

      constructor() {
        this.init();
        this.y = Math.random() * height; 
      }
      
      init() {
        this.x = Math.random() * width;
        this.y = -20;
        this.r = Math.random() * 1.2 + 0.8; 
        this.speed = Math.random() * 4 + 2; 
        this.life = 0;
        this.maxLife = Math.random() * 150 + 50; 
        this.wobble = Math.random() * Math.PI; 
      }

      update() {
        this.y += this.speed;
        this.life++;
        this.wobble += 0.05;
        this.x += Math.sin(this.wobble) * 0.3;

        if (Math.random() > 0.98) {
          this.speed += 0.1;
          this.r += 0.03;
        }

        if (this.y > height + 20 || this.life > this.maxLife) {
          this.init();
        }
      }

      draw() {
        if (!ctx) return;
        const alpha = Math.max(0, 1 - (this.life / this.maxLife));
        
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.2})`;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 1, this.r * 0.9, this.r * 1.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
        ctx.fill();
      }
    }

    window.addEventListener('resize', resize);
    resize();
    
    for (let i = 0; i < maxDrops; i++) {
      drops.push(new Drop());
    }

    function drawStaticDrops() {
      if (!ctx) return;
      staticDrops.forEach(drop => {
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.3})`;
        ctx.fill();
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);
      drawStaticDrops();

      drops.forEach(drop => {
        drop.update();
        drop.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div 
        style={{
          position: "fixed",
          top: "-5%",
          left: "-5%",
          width: "110%",
          height: "110%",
          objectFit: "cover",
          backgroundImage: "url('https://images.unsplash.com/photo-1517244909241-1a06277a83c7?q=80&w=2000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px) brightness(0.35)",
          zIndex: 0
        }} 
      />
      <canvas 
        ref={canvasRef} 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none"
        }}
      />
    </>
  );
}
