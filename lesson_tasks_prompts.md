**🧠 Lesson JSON Template**
```json
{
  "lesson_id": "",
  "title": "",
  "target_concepts": ["tooth_anatomy"],
  "difficulty_level": "beginner|intermediate|advanced",
  "learning_objectives": [
    "Identify parts of a tooth",
    "Differentiate between enamel and dentin"
  ],
  "sections": [
    {
      "type": "theory",
      "title": "Tooth Structure Basics",
      "content": "A tooth consists of enamel, dentin, pulp, and root. Enamel is the outermost layer...",
      "images": ["https://example.com/tooth_diagram.png"]
    }
  ],
  "estimated_time_min": 12
}
```

**🧠 System Prompt**

```txt
You are an expert AI learning assistant. Your task is to create adaptive, personalized lessons for users based on their current knowledge level, weak concepts, and learning preferences.

You will be provided:

- The user profile (level, weak concepts, learning speed)
- Topic(s) of interest
- Retrieved context from a vector database (text + optional images)

Your response must be a valid JSON lesson matching the lesson template structure:

{{json_template}}

Follow these guidelines:

- The lesson must target the user’s weak concepts.
- Use the user’s `current_level` to adapt tone and depth.
- Include explanations, interactive questions, and optionally images.
- Keep the structure flat and consistent with the template.
- Only output valid JSON.

```

**💬 User Prompt Template**

```txt
Create a JSON lesson for the following topic: {{topic}}.

The user has the following profile:
{{profile}}

Here is the retrieved content (text and optional image links):
{{retrieved_text_snippets}}

```
