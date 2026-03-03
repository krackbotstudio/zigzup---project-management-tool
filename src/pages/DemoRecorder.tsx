import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video, Mic, MicOff, Camera, CameraOff, Square, Pause, Play,
  Download, Save, Trash2, Pencil, ArrowUpRight, Type, Eraser,
  RotateCcw, Scissors, Upload, Library, Search, MoreVertical,
  Clock, HardDrive, AlertCircle, Circle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'reviewing' | 'uploading';
type AnnotationTool = 'pen' | 'arrow' | 'rect' | 'text' | 'eraser';

interface RecordingMeta {
  id: string;
  userId: string;
  name: string;
  duration: number;
  size: number;
  mimeType: string;
  createdAt: Date;
  downloadURL: string;
  storagePath: string;
  thumbnail: string;
  tags: string[];
}

interface Point { x: number; y: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function generateThumbnail(video: HTMLVideoElement): Promise<string> {
  return new Promise((resolve) => {
    const seek = () => {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 320;
      thumbCanvas.height = 180;
      thumbCanvas.getContext('2d')!.drawImage(video, 0, 0, 320, 180);
      resolve(thumbCanvas.toDataURL('image/jpeg', 0.7));
    };
    if (video.readyState >= 2) {
      video.currentTime = 0.5;
      video.onseeked = seek;
    } else {
      video.onloadeddata = () => { video.currentTime = 0.5; video.onseeked = seek; };
    }
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 rounded-xl">
      <span
        key={count}
        className="text-9xl font-black text-white drop-shadow-2xl animate-in zoom-in-50 duration-300"
      >
        {count}
      </span>
    </div>
  );
}

function RecordingIndicator({ elapsed }: { elapsed: number }) {
  return (
    <div className="absolute top-3 right-3 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
      <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
      <span className="text-white text-xs font-mono font-bold">{formatTime(elapsed)}</span>
    </div>
  );
}

const ANNOTATION_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff'];

function AnnotationToolbar({
  activeTool, setActiveTool, strokeColor, setStrokeColor,
  strokeSize, setStrokeSize, onClear, visible,
}: {
  activeTool: AnnotationTool; setActiveTool: (t: AnnotationTool) => void;
  strokeColor: string; setStrokeColor: (c: string) => void;
  strokeSize: number; setStrokeSize: (s: number) => void;
  onClear: () => void; visible: boolean;
}) {
  if (!visible) return null;
  const tools: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'pen', icon: <Pencil className="w-4 h-4" />, label: 'Pen' },
    { tool: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, label: 'Arrow' },
    { tool: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
    { tool: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
    { tool: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
        {tools.map(({ tool, icon, label }) => (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool(tool)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  activeTool === tool
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {icon}
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Separator orientation="vertical" className="h-7" />
      <div className="flex items-center gap-1">
        {ANNOTATION_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setStrokeColor(c)}
            style={{ background: c }}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
              strokeColor === c ? 'border-foreground scale-110' : 'border-transparent'
            )}
          />
        ))}
      </div>
      <Separator orientation="vertical" className="h-7" />
      <div className="flex items-center gap-2 w-24">
        <span className="text-xs text-muted-foreground">Size</span>
        <Slider
          min={1} max={12} step={1}
          value={[strokeSize]}
          onValueChange={([v]) => setStrokeSize(v)}
          className="w-16"
        />
      </div>
      <Separator orientation="vertical" className="h-7" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClear}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Clear annotations</TooltipContent>
      </Tooltip>
    </div>
  );
}

function TrimEditor({
  duration, trimStart, trimEnd, onTrimChange, previewVideoRef,
}: {
  duration: number; trimStart: number; trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="flex items-center gap-2">
        <Scissors className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Trim Recording</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {formatTime(trimStart)} — {formatTime(trimEnd)}
          <span className="ml-2 text-foreground font-semibold">({formatTime(trimEnd - trimStart)} selected)</span>
        </span>
      </div>
      <Slider
        min={0}
        max={duration}
        step={0.1}
        value={[trimStart, trimEnd]}
        onValueChange={([start, end]) => {
          onTrimChange(start, end);
          if (previewVideoRef.current) previewVideoRef.current.currentTime = start;
        }}
        className="w-full"
      />
      <video
        ref={previewVideoRef as React.RefObject<HTMLVideoElement>}
        className="w-full rounded-lg aspect-video bg-black"
        controls
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.currentTime >= trimEnd) video.currentTime = trimStart;
        }}
      />
    </div>
  );
}

