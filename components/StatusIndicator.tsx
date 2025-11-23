import React from 'react';
import { FocusStatus } from '../types';
import { CheckCircle2, AlertTriangle, UserX, Activity } from 'lucide-react';

interface StatusIndicatorProps {
  status: FocusStatus;
  message?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
  const getStatusConfig = () => {
    switch (status) {
      case FocusStatus.FOCUSED:
        return {
          color: 'bg-green-500',
          borderColor: 'border-green-400',
          icon: <CheckCircle2 className="w-8 h-8 text-white" />,
          label: '专注中',
          textColor: 'text-green-400'
        };
      case FocusStatus.DISTRACTED:
        return {
          color: 'bg-red-500',
          borderColor: 'border-red-400',
          icon: <AlertTriangle className="w-8 h-8 text-white" />,
          label: '分心了',
          textColor: 'text-red-400'
        };
      case FocusStatus.ABSENT:
        return {
          color: 'bg-yellow-500',
          borderColor: 'border-yellow-400',
          icon: <UserX className="w-8 h-8 text-white" />,
          label: '无人',
          textColor: 'text-yellow-400'
        };
      case FocusStatus.ERROR:
        return {
          color: 'bg-gray-500',
          borderColor: 'border-gray-400',
          icon: <AlertTriangle className="w-8 h-8 text-white" />,
          label: '错误',
          textColor: 'text-gray-400'
        };
      default:
        return {
          color: 'bg-blue-500',
          borderColor: 'border-blue-400',
          icon: <Activity className="w-8 h-8 text-white" />,
          label: '待机',
          textColor: 'text-blue-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex flex-col items-center justify-center w-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`relative flex items-center justify-center w-20 h-20 rounded-full ${config.color} shadow-lg shadow-${config.color}/40 border-4 ${config.borderColor} transition-colors duration-300`}>
        {config.icon}
        {status === FocusStatus.FOCUSED && (
           <div className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-20"></div>
        )}
      </div>
      <h2 className={`mt-3 text-2xl font-bold ${config.textColor}`}>{config.label}</h2>
      {message && (
        <p className="mt-1 text-gray-300 text-sm text-center max-w-[80%] opacity-90">
          "{message}"
        </p>
      )}
    </div>
  );
};

export default StatusIndicator;
