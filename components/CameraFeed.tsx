import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface CameraFeedProps {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

export interface CameraHandle {
  captureFrame: () => string | null;
}

const CameraFeed = forwardRef<CameraHandle, CameraFeedProps>(({ onStreamReady, onError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoRef.current, 0, 0);
      // Reduce quality to 0.6 to save bandwidth/processing time
      return canvas.toDataURL('image/jpeg', 0.6); 
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Default to front camera
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          if (onStreamReady) onStreamReady(stream);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (onError) onError("无法访问摄像头，请检查权限设置。");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError, onStreamReady]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-2xl shadow-inner">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';
export default CameraFeed;
