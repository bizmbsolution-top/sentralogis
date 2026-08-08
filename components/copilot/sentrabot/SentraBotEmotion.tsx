import React from 'react';
import { motion } from 'framer-motion';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';

interface SentraBotEmotionProps {
  children: (color: string) => React.ReactNode;
}

export default function SentraBotEmotion({ children }: SentraBotEmotionProps) {
  const bot = useSentraBot();
  const snapshot = bot.getSnapshot();
  const profile = snapshot.profile;

  return (
    <motion.div
      animate={{ 
        boxShadow: `0 0 15px ${profile.color}40`,
        borderColor: profile.color 
      }}
      transition={{ duration: profile.transitionDuration }}
      className="rounded-full border-2 bg-white flex items-center justify-center relative overflow-hidden"
    >
      {/* Background tint based on emotion */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ 
          backgroundColor: profile.color,
          opacity: profile.glowIntensity * 0.5 
        }}
        transition={{ duration: profile.transitionDuration }}
      />
      {children(profile.color)}
    </motion.div>
  );
}
