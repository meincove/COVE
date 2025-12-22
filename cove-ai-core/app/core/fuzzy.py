"""
Config-driven fuzzy string matching for typo tolerance.
NO hardcoded typo corrections - all rules from fuzzy_matching_config.json
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Set
from functools import lru_cache

# Use RapidFuzz for performance (industry standard for fuzzy matching)
try:
    from rapidfuzz import fuzz, process
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    # Fallback to difflib if RapidFuzz not available
    import difflib
    RAPIDFUZZ_AVAILABLE = False


@lru_cache(maxsize=1)
def get_fuzzy_config() -> dict:
    """Load fuzzy matching config once and cache it"""
    config_path = Path(__file__).resolve().parent.parent.parent / "data" / "fuzzy_matching_config.json"
    with open(config_path) as f:
        return json.load(f)


def find_closest_match(word: str, candidates: List[str], threshold: int) -> Optional[str]:
    """
    Find closest match using edit distance (config-driven threshold).
    
    Args:
        word: Input word to match
        candidates: List of candidate words
        threshold: Maximum edit distance (from config!)
        
    Returns:
        Closest match if within threshold, else None
    """
    if not RAPIDFUZZ_AVAILABLE:
        # Fallback to difflib
        close_matches = difflib.get_close_matches(word, candidates, n=1, cutoff=0.6)
        return close_matches[0] if close_matches else None
    
    # Use RapidFuzz for performance
    result = process.extractOne(
        word,
        candidates,
        scorer=fuzz.ratio,
        score_cutoff=60  # Minimum similarity score
    )
    
    if result and result[1] >= 60:  # Score threshold
        return result[0]
    return None


def apply_common_corrections(word: str, config: dict, catalog_types: set = None) -> str:
    """
    Apply common typo corrections from config (not hardcoded!).
    NOW VOCABULARY-AWARE: Only corrects to words that exist in catalog.
    
    Args:
        word: Input word
        config: Fuzzy matching config
        catalog_types: Set of known product types from database (optional)
        
    Returns:
        Corrected word if match found AND result is in catalog, else original
    """
    common_corrections = config.get('common_corrections', {})
    word_lower = word.lower()
    
    # Check if word is a known typo for any correct term
    for correct_term, typos in common_corrections.items():
        if word_lower in [t.lower() for t in typos]:
            # Only return correction if it's in the catalog OR no catalog provided
            if catalog_types is None or correct_term.lower() in catalog_types:
                return correct_term
    
    # Check fuzzy match against correct terms
    threshold = config['typo_tolerance']['edit_distance_threshold']
    correct_terms = list(common_corrections.keys())
    
    # VOCABULARY FILTER: Only match to terms that exist in catalog
    if catalog_types is not None:
        correct_terms = [t for t in correct_terms if t.lower() in catalog_types]
    
    # Only apply if word is long enough (from config)
    min_length = config['typo_tolerance'].get('min_word_length', 4)
    if len(word) >= min_length and correct_terms:  # Must have valid targets
        match = find_closest_match(word_lower, correct_terms, threshold)
        if match:
            return match
    
    return word


def preprocess_query(query: str, config: dict) -> str:
    """
    Preprocess query based on config settings.
    
    Args:
        query: Input query
        config: Fuzzy matching config
        
    Returns:
        Preprocessed query
    """
    preprocessing = config.get('preprocessing', {})
    
    if preprocessing.get('lowercase', True):
        query = query.lower()
    
    if preprocessing.get('remove_extra_whitespace', True):
        query = ' '.join(query.split())
    
    return query


def apply_fuzzy_matching(query: str, catalog_types: set = None) -> str:
    """
    Apply config-driven fuzzy matching to query.
    NOW VOCABULARY-AWARE: Only corrections to words that exist in catalog!
    
    Args:
        query: User's search query
        catalog_types: Set of known product types from database (optional)
        
    Returns:
        Query with typo corrections applied (only to known catalog terms)
    """
    config = get_fuzzy_config()
    
    # Check if fuzzy matching is enabled (config-driven!)
    if not config['typo_tolerance'].get('enabled', True):
        return query
    
    # Preprocess based on config
    query = preprocess_query(query, config)
    
    # Apply brand pattern parsing (config-driven!)
    query = parse_brand_patterns(query, config)
    
    # Apply corrections word by word
    words = query.split()
    corrected_words = []
    
    for word in words:
        # Try brand corrections first, then product type corrections
        corrected = apply_brand_corrections(word, config)
        if corrected == word:  # No brand match, try product types
            corrected = apply_common_corrections(word, config, catalog_types)
        corrected_words.append(corrected)
    
    return ' '.join(corrected_words)


def parse_brand_patterns(query: str, config: dict) -> str:
    """
    Parse brand patterns like 'COVEhoodie' into 'COVE hoodie' using config rules.
    NO hardcoded patterns!
    
    Args:
        query: Input query
        config: Fuzzy matching config
        
    Returns:
        Query with brand/product separated
    """
    rules = config.get('brand_pattern_rules', {})
    
    if not rules.get('remove_spaces_between_brand_product', False):
        return query
    
    # Get known brands from config (NOT hardcoded!)
    brand_corrections = config.get('brand_corrections', {})
    known_brands = list(brand_corrections.keys())
    
    # Check if query starts with a known brand (case-insensitive if configured)
    query_lower = query.lower() if rules.get('case_insensitive', True) else query
    
    for brand in known_brands:
        brand_check = brand.lower() if rules.get('case_insensitive', True) else brand
        
        # Check if query starts with brand name
        if query_lower.startswith(brand_check):
            # Split at brand boundary
            rest = query[len(brand):]
            if rest and not rest[0].isspace():
                # Pattern like "COVEhoodie" found!
                return f"{brand} {rest}"
    
    return query


def apply_brand_corrections(word: str, config: dict) -> str:
    """
    Apply brand-specific typo corrections from config (NOT hardcoded!).
    
    Args:
        word: Input word
        config: Fuzzy matching config
        
    Returns:
        Corrected brand name if match found, else original
    """
    brand_corrections = config.get('brand_corrections', {})
    word_lower = word.lower()
    
    # Check if word is a known typo for any brand
    for correct_brand, typos in brand_corrections.items():
        if word_lower in [t.lower() for t in typos]:
            return correct_brand
    
    # Check fuzzy match against brand names
    threshold = config['typo_tolerance']['edit_distance_threshold']
    correct_brands = list(brand_corrections.keys())
    
    # Only apply if word is long enough (from config)
    min_length = config['typo_tolerance'].get('min_word_length', 4)
    if len(word) >= min_length:
        match = find_closest_match(word_lower, [b.lower() for b in correct_brands], threshold)
        if match:
            # Return original casing from config
            for brand in correct_brands:
                if brand.lower() == match:
                    return brand
    
    return word
