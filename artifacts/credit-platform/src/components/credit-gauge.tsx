import React from 'react';
import { motion } from 'framer-motion';

interface CreditGaugeProps {
  score: number;
  rating: string;
}

export function CreditGauge({ score, rating }: CreditGaugeProps) {
  const radius = 60;
  const circumference = Math.PI * radius; // Semi-circle
  const strokeDasharray = `${circumference} ${circumference}`;
  
  // Bureau scale runs 300-850
  const normalizedScore = Math.max(300, Math.min(850, score));
  const percentage = (normalizedScore - 300) / 550;
  const strokeDashoffset = circumference - percentage * circumference;

  let color = "text-green-500";
  let dropShadow = "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]";
  
  if (rating === "Very Poor") { color = "text-red-500"; dropShadow = "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"; }
  else if (rating === "Poor") { color = "text-orange-500"; dropShadow = "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"; }
  else if (rating === "Fair") { color = "text-yellow-500"; dropShadow = "drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"; }
  else if (rating === "Good") { color = "text-cyan-400"; dropShadow = "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"; }

  return (
    <div className="relative flex flex-col items-center justify-center py-6">
      <svg className="w-64 h-36" viewBox="0 0 160 80">
        {/* Background Arc */}
        <path
          d={`M 20 70 A ${radius} ${radius} 0 0 1 140 70`}
          fill="none"
          className="stroke-slate-200"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value Arc */}
        <motion.path
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d={`M 20 70 A ${radius} ${radius} 0 0 1 140 70`}
          fill="none"
          className={`${color} ${dropShadow}`}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
      </svg>
      <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center">
        <motion.span 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-display font-bold text-gray-900 tracking-tighter"
        >
          {score}
        </motion.span>
        <span className={`text-sm font-medium uppercase tracking-widest mt-1 ${color}`}>
          {rating}
        </span>
      </div>
    </div>
  );
}
