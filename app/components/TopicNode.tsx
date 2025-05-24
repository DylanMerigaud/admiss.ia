"use client";

import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Circle,
  Star,
  Zap,
  Clock,
  Trophy,
  Play,
  Pause,
} from "lucide-react";

interface TopicNodeProps {
  data: {
    name: string;
    progress: {
      level: number;
      status: string;
    };
    onProgressUpdate: (progress: number) => void;
  };
}

export const TopicNode: React.FC<TopicNodeProps> = ({ data }) => {
  const { name, progress, onProgressUpdate } = data;
  const [isStudying, setIsStudying] = useState(false);

  const getMasteryLevel = (level: number) => {
    if (level >= 90)
      return { name: "Maître", icon: Trophy, color: "text-yellow-400" };
    if (level >= 70)
      return { name: "Expert", icon: Star, color: "text-purple-400" };
    if (level >= 50)
      return { name: "Avancé", icon: Zap, color: "text-blue-400" };
    if (level >= 25)
      return { name: "Intermédiaire", icon: Clock, color: "text-orange-400" };
    return { name: "Débutant", icon: Circle, color: "text-gray-400" };
  };

  const mastery = getMasteryLevel(progress.level);
  const MasteryIcon = mastery.icon;

  const handleStudy = () => {
    setIsStudying(!isStudying);
    if (!isStudying) {
      // Simulate progress gain
      const newProgress = Math.min(
        100,
        progress.level + Math.floor(Math.random() * 10) + 5
      );
      onProgressUpdate(newProgress);
    }
  };

  const getProgressColor = (level: number) => {
    if (level >= 80) return "from-emerald-400 to-teal-500";
    if (level >= 60) return "from-blue-400 to-cyan-500";
    if (level >= 40) return "from-yellow-400 to-orange-500";
    if (level >= 20) return "from-orange-400 to-red-500";
    return "from-gray-400 to-gray-500";
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, x: -50 }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        type: "spring",
        stiffness: 400,
        damping: 35,
      }}
      className="relative"
    >
      <motion.div
        className={`bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-md border rounded-md p-3 min-w-[200px] cursor-pointer transition-all duration-150 shadow-md ${
          isStudying
            ? "border-green-400/50 shadow-green-400/25"
            : "border-slate-500/30"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        animate={{
          scale: isStudying ? 1.02 : 1,
          boxShadow: isStudying
            ? "0 0 20px rgba(34, 197, 94, 0.25)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Mastery badge */}
        <div className="absolute -top-2 -left-2">
          <motion.div
            className={`w-6 h-6 rounded-full bg-slate-800 border-2 flex items-center justify-center ${
              progress.level >= 90
                ? "border-yellow-400"
                : progress.level >= 70
                ? "border-purple-400"
                : progress.level >= 50
                ? "border-blue-400"
                : progress.level >= 25
                ? "border-orange-400"
                : "border-gray-500"
            }`}
            animate={{
              rotate: progress.level >= 90 ? [0, 360] : 0,
              scale: isStudying ? [1, 1.15, 1] : 1,
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.8, repeat: Infinity },
            }}
          >
            <MasteryIcon className={`w-3 h-3 ${mastery.color}`} />
          </motion.div>
        </div>

        <div className="flex items-start justify-between mb-2">
          <h5 className="text-white font-medium text-xs leading-tight pr-2">
            {name}
          </h5>
          {progress.level === 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, duration: 0.3 }}
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            </motion.div>
          )}
        </div>

        {/* Progress visualization */}
        <div className="mb-2">
          <div className="w-full bg-gray-700/50 rounded-full h-1">
            <motion.div
              className={`h-1 rounded-full bg-gradient-to-r ${getProgressColor(
                progress.level
              )}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.level}%` }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className={`text-[10px] font-medium ${mastery.color}`}>
              {mastery.name}
            </span>
            <span className="text-gray-400 text-[10px]">{progress.level}%</span>
          </div>

          <motion.button
            onClick={handleStudy}
            className={`p-1 rounded-full transition-colors duration-150 ${
              isStudying
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            {isStudying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </motion.button>
        </div>

        {/* Subtle glow effect for high progress */}
        {progress.level >= 80 && (
          <motion.div
            className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-400/20 to-teal-400/20 pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-500 !border-slate-300 !w-1.5 !h-1.5"
      />
    </motion.div>
  );
};
