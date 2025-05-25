"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Target,
  Clock,
  ArrowRight,
  ArrowLeft,
  Play,
  CheckCircle,
  Star,
  Trophy,
  Zap,
  ScrollText,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Markdown } from "../../components/markdown";

import lessonData from "../../ressources/data/Alkanes__Alkenes__plus3_Ketones__Acids_UE1_BCH_S1_lesson_20250524_224103.json";
import { LessonDataSchema, type LessonData } from "../../lib/schemas";

export default function LessonPage() {
  const router = useRouter();
  const [validatedData, setValidatedData] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Validate and load the lesson data
    try {
      const validated = LessonDataSchema.parse(lessonData);
      setValidatedData(validated);
      setIsLoading(false);
    } catch (error) {
      console.error("Validation error:", error);
      setValidationError("Failed to validate lesson data structure");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reading progress tracking
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = element.offsetHeight;

      // Calculate how much of the content is visible
      const visibleTop = Math.max(0, -rect.top);
      const visibleBottom = Math.min(elementHeight, windowHeight - rect.top);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      const progress = Math.min(
        100,
        (visibleTop / (elementHeight - windowHeight)) * 100
      );
      setReadingProgress(Math.max(0, progress));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, [validatedData]);

  const getMasteryIcon = (level: string) => {
    switch (level) {
      case "advanced":
        return { icon: Trophy, color: "text-yellow-400" };
      case "intermediate":
        return { icon: Star, color: "text-purple-400" };
      case "beginner":
        return { icon: Zap, color: "text-blue-400" };
      default:
        return { icon: BookOpen, color: "text-gray-400" };
    }
  };

  const handleStartExercise = () => {
    router.push("/exercise");
  };

  const handleBackToDashboard = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl"
        >
          Loading lesson...
        </motion.div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-xl text-center"
        >
          <p>Error loading lesson data:</p>
          <p className="text-sm mt-2">{validationError}</p>
        </motion.div>
      </div>
    );
  }

  if (!validatedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl"
        >
          No lesson data available
        </motion.div>
      </div>
    );
  }

  const { lesson, exercise } = validatedData;
  const masteryInfo = getMasteryIcon(lesson.difficulty_level);
  const MasteryIcon = masteryInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Reading Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-1 bg-slate-800/50 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          style={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-md rounded-lg p-6 mb-6 border border-slate-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-full bg-slate-700/50 ${masteryInfo.color}`}
              >
                <MasteryIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {lesson.topic}
                </h1>
                <div className="flex items-center gap-2 text-gray-300 mt-1">
                  <span>{lesson.category}</span>
                  <span>•</span>
                  <span>{lesson.subcategory}</span>
                  <span>•</span>
                  <span className="capitalize">{lesson.difficulty_level}</span>
                  <span>•</span>
                  <span>Semester {lesson.semester}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Reading Progress Circle */}
              <div className="relative w-12 h-12">
                <svg
                  className="w-12 h-12 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-slate-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-purple-400"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${readingProgress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </motion.button>
            </div>
          </div>

          {/* Learning Objectives */}
          {lesson.learning_objectives &&
            lesson.learning_objectives.length > 0 && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  Learning Objectives
                </h3>
                <ul className="space-y-2">
                  {lesson.learning_objectives.map((objective, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-gray-300"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </motion.div>

        {/* Lesson Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-md rounded-lg border border-slate-700 overflow-hidden mb-6"
        >
          {/* Content Header */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Lesson Content
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Comprehensive study material for {lesson.topic}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  ~{Math.ceil(lesson.lesson_content.length / 1000)} min read
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Content Area */}
          <div className="p-8" ref={contentRef}>
            <div className="max-w-none">
              {/* Custom styled markdown content */}
              <div className="lesson-content text-gray-200 leading-relaxed space-y-6">
                <Markdown>{lesson.lesson_content}</Markdown>
              </div>
            </div>

            {/* Content Footer with Key Takeaways */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              {/* Functional Groups Overview Image */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-6">
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    Functional Groups Overview
                  </h4>
                  <div className="flex justify-center bg-white/5 rounded-lg">
                    <img
                      src="/functional-groups-overview.gif"
                      alt="Functional Groups Overview - Visual guide showing the main functional groups including alkanes, alkenes, alcohols, amines, aldehydes, ketones, and acids with their chemical structures"
                      className="max-w-full h-auto rounded-lg shadow-xl border border-slate-600/30 transition-transform duration-300 "
                      style={{ maxHeight: "600px" }}
                      loading="lazy"
                    />
                  </div>
                  <p className="text-gray-400 text-sm mt-4 text-center leading-relaxed">
                    📚 <strong>Visual Reference Guide:</strong> This
                    comprehensive diagram shows the main functional groups
                    covered in this lesson, including their chemical structures
                    and naming conventions. Each functional group has distinct
                    properties that determine molecular behavior and reactivity.
                  </p>
                  <div className="mt-3 text-center">
                    <a
                      href="https://www.masterorganicchemistry.com/2010/10/06/functional-groups-organic-chemistry/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-200 underline decoration-dotted underline-offset-2"
                    >
                      <ScrollText className="w-3 h-3" />
                      Source: Master Organic Chemistry
                    </a>
                  </div>
                </div>
              </div>

              {/* Lesson Source Attribution */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/20 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">
                      📖 <strong>Lesson Content Sources:</strong>
                    </p>
                    <a
                      href="https://www.masterorganicchemistry.com/2010/10/06/functional-groups-organic-chemistry/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-200 transition-colors duration-200 underline decoration-dotted underline-offset-2"
                    >
                      <ScrollText className="w-4 h-4" />
                      Master Organic Chemistry - Functional Groups Guide
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Exercise Information */}
        {exercise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 backdrop-blur-md rounded-lg p-6 mb-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-400" />
                  Practice Exercise
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  Test your understanding with{" "}
                  {exercise.question_ids?.length || 0} questions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {exercise.question_ids?.length || 0}
                  </div>
                  <div className="text-xs text-gray-400">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 capitalize">
                    {exercise.difficulty_level}
                  </div>
                  <div className="text-xs text-gray-400">Difficulty</div>
                </div>
              </div>
            </div>

            {/* Target Concepts */}
            {exercise.target_concepts &&
              exercise.target_concepts.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">
                    Target Concepts:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {exercise.target_concepts.map((concept, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartExercise}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Play className="w-5 h-5" />
              Start Exercise
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
