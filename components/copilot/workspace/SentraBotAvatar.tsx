'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, CheckCircle2, AlertOctagon, Clock, Lightbulb } from 'lucide-react';

export type SentraBotState = 'idle' | 'thinking' | 'timeline_update' | 'recommendation_ready' | 'execution_success' | 'validation_failed';

interface SentraBotAvatarProps {
  state: SentraBotState;
  size?: 'sm' | 'md' | 'lg';
}

export default function SentraBotAvatar({ state, size = 'md' }: SentraBotAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const indicatorSizeClasses = {
    sm: 'w-3 h-3 -bottom-1 -right-1',
    md: 'w-4 h-4 -bottom-1 -right-1',
    lg: 'w-5 h-5 -bottom-1 -right-1'
  };

  const getContainerConfig = () => {
    switch (state) {
      case 'idle':
        return {
          bg: 'bg-slate-800 border-slate-700',
          iconColor: 'text-slate-400',
          animation: {}
        };
      case 'thinking':
        return {
          bg: 'bg-indigo-900/50 border-indigo-500/50',
          iconColor: 'text-indigo-400',
          animation: {
            boxShadow: ['0px 0px 0px 0px rgba(99, 102, 241, 0)', '0px 0px 0px 8px rgba(99, 102, 241, 0.2)', '0px 0px 0px 0px rgba(99, 102, 241, 0)'],
            transition: { repeat: Infinity, duration: 2 }
          }
        };
      case 'timeline_update':
        return {
          bg: 'bg-blue-900/50 border-blue-500/50',
          iconColor: 'text-blue-400',
          animation: { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
        };
      case 'recommendation_ready':
        return {
          bg: 'bg-violet-900/50 border-violet-500/50',
          iconColor: 'text-violet-400',
          animation: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 1.5 } }
        };
      case 'execution_success':
        return {
          bg: 'bg-emerald-900/50 border-emerald-500/50',
          iconColor: 'text-emerald-400',
          animation: { scale: [0.9, 1.1, 1], transition: { duration: 0.4 } }
        };
      case 'validation_failed':
        return {
          bg: 'bg-rose-900/50 border-rose-500/50',
          iconColor: 'text-rose-400',
          animation: { x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.4 } }
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700',
          iconColor: 'text-slate-400',
          animation: {}
        };
    }
  };

  const getStatusIndicator = () => {
    switch (state) {
      case 'thinking':
        return (
          <div className={`absolute ${indicatorSizeClasses[size]} rounded-full bg-indigo-500 flex items-center justify-center`}>
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
        );
      case 'timeline_update':
        return (
          <div className={`absolute ${indicatorSizeClasses[size]} rounded-full bg-blue-500 flex items-center justify-center`}>
            <Clock className="w-2.5 h-2.5 text-white" />
          </div>
        );
      case 'recommendation_ready':
        return (
          <div className={`absolute ${indicatorSizeClasses[size]} rounded-full bg-violet-500 flex items-center justify-center`}>
            <Lightbulb className="w-2.5 h-2.5 text-white" />
          </div>
        );
      case 'execution_success':
        return (
          <div className={`absolute ${indicatorSizeClasses[size]} rounded-full bg-emerald-500 flex items-center justify-center`}>
            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
          </div>
        );
      case 'validation_failed':
        return (
          <div className={`absolute ${indicatorSizeClasses[size]} rounded-full bg-rose-500 flex items-center justify-center`}>
            <AlertOctagon className="w-2.5 h-2.5 text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const config = getContainerConfig();

  return (
    <div className="relative inline-block">
      <motion.div
        animate={config.animation}
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center border ${config.bg} backdrop-blur-sm shadow-sm`}
      >
        <Bot className={`${iconSizeClasses[size]} ${config.iconColor}`} />
      </motion.div>
      {getStatusIndicator()}
    </div>
  );
}
