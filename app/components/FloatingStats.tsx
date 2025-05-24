"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Clock, Zap, Award, BookOpen } from "lucide-react";
import { useProgress } from "../contexts/ProgressContext";

export const FloatingStats: React.FC = () => {
  const { skillProgress } = useProgress();

  const calculateStats = () => {
    const skills = Object.values(skillProgress);
    const totalSkills = skills.length;
    const masteredSkills = skills.filter((skill) => skill.level >= 90).length;
    const expertSkills = skills.filter(
      (skill) => skill.level >= 70 && skill.level < 90
    ).length;
    const inProgressSkills = skills.filter(
      (skill) => skill.level > 0 && skill.level < 70
    ).length;
    const averageProgress =
      totalSkills > 0
        ? skills.reduce((sum, skill) => sum + skill.level, 0) / totalSkills
        : 0;

    return {
      totalSkills,
      masteredSkills,
      expertSkills,
      inProgressSkills,
      averageProgress: Math.round(averageProgress),
    };
  };

  const stats = calculateStats();

  const statItems = [
    {
      icon: Trophy,
      label: "Mastered",
      value: stats.masteredSkills,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/20",
    },
    {
      icon: Award,
      label: "Expert",
      value: stats.expertSkills,
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
    {
      icon: BookOpen,
      label: "In Progress",
      value: stats.inProgressSkills,
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: Target,
      label: "Average",
      value: `${stats.averageProgress}%`,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/20",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      className="absolute top-4 right-4 z-10"
    >
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[280px]">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-bold">Progress</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                className={`${item.bgColor} rounded-lg p-3 border border-white/10`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-white text-xs font-medium">
                    {item.label}
                  </span>
                </div>
                <div className={`text-lg font-bold ${item.color}`}>
                  {item.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">
              Overall Progress
            </span>
            <span className="text-emerald-400 text-sm font-bold">
              {stats.averageProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${stats.averageProgress}%` }}
              transition={{ duration: 1.5, delay: 1.5 }}
            />
          </div>
        </div>

        {/* Achievement level indicator */}
        <div className="mt-3 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full ${
              stats.averageProgress >= 80
                ? "bg-yellow-400/20 text-yellow-400"
                : stats.averageProgress >= 60
                ? "bg-purple-400/20 text-purple-400"
                : stats.averageProgress >= 40
                ? "bg-blue-400/20 text-blue-400"
                : "bg-gray-400/20 text-gray-400"
            }`}
          >
            {stats.averageProgress >= 80 ? (
              <Trophy className="w-4 h-4" />
            ) : stats.averageProgress >= 60 ? (
              <Award className="w-4 h-4" />
            ) : stats.averageProgress >= 40 ? (
              <Target className="w-4 h-4" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">
              {stats.averageProgress >= 80
                ? "PASS Master"
                : stats.averageProgress >= 60
                ? "Medical Expert"
                : stats.averageProgress >= 40
                ? "Advanced Student"
                : "Beginner Student"}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
