import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  IconButton,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaDownload } from 'react-icons/fa';

interface RecordingProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
}

export const Recording: React.FC<RecordingProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(`${type.toUpperCase()}: ${msg}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete?.(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      showMessage('Recording started', 'success');
    } catch (error) {
      console.error('Error starting recording:', error);
      showMessage('Error starting recording. Please check your microphone permissions', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      showMessage('Recording stopped', 'info');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const downloadRecording = () => {
    if (audioBlob && audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `recording-${new Date().toISOString().slice(0, 19)}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showMessage('Recording downloaded', 'success');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} bg="white" boxShadow="xl" rounded="lg">
      <VStack gap={6}>
        <Heading size="lg" color="teal.500" textAlign="center">
          Audio Recording
        </Heading>

        {message && (
          <Box
            p={3}
            bg={message.startsWith('SUCCESS') ? 'green.100' : message.startsWith('ERROR') ? 'red.100' : 'blue.100'}
            color={message.startsWith('SUCCESS') ? 'green.800' : message.startsWith('ERROR') ? 'red.800' : 'blue.800'}
            rounded="md"
            w="100%"
            textAlign="center"
          >
            {message}
          </Box>
        )}

        <Box textAlign="center">
          <Text fontSize="4xl" fontWeight="bold" color={isRecording ? 'red.500' : 'gray.600'}>
            {formatTime(recordingTime)}
          </Text>
          {isRecording && (
            <Badge colorScheme="red" mt={2}>
              {isPaused ? 'PAUSED' : 'RECORDING'}
            </Badge>
          )}
        </Box>

        {isRecording && (
          <Box w="100%" h="8px" bg="gray.200" rounded="full" overflow="hidden">
            <Box
              h="100%"
              bg="red.500"
              w={`${(recordingTime % 10) * 10}%`}
              transition="width 1s linear"
            />
          </Box>
        )}

        <HStack gap={4}>
          {!isRecording ? (
            <Button colorScheme="red" size="lg" onClick={startRecording}>
              <FaMicrophone style={{ marginRight: '8px' }} />
              Start Recording
            </Button>
          ) : (
            <>
              <IconButton
                aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                colorScheme="orange"
                size="lg"
                onClick={pauseRecording}
              >
                {isPaused ? <FaPlay /> : <FaPause />}
              </IconButton>
              <Button colorScheme="gray" size="lg" onClick={stopRecording}>
                <FaStop style={{ marginRight: '8px' }} />
                Stop Recording
              </Button>
            </>
          )}
        </HStack>

        {audioBlob && (
          <VStack gap={4} w="100%">
            <Text fontSize="sm" color="gray.600">
              Recording completed! ({(audioBlob.size / 1024 / 1024).toFixed(2)} MB)
            </Text>
            <HStack gap={2}>
              <Button colorScheme="teal" size="sm" onClick={downloadRecording}>
                <FaDownload style={{ marginRight: '8px' }} />
                Download
              </Button>
            </HStack>
          </VStack>
        )}

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Make sure your microphone is enabled and working properly.
        </Text>
      </VStack>
    </Box>
  );
};
