"""
Academic Program Loader and Mapping
Handles French medical education program structure from program.json
"""

import json
from typing import List, Dict, Optional
from difflib import SequenceMatcher

from api.models.lesson_models import ProgramMapping

class AcademicProgramLoader:
    """
    Loads and maps the academic program structure from program.json
    Provides topic-to-category-subcategory mapping functionality
    """
    
    def __init__(self, program_file: str = "ressources/program.json"):
        """Initialize with program structure"""
        self.program_data = self._load_program_structure(program_file)
        self.topic_mappings = self._create_topic_mappings()
        
    def _load_program_structure(self, program_file: str) -> List[Dict]:
        """Load the academic program structure from JSON"""
        try:
            with open(program_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"⚠️ Program file {program_file} not found, using default structure")
            return []
        except json.JSONDecodeError as e:
            print(f"⚠️ Error parsing program file: {e}")
            return []
    
    def _create_topic_mappings(self) -> List[ProgramMapping]:
        """Create a comprehensive mapping of all topics to their categories/subcategories"""
        mappings = []
        
        for ue in self.program_data:
            semester = ue.get("semester", 1)
            category = ue.get("category", "Unknown")
            
            for subcategory_data in ue.get("subcategories", []):
                subcategory = subcategory_data.get("name", "Unknown")
                
                for topic in subcategory_data.get("topics", []):
                    mappings.append(ProgramMapping(
                        topic=topic,
                        category=category,
                        subcategory=subcategory,
                        semester=semester
                    ))
        
        print(f"📚 Loaded {len(mappings)} topics from academic program")
        return mappings
    
    def find_topic_mapping(self, search_topic: str, threshold: float = 0.6) -> Optional[ProgramMapping]:
        """
        Find the best matching topic in the academic program
        Uses fuzzy string matching to handle variations in topic names
        """
        if not self.topic_mappings:
            return None
            
        best_match = None
        best_score = 0.0
        
        # Normalize search topic
        search_lower = search_topic.lower().strip()
        
        for mapping in self.topic_mappings:
            # Calculate similarity score
            topic_lower = mapping.topic.lower().strip()
            
            # Exact match gets highest score
            if search_lower == topic_lower:
                mapping.similarity_score = 1.0
                return mapping
            
            # Fuzzy matching
            similarity = SequenceMatcher(None, search_lower, topic_lower).ratio()
            
            # Also check if search term is contained in topic or vice versa
            if search_lower in topic_lower or topic_lower in search_lower:
                similarity = max(similarity, 0.8)
            
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = mapping
                best_match.similarity_score = similarity
        
        if best_match:
            print(f"📍 Topic '{search_topic}' mapped to '{best_match.topic}' (similarity: {best_match.similarity_score:.2f})")
        else:
            print(f"⚠️ No suitable mapping found for topic '{search_topic}'")
            
        return best_match
    
    def get_related_topics(self, category: str, subcategory: str, limit: int = 5) -> List[str]:
        """Get related topics from the same subcategory"""
        related = []
        for mapping in self.topic_mappings:
            if (mapping.category == category and 
                mapping.subcategory == subcategory and 
                len(related) < limit):
                related.append(mapping.topic)
        return related
    
    def get_all_categories(self) -> List[str]:
        """Get all available categories"""
        return list(set(mapping.category for mapping in self.topic_mappings))
    
    def get_subcategories(self, category: str) -> List[str]:
        """Get all subcategories for a given category"""
        return list(set(
            mapping.subcategory 
            for mapping in self.topic_mappings 
            if mapping.category == category
        )) 