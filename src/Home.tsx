import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Heading, Text, Stack, Spinner, Badge } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import * as api from './api';
import { FaMicrophone, FaStop, FaPause, FaPlay } from 'react-icons/fa';
import { Result } from './Result';

type Nullable<T> = T | null;

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${mm}:${String(ss).padStart(2,'0')}`;
}

const Home: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [asr, setAsr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [language, setLanguage] = useState<'en' | 'zh' | 'zh-TW' | 'zh-CN'>('en');
  const taskIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const mediaRecorderRef = useRef<Nullable<MediaRecorder>>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<Nullable<MediaStream>>(null);
  const audioCtxRef = useRef<Nullable<AudioContext>>(null);
  const analyserRef = useRef<Nullable<AnalyserNode>>(null);
  const dataArrayRef = useRef<Nullable<Uint8Array>>(null);
  const rafRef = useRef<Nullable<number>>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickRef = useRef<Nullable<() => void>>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [progress, setProgress] = useState<any | null>(null);

  // helper: normalize various getResult formats into a plain transcript string
  const extractTranscript = (res: any): string | null => {
    if (!res) return null;
    // if server returned a JSON-encoded string, try parsing
    if (typeof res === 'string') {
      // try parse JSON
      try {
        const parsed = JSON.parse(res);
        return extractTranscript(parsed);
      } catch (_) {
        // not JSON — return raw string
        return res;
      }
    }
    // if array of segments
    if (Array.isArray(res)) {
      const parts: string[] = [];
      for (const seg of res) {
        if (!seg) continue;
        const t = seg.onebest || seg.asr_text || seg.transcript || seg.text || null;
        if (t) parts.push(String(t));
      }
      return parts.length ? parts.join(' ') : null;
    }
    // if object with common fields
    if (typeof res === 'object') {
      if (res.onebest || res.asr_text || res.transcript || res.text) {
        return String(res.onebest || res.asr_text || res.transcript || res.text);
      }
      // some responses may embed an array under 'data' or 'segments'
      if (res.data) return extractTranscript(res.data);
      if (res.segments) return extractTranscript(res.segments);
    }
    return null;
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch {}
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
    };
  }, []);
  const beginCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      source.connect(analyser);

  const mediaRecorder = new MediaRecorder(stream);
      // collect data chunks
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (ev) => {
        console.debug('[recorder] dataavailable', ev);
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mediaRecorder.onstart = () => console.info('[recorder] started');
      mediaRecorder.onpause = () => console.info('[recorder] paused');
      mediaRecorder.onresume = () => console.info('[recorder] resumed');
      mediaRecorder.onstop = () => console.info('[recorder] stopped');
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setIsRecording(true);
  console.info('Recording started');
      // start elapsed timer
      setElapsedMs(0);
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      timerRef.current = window.setInterval(() => {
        setElapsedMs((s) => s + 1000);
      }, 1000) as unknown as number;

      const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        (analyserRef.current as any).getByteTimeDomainData(dataArrayRef.current);

        // compute RMS for the badge indicator
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const v = (dataArrayRef.current[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        const levelVal = Math.min(1, rms * 3);
        setLevel(levelVal);

        // draw waveform to canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);
            // background
            ctx.fillStyle = '#F7FAFC';
            ctx.fillRect(0, 0, width, height);
            // waveform
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#E53E3E';
            ctx.beginPath();
            const sliceWidth = width / dataArrayRef.current.length;
            let x = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              const v = dataArrayRef.current[i] / 255.0;
              const y = v * height;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              x += sliceWidth;
            }
            ctx.stroke();
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

  tickRef.current = tick;
  rafRef.current = requestAnimationFrame(tickRef.current);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopCapture = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
      console.info('stopCapture called: mediaRecorder stopped');
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setLevel(0);
  };

  const start = () => {
    setSummary(null);
    beginCapture();
  };

  const stop = async () => {
    setIsRecording(false);

    // stop and wait for final dataavailable/onstop to fire
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const mr = mediaRecorderRef.current;
      await new Promise<void>((resolve) => {
        mr.onstop = () => resolve();
        try { mr.stop(); } catch { resolve(); }
      });
      mediaRecorderRef.current = null;
    }

  // assemble blob from chunks
  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  console.debug('[recorder] assembled blob', { size: blob.size, parts: chunksRef.current.length });
    chunksRef.current = [];

    setIsUploading(true);

    try {
      const filename = `recording_${Date.now()}.webm`;
      // create task
      console.info('[api-flow] prepareTask starting', { filename, size: blob.size });
  const taskId = await api.prepareTask(filename, String(blob.size), 1);
      console.info('[api-flow] prepareTask returned', { taskId });
  taskIdRef.current = taskId;

      // upload single segment
      console.info('[api-flow] uploadSegment starting', { taskId });
      const uploadResp = await api.uploadSegment(taskId, 1, String(blob.size), blob, filename);
      console.info('[api-flow] uploadSegment response', uploadResp);

      // try to fetch immediate ASR result (may be partial); show in UI
    try {
    console.debug('[api-flow] fetching initial ASR getResult', { taskId });
    const res = await api.getResult(taskId);
    console.debug('[api-flow] getResult initial', res);
    // try to pick a plausible transcription string from response
  console.debug('raw getResult (suppressed):', res);
  const possibleText = extractTranscript(res);
  if (possibleText) setAsr(possibleText);
      } catch (e) {
        console.debug('[api-flow] initial getResult failed', e);
      }

      // Do not call the summarizer automatically here.
      // We display the ASR/transcript first and let the user press the "Summarize" button when ready.
      console.info('[api-flow] upload complete — transcript shown when available; summarization is manual (use Summarize button)');
    } catch (err) {
      console.error(err);
      setSummary('An error occurred while processing the audio.');
    } finally {
      setIsUploading(false);
    }
  };

  // manual summarize button handler
  const onManualSummarize = async () => {
    const taskId = taskIdRef.current;
    if (!taskId) return alert('No task available. Record first.');
    const supported = ['en', 'zh', 'zh-TW', 'zh-CN'];
    const langToUse = supported.includes(language) ? language : 'en';
    setIsUploading(true);
    try {
      console.info('[manual] calling summarizeFromTask', { taskId, language: langToUse });
      const summ = await api.summarizeFromTask(taskId, langToUse);
      console.info('[manual] summarize returned', summ);
      setSummary(summ);
    } catch (e) {
      console.warn('[manual] summarize failed', e);
      alert('Summarize call failed: ' + (e as any)?.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onRefreshAsr = async () => {
    const taskId = taskIdRef.current;
    if (!taskId) return alert('No task available. Record first.');
    try {
      setIsUploading(true);
    const res = await api.getResult(taskId);
  console.debug('raw getResult (suppressed):', res);
  const possibleText = extractTranscript(res);
  if (possibleText) setAsr(possibleText);
      else alert('No ASR result available yet.');
    } catch (e) {
      console.warn('[manual] getResult failed', e);
      alert('Failed to fetch ASR result');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box minH="80vh" py={12} px={6}>
      <Stack gap={6} maxW="lg" mx="auto" bg="white" boxShadow="xl" p={8} rounded="lg">
        <Heading size="lg" color="teal.500">Home</Heading>

        <Text color="gray.600">Record a short meeting and get an automatic summary.</Text>

        <Box maxW="xs">
          <Text fontSize="sm" mb={2}>Language</Text>
          <select value={language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value as any)} style={{ width: '100%', padding: '6px 10px', borderRadius: 6 }}>
            <option value="en">English (en)</option>
            <option value="zh">Chinese (zh)</option>
            <option value="zh-TW">Chinese Traditional (zh-TW)</option>
            <option value="zh-CN">Chinese Simplified (zh-CN)</option>
          </select>
        </Box>

        {!isRecording ? (
          <Button colorScheme="teal" size="lg" onClick={start} disabled={isUploading}>
            <FaMicrophone style={{ marginRight: 8 }} />Start Recording
          </Button>
        ) : (
          <Box>
            <Box display="flex" gap={3} mt={2}>
            <Button colorScheme={isPaused ? 'green' : 'orange'} size="md" onClick={() => {
              // pause/resume media recorder and waveform
              const mr = mediaRecorderRef.current;
              if (!mr) return;
              if (!isPaused) {
                try { mr.pause(); } catch {}
                setIsPaused(true);
                if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
                // pause timer
                if (timerRef.current) { clearInterval(timerRef.current as any); timerRef.current = null; }
              } else {
                try { mr.resume(); } catch {}
                setIsPaused(false);
                if (tickRef.current && !rafRef.current) rafRef.current = requestAnimationFrame(tickRef.current);
                // resume timer
                if (!timerRef.current) {
                  timerRef.current = window.setInterval(() => {
                    setElapsedMs((s) => s + 1000);
                  }, 1000) as unknown as number;
                }
              }
            }}>
              {isPaused ? <FaPlay style={{ marginRight: 8 }} /> : <FaPause style={{ marginRight: 8 }} />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button colorScheme="red" size="lg" onClick={stop} disabled={isUploading}>
              <FaStop style={{ marginRight: 8 }} />Stop Recording
            </Button>
          </Box>
          <Box mt={2}>
            <Text color="gray.600">Recorded: {formatElapsed(elapsedMs)}</Text>
          </Box>
        </Box>
        )}

        {isUploading && (
          <Box textAlign="center">
            <Spinner />
            <Text mt={2}>{progress?.task_status === 2 ? 'Processing audio...' : 'Uploading and summarizing...'}</Text>
            {progress && (
              <Text mt={1} fontSize="sm" color="gray.500">Status: {progress.desc || progress.task_status}</Text>
            )}
          </Box>
        )}

        <Box w="100%">
          <Box display="flex" alignItems="center" gap={3} mt={2}>

            <Box flex="1">
              <canvas ref={canvasRef} style={{ width: '100%', height: 64, display: 'block' }} />
            </Box>
          </Box>
        </Box>

        {/* ASR results + manual summarize */}
        <Box mt={4}>
          <Heading size="sm" mb={2}>Transcript</Heading>
          <Box bg="gray.50" p={3} rounded="md" minH={16}>
            <Text whiteSpace="pre-wrap">{asr ?? 'No transcription available yet.'}</Text>
          </Box>
          <Box mt={2} display="flex" gap={3}>
            <Button size="sm" onClick={onRefreshAsr} disabled={!taskIdRef.current || isUploading}>Get Transcript</Button>
            <Button size="sm" colorScheme="teal" onClick={onManualSummarize} disabled={!taskIdRef.current || isUploading}>Summarize</Button>
          </Box>
          {/* raw getResult debug removed */}
        </Box>

        {summary && (
          <Result summary={summary} />
        )}
      </Stack>
    </Box>
  );
};

export default Home;

