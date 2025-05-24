"use client";

import React from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, BookOpen, Award } from "lucide-react";

interface CategoryNodeProps {
  data: {
    category: string;
    semester: number;
    subcategories: any[];
    expanded: boolean;
    onToggle: () => void;
    progress: {
      level: number;
      status: string;
    };
  };
}

export const CategoryNode: React.FC<CategoryNodeProps> = ({ data }) => {
  const { category, semester, subcategories, expanded, onToggle, progress } =
    data;

  const getProgressColor = (level: number) => {
    if (level >= 80) return "from-emerald-500 to-teal-600";
    if (level >= 60) return "from-blue-500 to-cyan-600";
    if (level >= 40) return "from-yellow-500 to-orange-600";
    if (level >= 20) return "from-orange-500 to-red-600";
    return "from-gray-500 to-gray-600";
  };

  const getStatusIcon = (level: number) => {
    if (level >= 80) return <Award className="w-5 h-5 text-emerald-400" />;
    return <BookOpen className="w-5 h-5 text-blue-400" />;
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="relative"
    >
      <motion.div
        onClick={(e) => {
          console.log("CategoryNode clicked:", category, e);
          e.stopPropagation();
          onToggle();
        }}
        className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 min-w-[300px] cursor-pointer transition-all duration-200 shadow-xl hover:shadow-purple-500/25"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        style={{ pointerEvents: "auto", zIndex: 10 }}
      >
        {/* Progress ring background */}
        <div className="absolute -top-6 -right-6 w-16 h-16">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 36 36"
          >
            <path
              className="text-gray-700/50"
              strokeDasharray="100, 100"
              strokeWidth="3"
              fill="none"
              stroke="currentColor"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`text-gradient bg-gradient-to-r ${getProgressColor(
                progress.level
              )} text-transparent bg-clip-text`}
              strokeDasharray={`${progress.level}, 100`}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              stroke="url(#gradient)"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {progress.level}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(progress.level)}
            <div>
              <h3 className="text-white font-bold text-lg">{category}</h3>
              <p className="text-purple-300 text-sm">Semestre {semester}</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            <ChevronRight className="w-6 h-6 text-purple-300" />
          </motion.div>
        </div>

        <div className="text-purple-200 text-sm mb-4">
          {subcategories.length} sous-catégories
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700/50 rounded-full h-2 mb-2">
          <motion.div
            className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(
              progress.level
            )}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress.level}%` }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-purple-300">
          <span>Progression</span>
          <span>{progress.status}</span>
        </div>
      </motion.div>

      {/* Only show handle when expanded */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Handle
          id="source"
          type="source"
          position={Position.Right}
          className="!bg-purple-500 !border-purple-300 !w-3 !h-3"
        />
      </motion.div>
    </motion.div>
  );
};
