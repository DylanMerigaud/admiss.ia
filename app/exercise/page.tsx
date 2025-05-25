"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Target,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import lessonData from "../../ressources/data/Alkanes__Alkenes__plus3_Ketones__Acids_UE1_BCH_S1_lesson_20250524_224103.json";
import {
  LessonDataSchema,
  type Question,
  type Exercise,
  type LessonData,
} from "../../lib/schemas";

interface UserAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  startTime: number;
}

interface ExerciseResult {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  averageTime: number;
  accuracy: number;
  answers: UserAnswer[];
}

// Hardcoded progress hints since they're not in the new JSON structure
const progressHints = {
  timeImprovement: {
    fast: "Great speed! Focus on accuracy to maintain efficiency.",
    average:
      "Good timing. Practice more questions to build confidence and speed.",
    slow: "Take time to understand concepts. Consider reviewing the lesson material.",
  },
  accuracyImprovement: {
    high: "Excellent accuracy! You're mastering this topic well.",
    medium: "Good understanding. Review explanations for missed questions.",
    low: "Consider studying the lesson content more thoroughly before attempting exercises.",
  },
};

export default function ExercisePage() {
  const router = useRouter();
  const [validatedData, setValidatedData] = useState<LessonData | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );
  const [isExerciseComplete, setIsExerciseComplete] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Validate and load the lesson data
    try {
      const validated = LessonDataSchema.parse(lessonData);
      setValidatedData(validated);
      setCurrentExercise(validated.exercise);
      setQuestions(validated.questions);
      setIsLoading(false);
    } catch (error) {
      console.error("Validation error:", error);
      setValidationError("Failed to validate lesson data structure");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Start timer for current question
    setQuestionStartTime(Date.now());
    setElapsedTime(0);

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - questionStartTime);
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, questionStartTime]);

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer) return;

    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime;
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    const userAnswer: UserAnswer = {
      questionId: currentQuestion.question_id,
      selectedAnswer,
      isCorrect,
      timeSpent,
      startTime: questionStartTime,
    };

    const newAnswers = [...userAnswers, userAnswer];
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer("");
    } else {
      // Complete exercise
      completeExercise(newAnswers);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Restore previous answer if exists
      const previousAnswer = userAnswers[currentQuestionIndex - 1];
      if (previousAnswer) {
        setSelectedAnswer(previousAnswer.selectedAnswer);
      }
    }
  };

  const completeExercise = (answers: UserAnswer[]) => {
    const totalTime = answers.reduce(
      (sum, answer) => sum + answer.timeSpent,
      0
    );
    const correctCount = answers.filter((answer) => answer.isCorrect).length;

    const result: ExerciseResult = {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      totalTime,
      averageTime: totalTime / questions.length,
      accuracy: (correctCount / questions.length) * 100,
      answers,
    };

    setExerciseResult(result);
    setIsExerciseComplete(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor((milliseconds % 1000) / 100);
    return `${seconds}.${ms}s`;
  };

  const getTimeCategory = (time: number) => {
    const avgTime = 15000; // 15 seconds baseline
    if (time < avgTime * 0.7) return "fast";
    if (time > avgTime * 1.5) return "slow";
    return "average";
  };

  const getAccuracyCategory = (accuracy: number) => {
    if (accuracy >= 80) return "high";
    if (accuracy >= 60) return "medium";
    return "low";
  };

  const restartExercise = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer("");
    setUserAnswers([]);
    setIsExerciseComplete(false);
    setExerciseResult(null);
    setQuestionStartTime(Date.now());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl"
        >
          Loading exercise...
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
          <p>Error loading exercise data:</p>
          <p className="text-sm mt-2">{validationError}</p>
        </motion.div>
      </div>
    );
  }

  if (!currentExercise || !validatedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl"
        >
          No exercise data available
        </motion.div>
      </div>
    );
  }

  if (isExerciseComplete && exerciseResult) {
    const timeCategory = getTimeCategory(exerciseResult.averageTime);
    const accuracyCategory = getAccuracyCategory(exerciseResult.accuracy);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-md rounded-lg p-8 border border-slate-700"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center"
              >
                <div className="text-4xl">🏆</div>
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Exercise Complete!
              </h1>
              <p className="text-gray-300">
                {validatedData.lesson.topic} •{" "}
                {currentExercise.difficulty_level}
              </p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4 text-center"
              >
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {exerciseResult.correctAnswers}/
                  {exerciseResult.totalQuestions}
                </div>
                <div className="text-sm text-gray-300">Correct</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center"
              >
                <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {exerciseResult.accuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Accuracy</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center"
              >
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {formatTime(exerciseResult.totalTime)}
                </div>
                <div className="text-sm text-gray-300">Total Time</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4 text-center"
              >
                <Zap className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {formatTime(exerciseResult.averageTime)}
                </div>
                <div className="text-sm text-gray-300">Avg. Time</div>
              </motion.div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4 mb-8">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Question Results
              </h3>
              {exerciseResult.answers.map((answer, index) => {
                const question = questions.find(
                  (q) => q.question_id === answer.questionId
                );
                if (!question) return null;

                return (
                  <motion.div
                    key={answer.questionId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className={`bg-slate-700/50 rounded-lg p-4 border-l-4 ${
                      answer.isCorrect ? "border-emerald-400" : "border-red-400"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {answer.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-white font-medium">
                          Question {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4" />
                        {formatTime(answer.timeSpent)}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      {question.text}
                    </p>
                    {!answer.isCorrect && (
                      <div className="text-sm">
                        <p className="text-red-400">
                          Your answer:{" "}
                          {
                            question.options.find(
                              (o) => o.id === answer.selectedAnswer
                            )?.text
                          }
                        </p>
                        <p className="text-emerald-400">
                          Correct answer:{" "}
                          {
                            question.options.find(
                              (o) => o.id === question.correct_answer
                            )?.text
                          }
                        </p>
                        <p className="text-gray-400 mt-1">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress Hints */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" />
                Improvement Hints
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Timing</h4>
                    <p className="text-gray-300 text-sm">
                      {progressHints.timeImprovement[timeCategory]}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Accuracy</h4>
                    <p className="text-gray-300 text-sm">
                      {progressHints.accuracyImprovement[accuracyCategory]}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartExercise}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Exercise
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-md rounded-lg p-6 mb-6 border border-slate-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {validatedData.lesson.topic}
              </h1>
              <p className="text-gray-300">
                Question {currentQuestionIndex + 1} of {questions.length} •{" "}
                {currentExercise.difficulty_level}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${
                  ((currentQuestionIndex + 1) / questions.length) * 100
                }%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Question Card */}
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-800/50 backdrop-blur-md rounded-lg p-8 border border-slate-700"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <span>{currentQuestion.category}</span>
                <span>•</span>
                <span>{currentQuestion.subcategory}</span>
                <span>•</span>
                <span className="capitalize">{currentQuestion.difficulty}</span>
              </div>
              <h2 className="text-xl text-white font-medium leading-relaxed">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => handleAnswerSelect(option.id)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                    selectedAnswer === option.id
                      ? "border-blue-500 bg-blue-500/20 text-white"
                      : "border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedAnswer === option.id
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-500"
                      }`}
                    >
                      {selectedAnswer === option.id && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="font-medium">
                      {option.id.toUpperCase()}.
                    </span>
                    <span>{option.text}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  currentQuestionIndex === 0
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-slate-600 hover:bg-slate-700 text-white"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextQuestion}
                disabled={!selectedAnswer}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  !selectedAnswer
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {currentQuestionIndex === questions.length - 1
                  ? "Complete"
                  : "Next"}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
