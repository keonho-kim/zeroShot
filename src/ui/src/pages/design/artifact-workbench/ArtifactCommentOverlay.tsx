import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Eraser, MousePointer2, Paperclip, Pencil, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";

interface Point {
  x: number;
  y: number;
}

interface TextNote extends Point {
  id: string;
  text: string;
}

interface CaptureState {
  dataUrl: string;
  width: number;
  height: number;
}

type CommentMode = "draw" | "text";

const CANVAS_SIZE = 1000;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toSvgPoint(point: Point): string {
  return `${Math.round(point.x * CANVAS_SIZE)},${Math.round(point.y * CANVAS_SIZE)}`;
}

function denormalizePoint(point: Point, width: number, height: number): Point {
  return {
    x: point.x * width,
    y: point.y * height
  };
}

function readIframeHtml(frame: HTMLIFrameElement): string {
  const documentElement = frame.contentDocument?.documentElement;
  if (!documentElement) {
    throw new Error("Interactive canvas is not ready for capture.");
  }

  const clone = documentElement.cloneNode(true) as Element;
  clone.querySelectorAll("[data-od-edit-bridge],[data-od-edit-bridge-style],[data-od-add-hint],[data-od-drag-ghost]").forEach((node) => node.remove());
  clone.querySelectorAll("[data-od-selected],[data-od-hover]").forEach((node) => {
    node.removeAttribute("data-od-selected");
    node.removeAttribute("data-od-hover");
  });
  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not render the interactive canvas capture."));
    image.src = src;
  });
}

async function captureIframe(frame: HTMLIFrameElement): Promise<CaptureState> {
  const width = Math.max(1, Math.round(frame.clientWidth));
  const height = Math.max(1, Math.round(frame.clientHeight));
  const html = readIframeHtml(frame);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject x="0" y="0" width="${width}" height="${height}">`,
    html,
    "</foreignObject>",
    "</svg>"
  ].join("");
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas capture is unavailable.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.86), width, height };
}

async function composeAnnotatedImage(params: {
  capture: CaptureState;
  strokes: Point[][];
  notes: TextNote[];
}): Promise<string> {
  const image = await loadImage(params.capture.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = params.capture.width;
  canvas.height = params.capture.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Annotated capture is unavailable.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#dc2626";
  context.lineWidth = 5;
  for (const stroke of params.strokes) {
    if (stroke.length < 2) {
      continue;
    }
    const first = denormalizePoint(stroke[0], canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of stroke.slice(1)) {
      const next = denormalizePoint(point, canvas.width, canvas.height);
      context.lineTo(next.x, next.y);
    }
    context.stroke();
  }

  context.font = "700 16px system-ui, sans-serif";
  context.textBaseline = "top";
  for (const note of params.notes) {
    const point = denormalizePoint(note, canvas.width, canvas.height);
    const metrics = context.measureText(note.text);
    const width = Math.min(canvas.width - point.x - 12, metrics.width + 18);
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.fillRect(point.x, point.y, Math.max(72, width), 32);
    context.strokeStyle = "#dc2626";
    context.lineWidth = 2;
    context.strokeRect(point.x, point.y, Math.max(72, width), 32);
    context.fillStyle = "#111827";
    context.fillText(note.text, point.x + 9, point.y + 8);
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

function relativePoint(event: PointerEvent<HTMLElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}

export function ArtifactCommentOverlay(props: {
  open: boolean;
  frameRef: RefObject<HTMLIFrameElement | null>;
  targetIds: string[];
  onClose: () => void;
  onCapture: (capture: ArtifactCommentCapture) => void;
}) {
  const [mode, setMode] = useState<CommentMode>("draw");
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [notes, setNotes] = useState<TextNote[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [error, setError] = useState("");
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    setMode("draw");
    setStrokes([]);
    setNotes([]);
    setTextDraft("");
    setError("");
  }, [props.open]);

  if (!props.open) {
    return null;
  }

  const addTextNote = (event: PointerEvent<HTMLElement>) => {
    if (mode !== "text" || !textDraft.trim()) {
      return;
    }
    const point = relativePoint(event);
    setNotes((items) => [...items, { id: crypto.randomUUID(), text: textDraft.trim(), ...point }]);
    setTextDraft("");
  };

  const startDrawing = (event: PointerEvent<HTMLElement>) => {
    if (mode !== "draw") {
      addTextNote(event);
      return;
    }
    drawingRef.current = true;
    const point = relativePoint(event);
    setStrokes((items) => [...items, [point]]);
  };

  const continueDrawing = (event: PointerEvent<HTMLElement>) => {
    if (mode !== "draw" || !drawingRef.current) {
      return;
    }
    const point = relativePoint(event);
    setStrokes((items) => items.map((stroke, index) => index === items.length - 1 ? [...stroke, point] : stroke));
  };

  const finishDrawing = () => {
    drawingRef.current = false;
  };

  const saveCapture = async () => {
    const nextFrame = props.frameRef.current;
    if (!nextFrame) {
      setError("Interactive canvas is not mounted.");
      return;
    }
    try {
      const capture = await captureIframe(nextFrame);
      const annotatedImage = await composeAnnotatedImage({
        capture,
        strokes,
        notes
      });
      props.onCapture({
        cleanImage: capture.dataUrl,
        annotatedImage,
        note: notes.map((note) => note.text).join("\n") || textDraft.trim(),
        targetIds: props.targetIds,
        createdAt: Date.now()
      });
      props.onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  return (
    <div className="artifact-comment-overlay" aria-label="Comment on interactive canvas">
      <div className="artifact-comment-overlay-tools">
        <Button type="button" variant={mode === "draw" ? "default" : "outline"} onClick={() => setMode("draw")}>
          <Pencil aria-hidden="true" />
          자유 그리기
        </Button>
        <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}>
          <Type aria-hidden="true" />
          텍스트 넣기
        </Button>
        <Button type="button" variant="outline" onClick={() => {
          setStrokes([]);
          setNotes([]);
        }}>
          <Eraser aria-hidden="true" />
          지우기
        </Button>
        <Input value={textDraft} onChange={(event) => setTextDraft(event.target.value)} placeholder="텍스트 코멘트" />
        <Button type="button" onClick={saveCapture}>
          <Paperclip aria-hidden="true" />
          첨부
        </Button>
        <Button type="button" variant="ghost" onClick={props.onClose} aria-label="Close comment overlay">
          <X aria-hidden="true" />
        </Button>
      </div>
      {error ? <p className="artifact-comment-overlay-error">{error}</p> : null}
      <div
        className="artifact-comment-overlay-surface"
        onPointerDown={startDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
      >
        <svg className="artifact-comment-drawing" viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} aria-hidden="true">
          {strokes.map((stroke, index) => (
            <polyline key={index} points={stroke.map(toSvgPoint).join(" ")} />
          ))}
        </svg>
        {notes.map((note) => (
          <span
            className="artifact-comment-note"
            key={note.id}
            style={{
              left: `${note.x * 100}%`,
              top: `${note.y * 100}%`
            }}
          >
            {note.text}
          </span>
        ))}
      </div>
      <div className="artifact-comment-cursor">
        {mode === "text" ? <Type aria-hidden="true" /> : <MousePointer2 aria-hidden="true" />}
      </div>
    </div>
  );
}
