/**
 * useWebRTC — peer-to-peer video call via Supabase Realtime signaling.
 *
 * Flow:
 *  1. Both peers subscribe to the same Realtime channel (`meet:{roomId}`)
 *  2. First to arrive sends "ready"; second sends an offer.
 *  3. SDP offer/answer + ICE candidates are exchanged through the channel.
 *  4. WebRTC connects directly (P2P) — Supabase is only used for signaling.
 *
 * STUN servers: Google's free public STUN servers.
 * TURN: not configured — connections through symmetric NAT may fail.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type CallStatus =
  | 'idle'          // not started
  | 'acquiring'     // getting camera/mic
  | 'waiting'       // waiting for the other peer
  | 'connecting'    // ICE negotiation
  | 'connected'     // call live
  | 'ended'         // call ended
  | 'error';

interface WebRTCState {
  status: CallStatus;
  errorMsg: string | null;
  audioMuted: boolean;
  videoOff: boolean;
  participantName: string | null;
}

export function useWebRTC(roomId: string, displayName: string) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myIdRef        = useRef(`${displayName}-${Math.random().toString(36).slice(2, 6)}`);
  const pendingICE     = useRef<RTCIceCandidateInit[]>([]);
  const isHostRef      = useRef(false);

  const [state, setState] = useState<WebRTCState>({
    status: 'idle', errorMsg: null,
    audioMuted: false, videoOff: false,
    participantName: null,
  });

  const setStatus = (status: CallStatus, errorMsg: string | null = null) =>
    setState(prev => ({ ...prev, status, errorMsg }));

  // ── Cleanup ─────────────────────────────────────────────
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  // ── Create RTCPeerConnection ─────────────────────────────
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Attach local tracks
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    // Remote track → remote video element
    const remote = new MediaStream();
    pc.ontrack = e => {
      e.streams[0]?.getTracks().forEach(t => remote.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    };

    // ICE candidates → send via signaling
    pc.onicecandidate = e => {
      if (e.candidate) {
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'ice', from: myIdRef.current, candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected')   setStatus('connected');
      if (s === 'disconnected' || s === 'failed') setStatus('ended');
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'checking') setStatus('connecting');
    };

    return pc;
  }, []);

  // ── Send offer (host) ───────────────────────────────────
  const sendOffer = useCallback(async () => {
    const pc = createPC();
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'offer', from: myIdRef.current, sdp: offer },
    });
  }, [createPC]);

  // ── Init: get media + subscribe to channel ───────────────
  const start = useCallback(async () => {
    setStatus('acquiring');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // prevent echo
      }
    } catch {
      setStatus('error', 'Camera/microphone access denied. Please allow access and reload.');
      return;
    }

    setStatus('waiting');

    // Subscribe to signaling channel
    const channel = supabase.channel(`meet:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { type, from, sdp, candidate } = payload as {
        type: string; from: string;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
      if (from === myIdRef.current) return; // ignore own messages

      if (type === 'ready') {
        // Another peer joined — we are host, send offer
        isHostRef.current = true;
        setState(prev => ({ ...prev, participantName: from.split('-')[0] }));
        await sendOffer();

      } else if (type === 'offer' && sdp) {
        // We received an offer — respond with answer
        setState(prev => ({ ...prev, participantName: from.split('-')[0] }));
        const pc = createPC();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'answer', from: myIdRef.current, sdp: answer },
        });
        // Drain buffered ICE
        for (const c of pendingICE.current) await pc.addIceCandidate(new RTCIceCandidate(c));
        pendingICE.current = [];

      } else if (type === 'answer' && sdp) {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
        for (const c of pendingICE.current) await pcRef.current?.addIceCandidate(new RTCIceCandidate(c));
        pendingICE.current = [];

      } else if (type === 'ice' && candidate) {
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingICE.current.push(candidate);
        }

      } else if (type === 'leave') {
        setStatus('ended');
      }
    });

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        // Announce presence
        channel.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'ready', from: myIdRef.current },
        });
      }
    });
  }, [roomId, sendOffer, createPC]);

  // ── Controls ─────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setState(prev => ({ ...prev, audioMuted: !prev.audioMuted }));
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setState(prev => ({ ...prev, videoOff: !prev.videoOff }));
  }, []);

  const hangup = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'leave', from: myIdRef.current },
    });
    cleanup();
    setStatus('ended');
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => () => { cleanup(); }, [cleanup]);

  return {
    localVideoRef, remoteVideoRef,
    status: state.status,
    errorMsg: state.errorMsg,
    audioMuted: state.audioMuted,
    videoOff: state.videoOff,
    participantName: state.participantName,
    start, toggleAudio, toggleVideo, hangup,
  };
}
