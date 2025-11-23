import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, History, LayoutDashboard, Home, Settings, Trophy } from 'lucide-react';
import CameraFeed, { CameraHandle } from './components/CameraFeed';
import StatusIndicator from './components/StatusIndicator';
import StatsView from './components/StatsView';
import VoiceRecorder from './components/VoiceRecorder';
import { analyzeFrame } from './services/monitorService';
import { checkBadges } from './services/gamification';
import { FocusStatus, LogEntry, AnalysisResult, UserStats, Badge } from './types';

const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds to be slightly more responsive for badges

type ViewMode = 'monitor' | 'stats' | 'settings';

function App() {
  const cameraRef = useRef<CameraHandle>(null);
  
  // App State
  const [view, setView] = useState<ViewMode>('monitor');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState<FocusStatus>(FocusStatus.IDLE);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gamification State
  const [stats, setStats] = useState<UserStats>({
    totalFocusTimeSeconds: 0,
    currentStreakSeconds: 0,
    longestStreakSeconds: 0,
    distractionCount: 0,
    badges: []
  });
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  // Settings State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [customAudio, setCustomAudio] = useState<string | null>(null);
  const [useCustomAudio, setUseCustomAudio] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());

  // Load settings from local storage on mount
  useEffect(() => {
    const savedAudio = localStorage.getItem('custom_audio_blob');
    if (savedAudio) {
      setCustomAudio(savedAudio);
      setUseCustomAudio(true);
    }
  }, []);

  // Save custom audio when changed
  const handleSaveAudio = (audioData: string) => {
    setCustomAudio(audioData);
    if (audioData) {
      localStorage.setItem('custom_audio_blob', audioData);
      setUseCustomAudio(true);
    } else {
      localStorage.removeItem('custom_audio_blob');
      setUseCustomAudio(false);
    }
  };

  const speak = useCallback((text: string) => {
    if (!audioEnabled) return;

    // Priority: Custom Audio if distracted
    if (useCustomAudio && customAudio && (status === FocusStatus.DISTRACTED || status === FocusStatus.ABSENT)) {
       const audio = new Audio(customAudio);
       audio.play().catch(e => console.error("Audio play failed", e));
       return;
    }

    // Fallback or Normal status: TTS
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; 
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, useCustomAudio, customAudio, status]);

  const updateStats = (newStatus: FocusStatus) => {
    setStats(prev => {
      const now = Date.now();
      const elapsedSeconds = (now - lastCheckTimeRef.current) / 1000;
      lastCheckTimeRef.current = now;

      // Don't count time if interval was huge (app backgrounded)
      const validElapsed = elapsedSeconds > 20 ? 0 : Math.min(elapsedSeconds, 10); // Cap at 10s per check

      let newStats = { ...prev };

      if (newStatus === FocusStatus.FOCUSED) {
        newStats.totalFocusTimeSeconds += Math.floor(validElapsed); // Actually using sample interval now
        newStats.currentStreakSeconds += Math.floor(validElapsed);
        if (newStats.currentStreakSeconds > newStats.longestStreakSeconds) {
          newStats.longestStreakSeconds = newStats.currentStreakSeconds;
        }
      } else if (newStatus === FocusStatus.DISTRACTED || newStatus === FocusStatus.ABSENT) {
        newStats.currentStreakSeconds = 0;
        newStats.distractionCount += 1;
      }

      // Check Badges
      const earnedBadge = checkBadges(newStats, newStats.badges);
      if (earnedBadge) {
        newStats.badges = [...newStats.badges, earnedBadge.id];
        setNewBadge(earnedBadge);
        // Clean up badge toast after 4s
        setTimeout(() => setNewBadge(null), 4000);
        
        // Announce Badge!
        if (audioEnabled) {
          const u = new SpeechSynthesisUtterance(`恭喜！获得了徽章：${earnedBadge.name}`);
          u.lang = 'zh-CN';
          window.speechSynthesis.speak(u);
        }
      }

      return newStats;
    });
  };

  const performCheck = useCallback(async () => {
    if (!cameraRef.current) return;

    // Reset reference time for stats calculation on every check
    lastCheckTimeRef.current = Date.now();

    const frameBase64 = cameraRef.current.captureFrame();
    if (!frameBase64) return;

    try {
      const result: AnalysisResult = await analyzeFrame(frameBase64);
      
      setStatus(result.status);
      setLastMessage(result.message);
      updateStats(result.status);
      
      if (result.status !== FocusStatus.ERROR) {
        setLogs(prev => [{
            id: Date.now().toString(),
            timestamp: new Date(),
            status: result.status,
            message: result.message
        }, ...prev].slice(0, 50));
      }

      // Voice Logic
      if (result.status === FocusStatus.DISTRACTED || result.status === FocusStatus.ABSENT) {
        speak(result.message);
      } else if (result.status === FocusStatus.FOCUSED) {
        // 15% chance to encourage if not distracted
        if (Math.random() > 0.85) {
           speak(result.message);
        }
      }

    } catch (err) {
      console.error("Check failed", err);
    }
  }, [speak]);

  // Monitor Loop
  useEffect(() => {
    if (isMonitoring) {
      lastCheckTimeRef.current = Date.now();
      performCheck(); 
      timerRef.current = window.setInterval(performCheck, CHECK_INTERVAL_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus(FocusStatus.IDLE);
      setLastMessage("");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMonitoring, performCheck]);

  const toggleMonitoring = () => setIsMonitoring(!isMonitoring);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto bg-gray-900 border-x border-gray-800 shadow-2xl overflow-hidden relative font-sans">
      
      {/* Header */}
      <header className="p-4 bg-gray-900/90 backdrop-blur-md z-10 flex justify-between items-center border-b border-gray-800 sticky top-0">
        <div>
           <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            专注卫士
          </h1>
          <p className="text-xs text-gray-500">AI Homework Companion</p>
        </div>
        <div className="flex items-center gap-2">
            {stats.badges.length > 0 && (
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                    <Trophy size={14} className="text-yellow-500"/>
                    <span className="text-xs font-bold text-yellow-500">{stats.badges.length}</span>
                </div>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar pb-20">
        
        {/* Badge Notification Toast */}
        {newBadge && (
            <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 rounded-xl shadow-2xl border border-yellow-300 flex items-center gap-4">
                    <div className="text-4xl animate-bounce">{newBadge.icon}</div>
                    <div>
                        <h4 className="font-bold text-white text-lg">解锁新成就!</h4>
                        <p className="text-white/90 text-sm">{newBadge.name}</p>
                    </div>
                </div>
            </div>
        )}

        {view === 'monitor' && (
          <>
            <div className="relative w-full aspect-[4/3] bg-black shrink-0">
              <CameraFeed ref={cameraRef} onError={(err) => setErrorMsg(err)} />
              {isMonitoring && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-mono text-white/80">LIVE</span>
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 p-6 text-center">
                    <p className="text-red-400 font-semibold">{errorMsg}</p>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gray-900 p-4 space-y-6">
              <StatusIndicator status={status} message={lastMessage} />
              
              <div className="flex justify-center">
                <button
                  onClick={toggleMonitoring}
                  className={`
                    group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-all duration-300 transform active:scale-95
                    ${isMonitoring 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-transparent'
                    }
                  `}
                >
                  {isMonitoring ? (
                    <>
                      <Square className="w-5 h-5 fill-current" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      开始专注
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 border-t border-gray-800 pt-4">
                 <div className="flex items-center gap-2 mb-3 text-gray-500 uppercase text-xs font-bold tracking-wider">
                   <History size={14} />
                   <span>实时记录</span>
                 </div>
                 <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                   {logs.map((log) => (
                       <div key={log.id} className="flex items-start gap-2 text-xs text-gray-400">
                         <span className="font-mono text-gray-600">{log.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                         <span className={log.status === FocusStatus.DISTRACTED ? 'text-red-400' : 'text-green-400'}>
                            {log.message}
                         </span>
                       </div>
                   ))}
                 </div>
              </div>
            </div>
          </>
        )}

        {view === 'stats' && <StatsView stats={stats} />}

        {view === 'settings' && (
            <div className="p-4 space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-white mb-4">设置</h2>
                
                {/* Audio Toggle */}
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white">语音提示</h3>
                        <p className="text-xs text-gray-400">开启后AI会语音提醒</p>
                    </div>
                    <button 
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${audioEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${audioEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {/* Custom Voice Recorder */}
                <div className={!audioEnabled ? 'opacity-50 pointer-events-none' : ''}>
                    <VoiceRecorder 
                        existingAudio={customAudio} 
                        onSave={handleSaveAudio} 
                    />
                </div>
            </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bg-gray-900 border-t border-gray-800 h-16 flex items-center justify-around absolute bottom-0 w-full z-40 pb-safe">
        <button 
            onClick={() => setView('monitor')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'monitor' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <Home size={22} />
            <span className="text-[10px] font-medium">监控</span>
        </button>
        <button 
            onClick={() => setView('stats')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'stats' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <LayoutDashboard size={22} />
            <span className="text-[10px] font-medium">成就</span>
        </button>
        <button 
            onClick={() => setView('settings')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'settings' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <Settings size={22} />
            <span className="text-[10px] font-medium">设置</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
