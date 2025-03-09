import { useState, useRef } from "react";
import RecordRTC, { Options, StereoAudioRecorder } from "recordrtc";

const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<RecordRTC | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const options: Options = {
      type: "audio",
      recorderType: StereoAudioRecorder,
      numberOfAudioChannels: 2,
      checkForInactiveTracks: true,
      bufferSize: 16384,
      mimeType: "audio/wav",
      disableLogs: true,
    };

    mediaRecorderRef.current = new RecordRTC(stream, options);
    mediaRecorderRef.current.startRecording();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stopRecording(() => {
        const blob = mediaRecorderRef.current?.getBlob();
        if (!blob) return;
        setAudioBlob(blob);
        mediaRecorderRef.current?.destroy();
      });
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording, audioBlob };
};

export default useRecorder;
