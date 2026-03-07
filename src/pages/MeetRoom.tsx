import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check,
  Users, Wifi, WifiOff, Loader2, AlertCircle, ArrowLeft,
} from 'lucide-react';
import { useWebRTC, CallStatus } from '@/hooks/useWebRTC';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<CallStatus, string> = {
  idle:       'Ready',
  acquiring:  'Starting camera…',
  waiting:    'Waiting for others to join…',
  connecting: 'Connecting…',
  connected:  'Connected',
  ended:      'Call ended',
  error:      'Error',
};

// ── Control button ────────────────────────────────────────
function CtrlBtn({
  icon, activeIcon, active, activeClass, onClick, label, danger,
}: {
  icon: React.ReactNode; activeIcon?: React.ReactNode;
  active?: boolean; activeClass?: string;
  onClick: () => void; label: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex flex-col items-center gap-1 group',
        danger && 'opacity-90 hover:opacity-100',
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center transition-all',
        danger
          ? 'bg-destructive hover:bg-destructive/80 text-white'
          : active
          ? (activeClass ?? 'bg-red-500/20 text-red-400 border border-red-500/30')
          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
      )}>
        {active && activeIcon ? activeIcon : icon}
      </div>
      <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors">{label}</span>
    </button>
  );
}

export default function MeetRoom() {
  const { roomId }        = useParams<{ roomId: string }>();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { user }          = useAuth();

  const titleParam = searchParams.get('title') ?? '';

  // If user is logged in use their name, else ask for guest name
  const [guestName, setGuestName] = useState('');
  const [joined, setJoined]       = useState(false);
  const [copied, setCopied]       = useState(false);

  const displayName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? guestName;

  const {
    localVideoRef, remoteVideoRef,
    status, errorMsg, audioMuted, videoOff, participantName,
    start, toggleAudio, toggleVideo, hangup,
  } = useWebRTC(roomId ?? 'room', displayName);

  useEffect(() => {
    // Auto-start if user is already logged in
    if (user && !joined) { setJoined(true); start(); }
  }, [user]);

  const handleGuestJoin = () => {
    if (!guestName.trim()) return;
    setJoined(true);
    start();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHangup = () => { hangup(); navigate(-1); };

  // ── Guest name screen ─────────────────────────────────
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Join Meeting</h1>
            {titleParam && <p className="text-sm text-white/50 mt-1">{decodeURIComponent(titleParam)}</p>}
            <p className="text-xs text-white/30 mt-2">Room: {roomId}</p>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Your name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-center"
              autoFocus
            />
            <Button onClick={handleGuestJoin} disabled={!guestName.trim()} className="w-full">
              <Video className="w-4 h-4 mr-2" /> Join Now
            </Button>
          </div>
          <button onClick={() => navigate(-1)} className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-3 h-3" /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-white">{titleParam ? decodeURIComponent(titleParam) : 'Meeting Room'}</p>
            <p className="text-[10px] text-white/30">Room: {roomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {status === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : status === 'error' ? (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
            )}
            <span className={cn('text-xs', status === 'connected' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-white/40')}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {/* Copy invite link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <><Check className="w-3 h-3 text-emerald-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy invite link</>}
          </button>
        </div>
      </div>

      {/* ── Video grid ──────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">

        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          className={cn(
            'w-full h-full object-cover',
            status !== 'connected' && 'opacity-0',
          )}
        />

        {/* Waiting overlay */}
        {status !== 'connected' && status !== 'ended' && status !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {/* Participant avatar placeholder */}
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Users className="w-9 h-9 text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-white/60 text-sm font-medium">{STATUS_LABEL[status]}</p>
              {status === 'waiting' && (
                <p className="text-white/30 text-xs mt-1">Share the invite link for others to join</p>
              )}
            </div>
            {status === 'waiting' && (
              <button
                onClick={copyLink}
                className="flex items-center gap-2 text-xs text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Invite Link</>}
              </button>
            )}
          </div>
        )}

        {/* Connected — remote participant name */}
        {status === 'connected' && participantName && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <p className="text-white text-xs font-medium">{participantName}</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white font-semibold">Something went wrong</p>
            <p className="text-white/50 text-sm max-w-xs">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Leave Room</Button>
          </div>
        )}

        {/* Call ended */}
        {status === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <PhoneOff className="w-7 h-7 text-white/30" />
            </div>
            <div>
              <p className="text-white font-semibold">Call Ended</p>
              <p className="text-white/40 text-sm mt-1">The other participant left the call</p>
            </div>
            <Button size="sm" onClick={() => navigate(-1)}>Return to Lead</Button>
          </div>
        )}

        {/* ── Local video (PiP corner) ─────────────────── */}
        <div className="absolute bottom-24 right-4 w-36 aspect-video rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-slate-800">
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            className={cn('w-full h-full object-cover', videoOff && 'opacity-0')}
          />
          {videoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <VideoOff className="w-6 h-6 text-white/30" />
            </div>
          )}
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-[10px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded">You</span>
          </div>
        </div>
      </div>

      {/* ── Controls bar ────────────────────────────────── */}
      {status !== 'ended' && status !== 'error' && (
        <div className="flex items-center justify-center gap-6 px-6 py-5 border-t border-white/5 bg-slate-950">
          <CtrlBtn
            icon={<Mic className="w-5 h-5" />}
            activeIcon={<MicOff className="w-5 h-5" />}
            active={audioMuted}
            onClick={toggleAudio}
            label={audioMuted ? 'Unmute' : 'Mute'}
          />
          <CtrlBtn
            icon={<Video className="w-5 h-5" />}
            activeIcon={<VideoOff className="w-5 h-5" />}
            active={videoOff}
            onClick={toggleVideo}
            label={videoOff ? 'Start Video' : 'Stop Video'}
          />
          <CtrlBtn
            icon={<PhoneOff className="w-5 h-5" />}
            onClick={handleHangup}
            label="End Call"
            danger
          />
        </div>
      )}
    </div>
  );
}
