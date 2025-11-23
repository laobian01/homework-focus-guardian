import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Save } from 'lucide-react';

interface VoiceRecorderProps {
  onSave: (audioBlob: string) => void; // Passing base64 string
  existingAudio: string | null;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, existingAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Feature detection for mobile compatibility (iOS Safari vs Android Chrome)
      let options: MediaRecorderOptions | undefined = undefined;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      // Initialize recorder with best supported options or default
      const recorder = options 
        ? new MediaRecorder(stream, options) 
        : new MediaRecorder(stream);
        
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Use the actual mime type of the recording for the Blob
        const blobType = recorder.mimeType || 'audio/webm'; 
        const blob = new Blob(chunksRef.current, { type: blobType });
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
          onSave(base64data);
        };
        
        // Stop all tracks to release mic and turn off the red dot
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请在手机浏览器设置中允许权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => alert("播放失败: " + e.message));
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    onSave(""); // Clear in parent
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Mic className="w-4 h-4 text-blue-400" />
        自定义提醒语音
      </h3>
      
      <div className="flex items-center justify-between gap-4">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg animate-pulse"
          >
            <Square size={18} fill="currentColor" />
            <span>停止录音...</span>
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
          >
            <Mic size={18} />
            <span>{audioUrl ? '重新录制' : '点击录制'}</span>
          </button>
        )}
      </div>

      {audioUrl && !isRecording && (
        <div className="mt-4 flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
          <button onClick={playRecording} className="p-2 bg-blue-500 rounded-full hover:bg-blue-600 text-white">
            <Play size={16} fill="currentColor" />
          </button>
          <span className="flex-1 text-xs text-gray-400 ml-2">已保存的录音</span>
          <button onClick={deleteRecording} className="p-2 text-gray-500 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
        录制一段爸爸或妈妈的声音，比如："宝贝，要专心写作业哦！"。
        <br/><span className="text-gray-600">* iOS设备请取消静音模式以播放声音。</span>
      </p>
    </div>
  );
};

export default VoiceRecorder;