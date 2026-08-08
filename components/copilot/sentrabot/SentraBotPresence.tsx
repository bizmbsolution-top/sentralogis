import React from 'react';
import { motion } from 'framer-motion';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { AnimationResolver } from '@/src/platforms/experience/sentrabot/runtime/AnimationResolver';

export default function SentraBotPresence({ children }: { children: React.ReactNode }) {
  const bot = useSentraBot();
  const snapshot = bot.getSnapshot();
  const config = bot.getConfig();
  
  const variants = AnimationResolver.getPresenceVariants(snapshot.profile, config.reducedMotion);

  return (
    <motion.div
      variants={variants}
      animate={snapshot.presence}
      className="inline-flex items-center justify-center rounded-full"
    >
      {children}
    </motion.div>
  );
}