function RecordingCard({
  recording, onPlay, onRename, onDownload, onDelete,
}: {
  recording: RecordingMeta;
  onPlay: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-card-hover transition-all">
      <div
        className="relative aspect-video bg-muted cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        {recording.thumbnail ? (
          <img
            src={recording.thumbnail}
            alt={recording.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Play className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
          {formatTime(recording.duration)}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1">{recording.name}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted transition-colors shrink-0 -mr-1">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPlay}>
                <Play className="w-4 h-4 mr-2" /> Play
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatTime(recording.duration)}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />{formatFileSize(recording.size)}
          </span>
          <span className="ml-auto">{formatDate(recording.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Library className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-base font-semibold text-foreground">No recordings yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Record a demo in the Recorder tab and save it to your library. It will appear here.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DemoRecorder() {
  const { user } = useAuth();

  // ── Recording state machine ──
  const [recState, setRecState] = useState<RecordingState>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Media refs ──
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Recorder refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);

  // ── Options ──
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  // ── Annotation ──
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [strokeSize, setStrokeSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<Point | null>(null);
  const drawStartRef = useRef<Point | null>(null);
  const annotationSnapshotRef = useRef<ImageData | null>(null);

  // ── Trim ──
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Save / upload ──
  const [recordingName, setRecordingName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Library ──
  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [playingRecording, setPlayingRecording] = useState<RecordingMeta | null>(null);
  const [deletingRecording, setDeletingRecording] = useState<RecordingMeta | null>(null);

  // ── Browser support check ──
  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

  // ─── Cleanup helpers ────────────────────────────────────────────────────────

  const stopAllStreams = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    webcamStreamRef.current = null;
  }, []);

  const stopCompositeLoop = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  }, []);

  const resetRecordingState = useCallback(() => {
    stopCompositeLoop();
    stopTimer();
    stopAllStreams();
    chunksRef.current = [];
    setElapsedSeconds(0);
    setRecordingName('');
    setTrimStart(0);
    setTrimEnd(0);
    setVideoDuration(0);
    if (previewVideoRef.current?.src?.startsWith('blob:')) {
      URL.revokeObjectURL(previewVideoRef.current.src);
      previewVideoRef.current.src = '';
    }
    // Clear annotation canvas
    const ac = annotationCanvasRef.current;
    if (ac) ac.getContext('2d')?.clearRect(0, 0, ac.width, ac.height);
  }, [stopAllStreams, stopCompositeLoop, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      stopTimer();
      stopAllStreams();
    };
  }, [stopAllStreams, stopTimer]);

  // ─── Canvas composite loop ───────────────────────────────────────────────────

  const startCompositeLoop = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    const screenVideo = screenVideoRef.current;
    if (!canvas || !screenVideo) return;

    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      if (screenVideo.readyState >= 2) {
        const w = screenVideo.videoWidth || 1280;
        const h = screenVideo.videoHeight || 720;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          // Sync annotation canvas size
          const ac = annotationCanvasRef.current;
          if (ac) { ac.width = w; ac.height = h; }
        }
        ctx.drawImage(screenVideo, 0, 0, w, h);

        // PiP webcam overlay
        const webcamVideo = webcamVideoRef.current;
        if (webcamEnabled && webcamVideo && webcamVideo.readyState >= 2) {
          const pipW = w * 0.22;
          const pipH = pipW * (3 / 4);
          const pipX = w - pipW - 20;
          const pipY = h - pipH - 20;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 10);
          ctx.clip();
          ctx.drawImage(webcamVideo, pipX, pipY, pipW, pipH);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 10);
          ctx.stroke();
        }
      }
      rafIdRef.current = requestAnimationFrame(draw);
    };
    rafIdRef.current = requestAnimationFrame(draw);
  }, [webcamEnabled]);

  // ─── Start recording flow ────────────────────────────────────────────────────

  const beginActualRecording = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const canvasStream = canvas.captureStream(30);
    const audioTracks: MediaStreamTrack[] = [];
    screenStreamRef.current?.getAudioTracks().forEach(t => audioTracks.push(t));
    if (micEnabled && webcamStreamRef.current) {
      webcamStreamRef.current.getAudioTracks().forEach(t => audioTracks.push(t));
    }

    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

    chunksRef.current = [];
    const mr = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 2_500_000 });

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      recordedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      if (previewVideoRef.current) {
        previewVideoRef.current.src = url;
        previewVideoRef.current.onloadedmetadata = () => {
          const dur = previewVideoRef.current!.duration;
          setVideoDuration(dur);
          setTrimStart(0);
          setTrimEnd(dur);
        };
      }
      stopCompositeLoop();
      stopTimer();
      setRecState('reviewing');
    };

    mr.start(1000);
    mediaRecorderRef.current = mr;
    setRecState('recording');

    // Timer
    const start = Date.now() - elapsedSeconds * 1000;
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 500);

    // Handle user clicking browser "Stop sharing"
    const track = screenStreamRef.current?.getVideoTracks()[0];
    track?.addEventListener('ended', () => {
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
      stopAllStreams();
      stopCompositeLoop();
      stopTimer();
    });
  }, [micEnabled, elapsedSeconds, stopCompositeLoop, stopTimer, stopAllStreams]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('Screen recording is not supported in this browser.');
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      screenStreamRef.current = screenStream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
        await screenVideoRef.current.play().catch(() => { });
      }

      if (webcamEnabled) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: micEnabled,
          });
          webcamStreamRef.current = webcamStream;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = webcamStream;
            await webcamVideoRef.current.play().catch(() => { });
          }
        } catch {
          toast.warning('Webcam not available — continuing without PiP.');
        }
      }

      startCompositeLoop();
      setRecState('countdown');
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        toast.error('Could not start screen capture.');
      }
      stopAllStreams();
    }
  }, [isSupported, webcamEnabled, micEnabled, startCompositeLoop, stopAllStreams]);

  // Countdown effect
  useEffect(() => {
    if (recState !== 'countdown') return;
    let count = 3;
    setCountdown(3);
    const id = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(id);
        setCountdown(null);
        beginActualRecording();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [recState]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    stopAllStreams();
  }, [stopAllStreams]);

  const togglePause = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      stopTimer();
      setRecState('paused');
    } else if (mr.state === 'paused') {
      mr.resume();
      const base = Date.now() - elapsedSeconds * 1000;
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - base) / 1000));
      }, 500);
      setRecState('recording');
    }
  }, [elapsedSeconds, stopTimer]);

  // ─── Annotation drawing ──────────────────────────────────────────────────────

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = annotationCanvasRef.current!.getBoundingClientRect();
    const scaleX = annotationCanvasRef.current!.width / rect.width;
    const scaleY = annotationCanvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const drawArrowhead = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const headLen = 14;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleAnnotationMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') return; // handled separately
    const ac = annotationCanvasRef.current;
    if (!ac) return;
    const ctx = ac.getContext('2d')!;
    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    lastPointRef.current = pt;
    drawStartRef.current = pt;
    if (activeTool === 'arrow' || activeTool === 'rect') {
      annotationSnapshotRef.current = ctx.getImageData(0, 0, ac.width, ac.height);
    }
    if (activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  };

  const handleAnnotationMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ac = annotationCanvasRef.current;
    if (!ac) return;
    const ctx = ac.getContext('2d')!;
    const pt = getCanvasCoords(e);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'pen') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      lastPointRef.current = pt;
    } else if (activeTool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, strokeSize * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      lastPointRef.current = pt;
    } else if (activeTool === 'arrow' && drawStartRef.current && annotationSnapshotRef.current) {
      ctx.putImageData(annotationSnapshotRef.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(drawStartRef.current.x, drawStartRef.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      drawArrowhead(ctx, drawStartRef.current, pt);
    } else if (activeTool === 'rect' && drawStartRef.current && annotationSnapshotRef.current) {
      ctx.putImageData(annotationSnapshotRef.current, 0, 0);
      const x = Math.min(drawStartRef.current.x, pt.x);
      const y = Math.min(drawStartRef.current.y, pt.y);
      const w = Math.abs(pt.x - drawStartRef.current.x);
      const h = Math.abs(pt.y - drawStartRef.current.y);
      ctx.strokeRect(x, y, w, h);
    }
  };

  const handleAnnotationMouseUp = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
    drawStartRef.current = null;
    annotationSnapshotRef.current = null;
    const ac = annotationCanvasRef.current;
    if (ac && activeTool === 'pen') {
      ac.getContext('2d')?.closePath();
    }
  };

  const handleAnnotationClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'text') return;
    const pt = getCanvasCoords(e);
    const text = window.prompt('Enter annotation text:');
    if (!text) return;
    const ac = annotationCanvasRef.current!;
    const ctx = ac.getContext('2d')!;
    ctx.font = `bold ${strokeSize * 6 + 12}px Inter, sans-serif`;
    ctx.fillStyle = strokeColor;
    ctx.fillText(text, pt.x, pt.y);
  };

  const clearAnnotations = useCallback(() => {
    const ac = annotationCanvasRef.current;
    if (ac) ac.getContext('2d')?.clearRect(0, 0, ac.width, ac.height);
  }, []);

  // ─── Download ────────────────────────────────────────────────────────────────

  const downloadFull = useCallback(() => {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    const name = recordingName.trim() || 'demo-recording';
    triggerDownload(blob, `${name}.webm`);
  }, [recordingName]);

  const downloadTrimmed = useCallback(() => {
    const video = previewVideoRef.current;
    if (!video || !recordedBlobRef.current) return;

    toast.info('Preparing trimmed download…');
    video.currentTime = trimStart;

    const stream = (video as HTMLVideoElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 2_500_000 });
    const parts: Blob[] = [];

    mr.ondataavailable = (ev) => { if (ev.data.size > 0) parts.push(ev.data); };
    mr.onstop = () => {
      const trimmedBlob = new Blob(parts, { type: 'video/webm' });
      const name = recordingName.trim() || 'demo-recording';
      triggerDownload(trimmedBlob, `${name}-trimmed.webm`);
      toast.success('Trimmed download ready!');
    };

    video.play();
    mr.start();

    video.ontimeupdate = () => {
      if (video.currentTime >= trimEnd) {
        mr.stop();
        video.pause();
        video.ontimeupdate = null;
      }
    };
  }, [trimStart, trimEnd, recordingName]);

  // ─── Firebase upload / library ───────────────────────────────────────────────

  const saveToLibrary = useCallback(async () => {
    if (!recordedBlobRef.current || !user) return;
    setRecState('uploading');
    setUploadProgress(100); // Simulate progress as supabase JS doesn't support native object upload progress tracking easily

    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const storagePath = `${user.id}/${recordingId}.webm`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(storagePath, recordedBlobRef.current, {
          contentType: 'video/webm',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(storagePath);

      const thumbnail = previewVideoRef.current
        ? await generateThumbnail(previewVideoRef.current)
        : '';

      const { error: dbError } = await supabase.from('recordings').insert({
        id: recordingId,
        user_id: user.id,
        name: recordingName.trim() || `Recording ${new Date().toLocaleDateString()}`,
        duration: videoDuration,
        size: recordedBlobRef.current!.size,
        mime_type: 'video/webm',
        storage_path: storagePath,
        download_url: publicUrl,
        thumbnail,
        tags: [],
        created_at: new Date().toISOString()
      });

      if (dbError) throw dbError;

      toast.success('Recording saved to your library!');
      setUploadProgress(0);
      setRecState('idle');
      resetRecordingState();
      fetchLibrary();
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
      setRecState('reviewing');
    }
  }, [user, recordingName, videoDuration, resetRecordingState]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase.from('recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const recs = (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        name: d.name,
        duration: d.duration,
        size: d.size,
        mimeType: d.mime_type,
        createdAt: new Date(d.created_at),
        downloadURL: d.download_url,
        storagePath: d.storage_path,
        thumbnail: d.thumbnail,
        tags: d.tags || []
      })) as RecordingMeta[];
      setRecordings(recs);
    } catch (err) {
      toast.error('Could not load library. Check database.');
    } finally {
      setLibraryLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const renameRecording = useCallback(async (id: string, newName: string) => {
    try {
      const { error } = await supabase.from('recordings').update({ name: newName }).eq('id', id);
      if (error) throw error;
      setRecordings(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
      setRenamingId(null);
      toast.success('Renamed');
    } catch {
      toast.error('Rename failed');
    }
  }, []);

  const deleteRecording = useCallback(async (recording: RecordingMeta) => {
    try {
      await supabase.storage.from('recordings').remove([recording.storagePath]);
      const { error } = await supabase.from('recordings').delete().eq('id', recording.id);
      if (error) throw error;
      setRecordings(prev => prev.filter(r => r.id !== recording.id));
      toast.success('Recording deleted');
    } catch {
      toast.error('Delete failed');
    }
    setDeletingRecording(null);
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const isAnnotationActive = recState === 'recording' || recState === 'paused' || recState === 'reviewing';
  const annotationPointerEvents = isAnnotationActive ? 'auto' : 'none';
  const filteredRecordings = recordings.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Video className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demo Recorder</h1>
          <p className="text-sm text-muted-foreground">Record, annotate, and share interactive product demos</p>
        </div>
        {recState === 'recording' && (
          <Badge variant="destructive" className="ml-auto animate-pulse">● REC</Badge>
        )}
        {recState === 'paused' && (
          <Badge variant="outline" className="ml-auto">⏸ PAUSED</Badge>
        )}
      </div>

      {/* Browser compat warning */}
      {!isSupported && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Browser not supported</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Screen recording requires Chrome 94+ or Edge 94+. Safari does not support <code>getDisplayMedia</code>.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="recorder">
        <TabsList className="mb-6">
          <TabsTrigger value="recorder" className="gap-2">
            <Video className="w-4 h-4" /> Recorder
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <Library className="w-4 h-4" /> Library
            {recordings.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {recordings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── RECORDER TAB ── */}
        <TabsContent value="recorder" className="space-y-4">

          {/* Preview Area */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border">
            {/* Hidden video sources */}
            <video ref={screenVideoRef} className="hidden" muted playsInline />
            <video ref={webcamVideoRef} className="hidden" muted playsInline />

            {/* Composite canvas */}
            <canvas
              ref={compositeCanvasRef}
              className="w-full h-full object-contain"
            />

            {/* Annotation overlay canvas */}
            <canvas
              ref={annotationCanvasRef}
              className={cn(
                'absolute inset-0 w-full h-full',
                activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
              )}
              style={{ pointerEvents: annotationPointerEvents }}
              onMouseDown={handleAnnotationMouseDown}
              onMouseMove={handleAnnotationMouseMove}
              onMouseUp={handleAnnotationMouseUp}
              onMouseLeave={handleAnnotationMouseUp}
              onClick={handleAnnotationClick}
            />

            {/* Idle placeholder */}
            {recState === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 bg-muted/10">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <Video className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-sm text-muted-foreground">Click <strong>Start Recording</strong> to begin</p>
              </div>
            )}

            {/* Countdown overlay */}
            {recState === 'countdown' && countdown !== null && (
              <CountdownOverlay count={countdown} />
            )}

            {/* Recording indicator */}
            {(recState === 'recording' || recState === 'paused') && (
              <RecordingIndicator elapsed={elapsedSeconds} />
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-muted/30 border border-border">
            {/* Recording controls */}
            <div className="flex items-center gap-2">
              {recState === 'idle' || recState === 'reviewing' ? (
                <Button
                  onClick={startRecording}
                  disabled={!isSupported || recState === 'reviewing'}
                  className="gap-2 bg-rose-500 hover:bg-rose-600 text-white"
                  size="sm"
                >
                  <Circle className="w-3 h-3 fill-current" />
                  Start Recording
                </Button>
              ) : recState === 'countdown' ? (
                <Button variant="outline" size="sm" disabled>
                  Starting…
                </Button>
              ) : (
                <>
                  <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2">
                    <Square className="w-3 h-3 fill-current" /> Stop
                  </Button>
                  <Button onClick={togglePause} variant="outline" size="sm" className="gap-2">
                    {recState === 'paused'
                      ? <><Play className="w-3 h-3" /> Resume</>
                      : <><Pause className="w-3 h-3" /> Pause</>
                    }
                  </Button>
                </>
              )}
            </div>

            <Separator orientation="vertical" className="h-7" />

            {/* Annotations */}
            <AnnotationToolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              strokeSize={strokeSize}
              setStrokeSize={setStrokeSize}
              onClear={clearAnnotations}
              visible={isAnnotationActive}
            />

            {/* Options — push to right */}
            <div className="ml-auto flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Camera className={cn('w-4 h-4', webcamEnabled ? 'text-primary' : 'text-muted-foreground/50')} />
                <Switch
                  checked={webcamEnabled}
                  onCheckedChange={setWebcamEnabled}
                  disabled={recState !== 'idle'}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Mic className={cn('w-4 h-4', micEnabled ? 'text-primary' : 'text-muted-foreground/50')} />
                <Switch
                  checked={micEnabled}
                  onCheckedChange={setMicEnabled}
                  disabled={recState !== 'idle'}
                />
              </label>
            </div>
          </div>

          {/* Review / Upload Panel */}
          {(recState === 'reviewing' || recState === 'uploading') && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              {/* Trim editor */}
              {videoDuration > 0 && (
                <TrimEditor
                  duration={videoDuration}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onTrimChange={(s, e) => { setTrimStart(s); setTrimEnd(e); }}
                  previewVideoRef={previewVideoRef}
                />
              )}

              {/* Upload progress */}
              {recState === 'uploading' && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4 text-primary animate-bounce" />
                    <span>Uploading to library… {uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Save row */}
              {recState === 'reviewing' && (
                <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl bg-muted/20 border border-border">
                  <Input
                    placeholder="Recording name (optional)"
                    value={recordingName}
                    onChange={e => setRecordingName(e.target.value)}
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <Button onClick={saveToLibrary} className="gap-2" size="sm">
                      <Save className="w-4 h-4" /> Save to Library
                    </Button>
                    <Button onClick={downloadFull} variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" /> Download Full
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={downloadTrimmed} variant="outline" size="sm" className="gap-2">
                          <Scissors className="w-4 h-4" /> Download Trimmed
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Chrome/Edge only — uses captureStream API</TooltipContent>
                    </Tooltip>
                    <Button
                      onClick={() => { resetRecordingState(); setRecState('idle'); }}
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                    >
                      <RotateCcw className="w-4 h-4" /> Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── LIBRARY TAB ── */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search recordings…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="ml-auto">
              {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? 's' : ''}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchLibrary} disabled={libraryLoading}>
              {libraryLoading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          {libraryLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRecordings.length === 0 ? (
            <EmptyLibrary />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecordings.map(rec => (
                renamingId === rec.id ? (
                  <div key={rec.id} className="rounded-xl border border-primary p-4 space-y-3">
                    <p className="text-sm font-medium">Rename recording</p>
                    <Input
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameRecording(rec.id, renameValue);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => renameRecording(rec.id, renameValue)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <RecordingCard
                    key={rec.id}
                    recording={rec}
                    onPlay={() => setPlayingRecording(rec)}
                    onRename={() => { setRenamingId(rec.id); setRenameValue(rec.name); }}
                    onDownload={() => {
                      const a = document.createElement('a');
                      a.href = rec.downloadURL;
                      a.download = `${rec.name}.webm`;
                      a.target = '_blank';
                      a.click();
                    }}
                    onDelete={() => setDeletingRecording(rec)}
                  />
                )
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Playback dialog */}
      <Dialog open={!!playingRecording} onOpenChange={() => setPlayingRecording(null)}>
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle className="truncate">{playingRecording?.name}</DialogTitle>
          </DialogHeader>
          {playingRecording && (
            <video
              src={playingRecording.downloadURL}
              controls
              autoPlay
              className="w-full rounded-lg aspect-video bg-black"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingRecording} onOpenChange={() => setDeletingRecording(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recording?</AlertDialogTitle>
            <AlertDialogDescription>
              "<strong>{deletingRecording?.name}</strong>" will be permanently deleted from your library and storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingRecording && deleteRecording(deletingRecording)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
