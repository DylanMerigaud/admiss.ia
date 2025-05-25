import { z } from "zod";

// Generation metadata schema
export const GenerationMetadataSchema = z.object({
  generated_at: z.string(),
  topic: z.string(),
  category: z.string(),
  subcategory: z.string(),
  generator: z.string(),
  academic_program: z.string(),
});

// Learning objectives schema
export const LearningObjectivesSchema = z.array(z.string());

// Lesson schema
export const LessonSchema = z.object({
  lesson_id: z.string(),
  topic: z.string(),
  category: z.string(),
  subcategory: z.string(),
  lesson_content: z.string(),
  learning_objectives: LearningObjectivesSchema,
  exercise_id: z.string(),
  difficulty_level: z.string(),
  semester: z.number(),
  generated_by: z.string(),
  created_at: z.string(),
});

// Exercise schema
export const ExerciseSchema = z.object({
  exercise_id: z.string(),
  lesson_id: z.string(),
  topic: z.string(),
  question_ids: z.array(z.string()),
  difficulty_level: z.string(),
  target_concepts: z.array(z.string()),
  created_at: z.string(),
});

// Question option schema
export const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

// Question schema
export const QuestionSchema = z.object({
  question_id: z.string(),
  text: z.string(),
  category: z.string(),
  subcategory: z.string(),
  topic: z.string(),
  difficulty: z.string(),
  options: z.array(QuestionOptionSchema),
  correct_answer: z.string(),
  explanation: z.string(),
});

// Main lesson data schema
export const LessonDataSchema = z.object({
  generation_metadata: GenerationMetadataSchema,
  lesson: LessonSchema,
  exercise: ExerciseSchema,
  questions: z.array(QuestionSchema),
});

// Type exports
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type LessonData = z.infer<typeof LessonDataSchema>;
