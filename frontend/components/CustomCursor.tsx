"use client";
import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = -200, mouseY = -200;
    let ringX  = -200, ringY  = -200;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.10;
      ringY += (mouseY - ringY) * 0.10;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(animate);
    };

    const targets = () =>
      document.querySelectorAll("a, button, [role=button], input, select, textarea, .graph-node");

    const onEnter = () => {
      ring.classList.add("hovered");
      dot.classList.add("hovered");
    };
    const onLeave = () => {
      ring.classList.remove("hovered");
      dot.classList.remove("hovered");
    };

    document.addEventListener("mousemove", onMove);

    // attach to interactive elements — re-query on each mount so dynamic buttons are covered
    targets().forEach(el => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{ position: "fixed", top: 0, left: 0, zIndex: 99999, pointerEvents: "none" }}
      />

      {/* Crosshair ring — 4 corner brackets */}
      <div
        ref={ringRef}
        className="custom-cursor-ring"
        style={{ position: "fixed", top: 0, left: 0, zIndex: 99998, pointerEvents: "none" }}
      >
        {/* top-right and bottom-left corners are rendered as child elements */}
        <span className="cursor-corner-tr" />
        <span className="cursor-corner-bl" />
      </div>
    </>
  );
}
