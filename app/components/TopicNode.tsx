"use client";

import React from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Star,
  Zap,
  Clock,
  Trophy,
  Play,
} from "lucide-react";

interface TopicNodeProps {
  data: {
    id: string;
    name: string;
    progress: {
      level: number;
      status: string;
    };
    onProgressUpdate: (progress: number) => void;
  };
}

export const TopicNode: React.FC<TopicNodeProps> = ({ data }) => {
  const { id, name, progress } = data;
  const router = useRouter();

  const getMasteryLevel = (level: number) => {
    if (level >= 90)
      return { name: "Master", icon: Trophy, color: "text-yellow-400" };
    if (level >= 70)
      return { name: "Expert", icon: Star, color: "text-purple-400" };
    if (level >= 50)
      return { name: "Advanced", icon: Zap, color: "text-blue-400" };
    if (level >= 25)
      return { name: "Intermediate", icon: Clock, color: "text-orange-400" };
    return { name: "Beginner", icon: Circle, color: "text-gray-400" };
  };

  const mastery = getMasteryLevel(progress.level);
  const MasteryIcon = mastery.icon;

  const getProgressColor = (level: number) => {
    if (level >= 80) return "from-emerald-400 to-teal-500";
    if (level >= 60) return "from-blue-400 to-cyan-500";
    if (level >= 40) return "from-yellow-400 to-orange-500";
    if (level >= 20) return "from-orange-400 to-red-500";
    return "from-gray-400 to-gray-500";
  };

  const handleNodeClick = () => {
    router.push("/lesson");
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push("/exercise");
  };

  return (
    <div className="relative">
      <div
        className="bg-gradient-to-br from-slate-800/90 to-gray-900/90 backdrop-blur-md border border-slate-500/30 rounded-md p-3 min-w-[200px] cursor-pointer transition-all duration-150 shadow-md"
        onClick={handleNodeClick}
      >
        {/* Mastery badge */}
        <div className="absolute -top-2 -left-2">
          <div
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
          >
            <MasteryIcon className={`w-3 h-3 ${mastery.color}`} />
          </div>
        </div>

        <div className="flex items-start justify-between mb-2">
          <h5 className="text-white font-medium text-xs leading-tight pr-2">
            {name}
          </h5>
          {progress.level === 100 && (
            <div>
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Progress visualization */}
        <div className="mb-2">
          <div className="w-full bg-gray-700/50 rounded-full h-1">
            <div
              className={`h-1 rounded-full bg-gradient-to-r ${getProgressColor(
                progress.level
              )}`}
              style={{ width: `${progress.level}%` }}
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
            onClick={handlePlayClick}
            className="p-1 rounded-full transition-colors duration-150 bg-green-500/20 text-green-400 hover:bg-green-500/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <Play className="w-3 h-3" />
          </motion.button>
        </div>

        {/* Subtle glow effect for high progress */}
        {progress.level >= 80 && (
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-emerald-400/20 to-teal-400/20 pointer-events-none" />
        )}
      </div>

      <Handle
        id={`target`}
        type="target"
        position={Position.Left}
        className="!bg-slate-500 !border-slate-300 !w-1.5 !h-1.5"
      />
    </div>
  );
};
