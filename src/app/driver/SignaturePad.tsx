"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/Button";

/**
 * Bare-bones signature canvas for the suki handoff. Pointer events cover
 * finger, stylus, and mouse. Parent pulls the drawing out via `getBlob`.
 */
export function SignaturePad(props: { onChange: (hasInk: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Match the backing store to the CSS box once; keeps strokes crisp.
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a1a";
    }
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-md border border-hair-strong bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = e.currentTarget.getContext("2d");
          const p = point(e);
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d");
          const p = point(e);
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
          if (!hasInk) {
            setHasInk(true);
            props.onChange(true);
          }
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      />
      <Button
        variant="ghost"
        className="mt-1 h-9 px-3 text-[13px]"
        onClick={() => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHasInk(false);
          props.onChange(false);
        }}
      >
        Burahin
      </Button>
    </div>
  );
}

/** The drawn signature as a PNG blob, or null when the pad is blank. */
export function signatureBlob(container: HTMLElement): Promise<Blob | null> {
  const canvas = container.querySelector("canvas");
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
