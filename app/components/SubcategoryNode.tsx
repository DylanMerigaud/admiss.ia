"use client";

import React from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { ChevronRight, Layers, Target } from "lucide-react";

interface SubcategoryNodeProps {
  data: {
    id: string;
    name: string;
    topics: string[];
    expanded: boolean;
    onToggle: () => void;
    progress: {
      level: number;
      status: string;
    };
  };
}

export const SubcategoryNode: React.FC<SubcategoryNodeProps> = ({ data }) => {
  const { id, name, topics, expanded, onToggle, progress } = data;

  const getProgressColor = (level: number) => {
    if (level >= 80) return "from-emerald-400 to-teal-500";
    if (level >= 60) return "from-blue-400 to-cyan-500";
    if (level >= 40) return "from-yellow-400 to-orange-500";
    if (level >= 20) return "from-orange-400 to-red-500";
    return "from-gray-400 to-gray-500";
  };

  return (
    <div className="relative">
      <div
        onClick={onToggle}
        className="bg-gradient-to-br from-cyan-900/90 to-blue-900/90 backdrop-blur-md border border-cyan-500/30 rounded-lg p-4 min-w-[250px] cursor-pointer transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
      >
        {/* Mini progress indicator */}
        <div className="absolute -top-1 -right-1 w-8 h-8">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 36 36"
          >
            <circle
              className="text-gray-700/50"
              strokeWidth="4"
              fill="none"
              stroke="currentColor"
              r="15.9155"
              cx="18"
              cy="18"
            />
            <circle
              className="text-cyan-400"
              strokeDasharray={`${progress.level}, 100`}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              stroke="currentColor"
              r="15.9155"
              cx="18"
              cy="18"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">
              {progress.level}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-white font-semibold text-sm">{name}</h4>
          </div>
          <div>
            <ChevronRight className="w-4 h-4 text-cyan-300" />
          </div>
        </div>

        <div className="text-cyan-200 text-xs mb-3">{topics.length} topics</div>

        {/* Mini progress bar */}
        <div className="w-full bg-gray-700/50 rounded-full h-1.5 mb-2">
          <div
            className={`h-1.5 rounded-full bg-gradient-to-r ${getProgressColor(
              progress.level
            )}`}
            style={{ width: `${progress.level}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-cyan-300">
          <span>Mastery</span>
          <span className="flex items-center space-x-1">
            {progress.level >= 80 && <Target className="w-2 h-2" />}
            <span>{progress.level}%</span>
          </span>
        </div>
      </div>

      <Handle
        id={`target`}
        type="target"
        isConnectableStart={false}
        position={Position.Left}
        className="!bg-cyan-500 !border-cyan-300 !w-2 !h-2"
      />

      {/* Only show source handle when expanded */}

      <Handle
        isConnectableStart={false}
        id={`source`}
        type="source"
        position={Position.Right}
        className="!bg-cyan-500 !border-cyan-300 !w-2 !h-2"
      />
    </div>
  );
};
