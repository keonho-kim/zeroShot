import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Eraser, MousePointer2, Pencil, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArtifactEditTarget } from "@/entities/design/artifact-editor";
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

function readIframeHtml(frame: HTMLIFrameElement): string {
  const documentElement = frame.contentDocument?.documentElement;
  if (!documentElement) {
    throw new Error("Interactive canvas is not ready for capture.");
  }

  return new XMLSerializer().serializeToString(documentElement);
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
  selectedTargets: ArtifactEditTarget[];
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
  context.strokeStyle = "#dc2626";
  context.lineWidth = 4;
  for (const target of params.selectedTargets) {
    context.strokeRect(target.rect.x, target.rect.y, target.rect.width, target.rect.height);
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#dc2626";
  context.lineWidth = 5;
  for (const stroke of params.strokes) {
    if (stroke.length < 2) {
      continue;
    }
    context.beginPath();
    context.moveTo(stroke[0].x, stroke[0].y);
    for (const point of stroke.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    context.stroke();
  }

  context.font = "700 16px system-ui, sans-serif";
  context.textBaseline = "top";
  for (const note of params.notes) {
    const metrics = context.measureText(note.text);
    const width = Math.min(canvas.width - note.x - 12, metrics.width + 18);
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.fillRect(note.x, note.y, Math.max(72, width), 30);
    context.strokeStyle = "#dc2626";
    context.lineWidth = 2;
    context.strokeRect(note.x, note.y, Math.max(72, width), 30);
    context.fillStyle = "#111827";
    context.fillText(note.text, note.x + 9, note.y + 7);
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

function scaledPoint(event: PointerEvent<HTMLElement>, capture: CaptureState): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(capture.width, (event.clientX - rect.left) * (capture.width / rect.width))),
    y: Math.max(0, Math.min(capture.height, (event.clientY - rect.top) * (capture.height / rect.height)))
  };
}

export function ArtifactCommentModal(props: {
  open: boolean;
  frameRef: RefObject<HTMLIFrameElement | null>;
  selectedTargets: ArtifactEditTarget[];
  onClose: () => void;
  onCapture: (capture: ArtifactCommentCapture) => void;
}) {
  const [capture, setCapture] = useState<CaptureState | null>(null);
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
    setCapture(null);
    setStrokes([]);
    setNotes([]);
    setTextDraft("");
    setError("");
    const frame = props.frameRef.current;
    if (!frame) {
      setError("Interactive canvas is not mounted.");
      return;
    }
    captureIframe(frame).then(setCapture).catch((nextError: unknown) => {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    });
  }, [props.frameRef, props.open]);

  const selectedIds = useMemo(() => props.selectedTargets.map((target) => target.id), [props.selectedTargets]);

  if (!props.open) {
    return null;
  }

  const addTextNote = (event: PointerEvent<HTMLElement>) => {
    if (!capture || mode !== "text" || !textDraft.trim()) {
      return;
    }
    const point = scaledPoint(event, capture);
    setNotes((items) => [...items, { id: crypto.randomUUID(), text: textDraft.trim(), ...point }]);
    setTextDraft("");
  };

  const startDrawing = (event: PointerEvent<HTMLElement>) => {
    if (!capture || mode !== "draw") {
      addTextNote(event);
      return;
    }
    drawingRef.current = true;
    const point = scaledPoint(event, capture);
    setStrokes((items) => [...items, [point]]);
  };

  const continueDrawing = (event: PointerEvent<HTMLElement>) => {
    if (!capture || mode !== "draw" || !drawingRef.current) {
      return;
    }
    const point = scaledPoint(event, capture);
    setStrokes((items) => items.map((stroke, index) => index === items.length - 1 ? [...stroke, point] : stroke));
  };

  const finishDrawing = () => {
    drawingRef.current = false;
  };

  const saveCapture = async () => {
    if (!capture) {
      return;
    }
    const annotatedImage = await composeAnnotatedImage({
      capture,
      selectedTargets: props.selectedTargets,
      strokes,
      notes
    });
    props.onCapture({
      cleanImage: capture.dataUrl,
      annotatedImage,
      note: notes.map((note) => note.text).join("\n") || textDraft.trim(),
      targetIds: selectedIds,
      createdAt: Date.now()
    });
    props.onClose();
  };

  return (
    <div className="artifact-comment-backdrop" role="dialog" aria-modal="true" aria-label="Comment on interactive canvas">
      <div className="artifact-comment-modal">
        <div className="artifact-comment-header">
          <div>
            <p className="agent-panel-kicker">CANVAS COMMENT</p>
            <h2>선택 요소에 코멘트 추가</h2>
          </div>
          <Button type="button" variant="ghost" onClick={props.onClose} aria-label="Close comment tool">
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="artifact-comment-tools">
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
        </div>
        {error ? <p className="architect-error">{error}</p> : null}
        <div className="artifact-comment-canvas-wrap">
          {capture ? (
            <div
              className="artifact-comment-canvas"
              style={{ ["--capture-width" as string]: capture.width, ["--capture-height" as string]: capture.height }}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={finishDrawing}
              onPointerLeave={finishDrawing}
            >
              <img src={capture.dataUrl} alt="Clean interactive canvas capture" draggable={false} />
              {props.selectedTargets.map((target) => (
                <div
                  className="artifact-comment-target"
                  key={target.id}
                  style={{
                    left: `${(target.rect.x / capture.width) * 100}%`,
                    top: `${(target.rect.y / capture.height) * 100}%`,
                    width: `${(target.rect.width / capture.width) * 100}%`,
                    height: `${(target.rect.height / capture.height) * 100}%`
                  }}
                />
              ))}
              <svg className="artifact-comment-drawing" viewBox={`0 0 ${capture.width} ${capture.height}`} aria-hidden="true">
                {strokes.map((stroke, index) => (
                  <polyline key={index} points={stroke.map((point) => `${point.x},${point.y}`).join(" ")} />
                ))}
              </svg>
              {notes.map((note) => (
                <span
                  className="artifact-comment-note"
                  key={note.id}
                  style={{
                    left: `${(note.x / capture.width) * 100}%`,
                    top: `${(note.y / capture.height) * 100}%`
                  }}
                >
                  {note.text}
                </span>
              ))}
              <div className="artifact-comment-cursor">
                {mode === "text" ? <Type aria-hidden="true" /> : <MousePointer2 aria-hidden="true" />}
              </div>
            </div>
          ) : (
            <div className="artifact-comment-loading">캡쳐 준비 중</div>
          )}
        </div>
        <div className="artifact-comment-actions">
          <span>{props.selectedTargets.length} selected layers</span>
          <Button type="button" disabled={!capture} onClick={saveCapture}>채팅에 첨부</Button>
        </div>
      </div>
    </div>
  );
}
