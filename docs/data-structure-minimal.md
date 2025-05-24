# 🏗️ AI QCM Data Structure

## 🎯 **MVP Concept**

This minimal data structure enables **AI-powered adaptive learning** with just **4 entities and ~30 fields**. The design focuses on capturing the essential data needed for:

- **Personalization** → Track user's weak concepts
- **Adaptation** → Generate targeted exercises 
- **Learning Loop** → Continuous improvement based on performance

**Goal:** Prove the AI learning pipeline works with minimal complexity before adding advanced features.

---

## 📊 **Core Entities**

### 1. **User**
```json
{
  "user_id": "user_123",
  "current_level": "intermediate",
  "concept_mastery": { "concept_id": 0.75 },
  "weak_concepts": ["concept_id"],
  "learning_velocity": 0.8
}
```

### 2. **Question**
```json
{
  "question_id": "q1",
  "text": "Question text here?",
  "concept": "tooth_anatomy",
  "difficulty": "basic",
  "options": [{"id": "a", "text": "Option A"}],
  "correct_answer": "a",
  "explanation": "Why A is correct..."
}
```

### 3. **Exercise**
```json
{
  "exercise_id": "ex_001",
  "target_concepts": ["tooth_anatomy", "oral_anatomy"],
  "difficulty_level": "intermediate",
  "question_ids": ["q1", "q2", "q3", "q4", "q5"]
}
```

### 4. **Session** 
```json
{
  "session_id": "s_456",
  "user_id": "user_123",
  "exercise_id": "ex_001",
  "timestamp": "2024-01-15T10:30:00Z",
  "answers": [
    {
      "question_id": "q1",
      "selected": "a",
      "is_correct": true,
      "time_ms": 15000,
      "concept": "tooth_anatomy"
    }
  ],
  "concept_scores": { "tooth_anatomy": 0.8 },
  "total_score": 0.8
}
```

## 🔗 **Relationships**

```
User (1) ←→ (N) Session
Session (N) → (1) Exercise  
Exercise (1) → (N) Question
Session.answers (N) → (1) Question
```

## ⚡ **Core Flow**

1. **Build Exercise** → Select questions by `concept` + `difficulty`
2. **User Completes** → Store `Session` with answers
3. **Update User** → Recalculate `concept_mastery` from sessions
4. **Loop** → Generate next exercise for updated weak concepts

## 🎯 **Key Operations**

```sql
-- Get user's weak areas
SELECT concept FROM user.concept_mastery WHERE score < 0.7

-- Find questions for exercise
SELECT * FROM questions 
WHERE concept IN (weak_concepts) AND difficulty = user.current_level

-- Calculate concept performance
SELECT concept, AVG(is_correct) FROM session.answers 
WHERE user_id = ? GROUP BY concept

-- Update user mastery
UPDATE user.concept_mastery SET score = calculated_average
```

## 📋 **Minimal Requirements**

- **~30 fields** across 4 entities
- **Flat structure** - no complex nesting
- **Pre-calculated values** - `is_correct`, `concept_scores`
- **Normalized data** - questions reusable across exercises

This enables **adaptive learning** with **minimal complexity**! 🚀 