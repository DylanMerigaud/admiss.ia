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
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Markdown } from "../../components/markdown";

// API Types (same structure as your API response)
interface LessonData {
  generation_metadata: {
    generated_at: string;
    topic: string;
    category: string;
    subcategory: string;
    generator: string;
    academic_program: string;
    precision_mode?: boolean;
  };
  lesson: {
    lesson_id: string;
    topic: string;
    category: string;
    subcategory: string;
    lesson_content: string;
    learning_objectives: string[];
    exercise_id: string;
    difficulty_level: string;
    semester: number;
    generated_by: string;
    created_at: string;
  };
  exercise: {
    exercise_id: string;
    lesson_id: string;
    topic: string;
    question_ids: string[];
    difficulty_level: string;
    target_concepts: string[];
    created_at: string;
  };
  questions: Array<{
    question_id: string;
    text: string;
    category: string;
    subcategory: string;
    topic: string;
    difficulty: string;
    options: Array<{ id: string; text: string }>;
    correct_answer: string;
    explanation: string;
  }>;
}

export default function LiveLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const topic = searchParams.get('topic') || 'Cardiovascular System';
  const category = searchParams.get('category') || 'UE 5 - Anatomy';
  const subcategory = searchParams.get('subcategory') || 'Systems and Apparatus';
  
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch lesson data from API
    const fetchLesson = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const apiUrl = `/api/lessons/generate?topic=${encodeURIComponent(topic)}&category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`;
        
        console.log('🔄 Fetching lesson from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch lesson: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Received lesson data:', data);
        
        setLessonData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error fetching lesson:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [topic, category, subcategory]);

  useEffect(() => {
    // Reading progress tracking
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = element.offsetHeight;

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
  }, [lessonData]);

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
    // Navigate to live exercise with the same parameters
    router.push(`/live-exercise?topic=${encodeURIComponent(topic)}&category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`);
  };

  const handleBackToDashboard = () => {
    router.push("/");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
          <div className="text-xl mb-2">Generating Lesson...</div>
          <div className="text-sm text-gray-400">
            Topic: {topic}
            <br />
            Category: {category}
            <br />
            Subcategory: {subcategory}
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-center max-w-md"
        >
          <h2 className="text-xl mb-4">Error Loading Lesson</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!lessonData) {
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

  const { lesson, exercise } = lessonData;
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
                  {lessonData.generation_metadata.precision_mode && (
                    <>
                      <span>•</span>
                      <span className="text-green-400 text-sm">🎯 LIVE</span>
                    </>
                  )}
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
          {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
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
                    AI-generated content for {lesson.topic}
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
            {exercise.target_concepts && exercise.target_concepts.length > 0 && (
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
              Start Live Exercise
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}