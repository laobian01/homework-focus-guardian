import React from 'react';
import { UserStats, Badge } from '../types';
import { BADGES, getLeaderboard, calculateDailyScore } from '../services/gamification';
import { Trophy, Star, Clock, Target } from 'lucide-react';

interface StatsViewProps {
  stats: UserStats;
}

const StatsView: React.FC<StatsViewProps> = ({ stats }) => {
  const currentScore = calculateDailyScore(stats);
  const leaderboard = getLeaderboard(currentScore);
  const earnedBadgeIds = stats.badges;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} 分钟`;
  };

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
      
      {/* Score Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy size={100} />
        </div>
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider">今日专注分</p>
          <div className="flex items-end gap-2">
            <h2 className="text-6xl font-black">{currentScore}</h2>
            <span className="text-xl mb-2 font-medium">/ 100</span>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-1">
              <Clock size={14} />
              {formatTime(stats.totalFocusTimeSeconds)}
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-1">
              <Target size={14} />
              {stats.distractionCount} 次分心
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Star className="text-yellow-400" size={18} fill="currentColor" />
          我的徽章
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((badge) => {
            const isUnlocked = earnedBadgeIds.includes(badge.id);
            return (
              <div 
                key={badge.id}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  isUnlocked 
                    ? 'bg-gray-800 border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
                    : 'bg-gray-900 border-gray-800 opacity-50 grayscale'
                }`}
              >
                <div className="text-2xl">{badge.icon}</div>
                <div>
                  <p className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {badge.name}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
           <h3 className="text-white font-bold flex items-center gap-2">
            <Trophy className="text-orange-400" size={18} />
            排行榜
          </h3>
          <span className="text-xs text-gray-500">本周</span>
        </div>
        <div>
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center p-4 border-b border-gray-700/50 last:border-0 ${
                entry.isCurrentUser ? 'bg-indigo-500/10' : ''
              }`}
            >
              <span className={`w-6 font-bold text-center mr-3 ${
                index === 0 ? 'text-yellow-400' : 
                index === 1 ? 'text-gray-300' : 
                index === 2 ? 'text-orange-400' : 'text-gray-600'
              }`}>
                {index + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-lg mr-3">
                {entry.avatar}
              </div>
              <span className={`flex-1 font-medium ${entry.isCurrentUser ? 'text-white' : 'text-gray-300'}`}>
                {entry.name} {entry.isCurrentUser && '(我)'}
              </span>
              <span className="font-bold text-indigo-400">{entry.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
