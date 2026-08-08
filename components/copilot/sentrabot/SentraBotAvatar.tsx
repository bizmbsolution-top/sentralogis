import React from 'react';
import { motion } from 'framer-motion';
import SentraBotPresence from './SentraBotPresence';
import SentraBotEmotion from './SentraBotEmotion';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { AnimationResolver } from '@/src/platforms/experience/sentrabot/runtime/AnimationResolver';

interface SentraBotAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function SentraBotAvatar({ size = 'md' }: SentraBotAvatarProps) {
  const bot = useSentraBot();
  const snapshot = bot.getSnapshot();
  const coreVariants = AnimationResolver.getCoreAvatarVariants();
  
  const sizeClass = {
    'sm': 'w-8 h-8',
    'md': 'w-12 h-12',
    'lg': 'w-16 h-16'
  }[size];

  return (
    <SentraBotPresence>
      <div className={sizeClass}>
        <SentraBotEmotion>
          {(color) => (
            <motion.div 
              variants={coreVariants}
              animate={snapshot.animationState}
              className="w-full h-full flex items-center justify-center"
            >
              <svg viewBox="0 0 100 100" className="w-2/3 h-2/3 relative z-10">
                {/* Sentralogis Stylized S */}
                <motion.path
                  d="M 70 30 Q 70 20 50 20 Q 30 20 30 40 Q 30 60 50 60 Q 70 60 70 80 Q 70 100 50 100 Q 30 100 30 90"
                  fill="none"
                  stroke={color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  animate={{ stroke: color }}
                  transition={{ duration: snapshot.profile.transitionDuration }}
                />
                
                {/* AI Core Glow */}
                <motion.circle 
                  cx="50" cy="50" r="6" 
                  fill={color} 
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: snapshot.profile.blinkInterval / 1000, ease: 'easeInOut' }}
                />
              </svg>
            </motion.div>
          )}
        </SentraBotEmotion>
      </div>
    </SentraBotPresence>
  );
}
