#!/usr/bin/env python3
"""
Batch Lesson Generation for Academic Program
Generates lessons for all topics in program.json and stores them locally as JSON files

This script creates a complete collection of generated lessons for the entire academic program,
stored in the ressources/data/ directory.
"""

import sys
import os
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Add parent directory to path so we can import api module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from api.utils.lesson_service import create_adaptive_lesson, UserContext, AcademicProgramLoader

class LessonCollectionGenerator:
    """
    Batch generator for creating a complete collection of lessons
    from the academic program structure
    """
    
    def __init__(self, output_dir: str = "ressources/data", program_file: str = "ressources/program.json"):
        """Initialize the batch generator"""
        self.output_dir = output_dir
        self.program_file = program_file
        self.program_loader = AcademicProgramLoader(program_file)
        self.generated_count = 0
        self.failed_count = 0
        self.failed_topics = []
        
        # Create output directory
        self._setup_output_directory()
        
        # Default user context for generation
        self.default_user_context = UserContext(
            user_id="batch_generator",
            current_level="intermediate",
            weak_concepts=["general concepts"],
            learning_velocity=0.8,
            learning_style="mixed"
        )
    
    def _setup_output_directory(self):
        """Create the output directory"""
        os.makedirs(self.output_dir, exist_ok=True)
        print(f"📁 Created output directory: {self.output_dir}")
    
    def _get_file_path(self, topic: str, category: str, subcategory: str) -> str:
        """Generate the file path for a lesson"""
        
        # Create category abbreviation (e.g., "UE_1_Biochemistry" -> "UE1")
        category_abbrev = self._create_category_abbreviation(category)
        
        # Clean and shorten topic name
        topic_clean = self._clean_and_shorten_topic(topic)
        
        # Create meaningful filename with better structure
        # Format: [Topic]_[CategoryAbbrev]_[Semester]_lesson_[timestamp].json
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Get semester from category mapping
        semester = self._get_semester_for_category(category)
        
        filename = f"{topic_clean}_{category_abbrev}_S{semester}_lesson_{timestamp}.json"
        
        # Full path in flat structure
        file_path = os.path.join(self.output_dir, filename)
        return file_path
    
    def _create_category_abbreviation(self, category: str) -> str:
        """Create a short abbreviation for the category"""
        
        # Extract UE number and main subject
        if "UE" in category:
            # Extract "UE X - Subject" -> "UEX_Subject"
            parts = category.split(" - ", 1)
            if len(parts) == 2:
                ue_part = parts[0].replace(" ", "")  # "UE 1" -> "UE1"
                subject_part = parts[1]
                
                # Shorten common subjects
                subject_abbrev = {
                    "Biochemistry": "BCH",
                    "Cell Biology": "CELL",
                    "Biophysics": "PHYS", 
                    "Mathematics and Statistics": "MATH",
                    "Anatomy": "ANAT",
                    "Introduction to Drug Knowledge": "DRUG",
                    "Human and Social Sciences": "HSS",
                    "Specific Subject": "SPEC"
                }.get(subject_part, subject_part[:4].upper())
                
                return f"{ue_part}_{subject_abbrev}"
        
        # Fallback for unknown format
        return category.replace(" ", "_")[:8].upper()
    
    def _clean_and_shorten_topic(self, topic: str) -> str:
        """Clean and intelligently shorten topic names"""
        
        # Remove common words and clean
        topic_clean = topic.replace(",", "_").replace("'", "").replace("-", "_")
        topic_clean = topic_clean.replace(" and ", "_").replace(" & ", "_")
        topic_clean = topic_clean.replace("  ", " ").strip()
        
        # Split into words and process
        words = topic_clean.split()
        
        # If short enough, just clean and return
        if len(" ".join(words)) <= 30:
            return "_".join(words).replace(" ", "_")
        
        # For long topics, create intelligent abbreviation
        if len(words) > 4:
            # Keep first 2 and last 2 words, abbreviate middle
            if len(words) <= 6:
                # For 5-6 words, keep most important ones
                important_words = [w for w in words if len(w) > 3][:4]
                return "_".join(important_words).replace(" ", "_")
            else:
                # For very long topics, use first 2 + last 2 + count
                first_part = "_".join(words[:2])
                last_part = "_".join(words[-2:])
                middle_count = len(words) - 4
                return f"{first_part}_plus{middle_count}_{last_part}".replace(" ", "_")
        
        return "_".join(words).replace(" ", "_")
    
    def _get_semester_for_category(self, category: str) -> int:
        """Get semester number for a category"""
        
        # Look up semester from program data
        for ue in self.program_loader.program_data:
            if ue.get("category") == category:
                return ue.get("semester", 1)
        
        return 1  # Default to semester 1
    
    def _save_lesson(self, lesson_response, topic: str, category: str, subcategory: str) -> str:
        """Save a lesson response to JSON file"""
        
        file_path = self._get_file_path(topic, category, subcategory)
        
        # Prepare data for saving
        lesson_data = {
            "generation_metadata": {
                "generated_at": datetime.now().isoformat(),
                "topic": topic,
                "category": category,
                "subcategory": subcategory,
                "generator": "batch_lesson_collection",
                "academic_program": "French Medical Education"
            },
            "lesson": lesson_response.lesson.model_dump(),
            "exercise": lesson_response.exercise.model_dump(),
            "questions": [q.model_dump() for q in lesson_response.questions]
        }
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(lesson_data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Saved: {os.path.relpath(file_path)}")
            return file_path
            
        except Exception as e:
            print(f"❌ Error saving {file_path}: {e}")
            return None
    
    async def generate_lesson_for_topic(self, topic: str, category: str, subcategory: str, 
                                       user_context: Optional[UserContext] = None) -> bool:
        """Generate a single lesson for a topic"""
        
        if user_context is None:
            user_context = self.default_user_context
        
        try:
            print(f"🔄 Generating lesson: {category} > {subcategory} > {topic}")
            
            # Generate the lesson
            lesson_response = await create_adaptive_lesson(topic, user_context)
            
            # Save to file
            file_path = self._save_lesson(lesson_response, topic, category, subcategory)
            
            if file_path:
                self.generated_count += 1
                print(f"✅ Generated lesson {self.generated_count}: {topic}")
                return True
            else:
                self.failed_count += 1
                self.failed_topics.append(f"{category} > {subcategory} > {topic}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to generate lesson for '{topic}': {e}")
            self.failed_count += 1
            self.failed_topics.append(f"{category} > {subcategory} > {topic} (Error: {str(e)})")
            return False
    
    def get_all_topics(self) -> List[Dict[str, str]]:
        """Extract all topics from the program structure"""
        
        all_topics = []
        
        for ue in self.program_loader.program_data:
            semester = ue.get("semester", 1)
            category = ue.get("category", "Unknown")
            
            for subcategory_data in ue.get("subcategories", []):
                subcategory = subcategory_data.get("name", "Unknown")
                
                for topic in subcategory_data.get("topics", []):
                    all_topics.append({
                        "topic": topic,
                        "category": category,
                        "subcategory": subcategory,
                        "semester": semester
                    })
        
        return all_topics
    
    async def generate_all_lessons(self, filter_category: Optional[str] = None, 
                                 filter_semester: Optional[int] = None,
                                 max_topics: Optional[int] = None) -> Dict[str, int]:
        """Generate lessons for all topics in the program"""
        
        print("🏭 Starting Batch Lesson Generation")
        print("=" * 60)
        
        # Get all topics
        all_topics = self.get_all_topics()
        
        # Apply filters
        if filter_category:
            all_topics = [t for t in all_topics if filter_category.lower() in t["category"].lower()]
            print(f"🔍 Filtered by category containing '{filter_category}': {len(all_topics)} topics")
        
        if filter_semester:
            all_topics = [t for t in all_topics if t["semester"] == filter_semester]
            print(f"🔍 Filtered by semester {filter_semester}: {len(all_topics)} topics")
        
        if max_topics:
            all_topics = all_topics[:max_topics]
            print(f"🔍 Limited to first {max_topics} topics")
        
        print(f"\n📚 Total topics to process: {len(all_topics)}")
        print(f"📁 Output directory: {self.output_dir}")
        
        # Generate lessons
        for i, topic_info in enumerate(all_topics, 1):
            topic = topic_info["topic"]
            category = topic_info["category"]
            subcategory = topic_info["subcategory"]
            
            print(f"\n[{i}/{len(all_topics)}] Processing: {topic}")
            
            success = await self.generate_lesson_for_topic(topic, category, subcategory)
            
            # Add small delay to avoid overwhelming the API
            if i % 5 == 0:  # Every 5 lessons
                print("⏳ Brief pause to avoid API rate limits...")
                await asyncio.sleep(2)
        
        # Generate summary
        return self._generate_summary(all_topics)
    
    def _generate_summary(self, processed_topics: List[Dict]) -> Dict[str, int]:
        """Generate and save a summary of the batch generation"""
        
        summary = {
            "generation_summary": {
                "total_topics_processed": len(processed_topics),
                "successful_generations": self.generated_count,
                "failed_generations": self.failed_count,
                "success_rate": f"{(self.generated_count / len(processed_topics) * 100):.1f}%" if processed_topics else "0%",
                "generated_at": datetime.now().isoformat(),
                "output_directory": self.output_dir
            },
            "failed_topics": self.failed_topics,
            "categories_processed": {}
        }
        
        # Count by category
        for topic_info in processed_topics:
            category = topic_info["category"]
            if category not in summary["categories_processed"]:
                summary["categories_processed"][category] = 0
            summary["categories_processed"][category] += 1
        
        # Save summary
        summary_path = os.path.join(self.output_dir, f"generation_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        try:
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            print(f"\n📊 Summary saved: {summary_path}")
        except Exception as e:
            print(f"⚠️ Could not save summary: {e}")
        
        return summary
    
    def print_final_report(self, summary: Dict):
        """Print a final report of the batch generation"""
        
        print("\n" + "=" * 60)
        print("🎯 BATCH GENERATION COMPLETE")
        print("=" * 60)
        
        gen_summary = summary["generation_summary"]
        print(f"📊 Results:")
        print(f"   - Total Topics: {gen_summary['total_topics_processed']}")
        print(f"   - Successful: {gen_summary['successful_generations']} ✅")
        print(f"   - Failed: {gen_summary['failed_generations']} ❌")
        print(f"   - Success Rate: {gen_summary['success_rate']}")
        
        print(f"\n📁 Generated files location: {self.output_dir}")
        
        if summary["categories_processed"]:
            print(f"\n📚 Categories processed:")
            for category, count in summary["categories_processed"].items():
                print(f"   - {category}: {count} topics")
        
        if summary["failed_topics"]:
            print(f"\n⚠️ Failed topics:")
            for failed in summary["failed_topics"][:5]:  # Show first 5
                print(f"   - {failed}")
            if len(summary["failed_topics"]) > 5:
                print(f"   ... and {len(summary['failed_topics']) - 5} more")
        
        print(f"\n🎉 Batch generation completed!")

async def main():
    """Main function for batch lesson generation"""
    
    # Load environment variables
    load_dotenv(".env.local")
    
    # Check environment variables
    required_vars = ['WEAVIATE_URL', 'WEAVIATE_API_KEY', 'MISTRAL_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in .env.local")
        return False
    
    print("✅ All environment variables present")
    
    # Create generator
    generator = LessonCollectionGenerator()
    
    # Example: Generate lessons for specific filters
    # You can modify these parameters as needed
    
    print("\n🎛️ Generation Options:")
    print("1. Generate ALL lessons (may take hours)")
    print("2. Generate UE 5 - Anatomy lessons only")
    print("3. Generate first 10 topics only (test)")
    print("4. Generate Semester 1 only")
    
    # For now, let's do a test run with first 10 topics
    choice = input("\nEnter choice (1-4) or press Enter for option 3: ").strip()
    
    if choice == "1":
        # Generate all lessons
        summary = await generator.generate_all_lessons()
    elif choice == "2":
        # Generate anatomy lessons only
        summary = await generator.generate_all_lessons(filter_category="Anatomy")
    elif choice == "4":
        # Generate semester 1 only
        summary = await generator.generate_all_lessons(filter_semester=1)
    else:
        # Default: test with first 10 topics
        summary = await generator.generate_all_lessons(max_topics=10)
    
    # Print final report
    generator.print_final_report(summary)
    
    return summary["generation_summary"]["failed_generations"] == 0

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 