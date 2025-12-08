"""
User Profile and Personalization Engine.
Config-driven personalization using implicit feedback and temporal decay.
Research-backed implementation (2024-2025 best practices).
"""

import json
import math
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging

log = logging.getLogger("cove.personalization")

# Load config
CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "data" / "personalization_config.json"

def load_config() -> Dict[str, Any]:
    """Load personalization configuration"""
    with open(CONFIG_PATH) as f:
        return json.load(f)

CONFIG = load_config()


@dataclass
class UserInteraction:
    """Single user interaction event (implicit feedback)"""
    product_id: str
    interaction_type: str  # 'view', 'cart_add', 'purchase', 'search'
    timestamp: datetime
    weight: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UserProfile:
    """User preference profile built from implicit feedback"""
    user_id: str
    interactions: List[UserInteraction] = field(default_factory=list)
    preferred_types: List[str] = field(default_factory=list)
    preferred_tiers: List[str] = field(default_factory=list)
    preference_vector: Optional[List[float]] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def is_cold_start(self, config: Dict[str, Any]) -> bool:
        """Check if user is in cold start phase"""
        days_old = (datetime.now() - self.created_at).days
        return days_old < config['cold_start']['new_user_threshold_days']
    
    def get_recent_interactions(self, days: int = 30) -> List[UserInteraction]:
        """Get interactions from last N days"""
        cutoff = datetime.now() - timedelta(days=days)
        return [i for i in self.interactions if i.timestamp >= cutoff]


class PersonalizationEngine:
    """
    Personalization engine using:
    - Implicit feedback signals
    - Temporal decay (recent actions matter more)
    - Collaborative filtering
    - Privacy-first approach
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or CONFIG
        log.info("PersonalizationEngine initialized")
    
    def build_user_profile(self, user_id: str, interactions: List[UserInteraction]) -> UserProfile:
        """
        Build user profile from implicit feedback.
        
        Args:
            user_id: User identifier
            interactions: List of user interactions
            
        Returns:
            UserProfile with preferences
        """
        profile = UserProfile(user_id=user_id)
        
        if not interactions:
            log.debug(f"No interactions for user {user_id} - cold start")
            return profile
        
        # Apply temporal decay to all interactions
        weighted_interactions = self._apply_temporal_decay(interactions)
        
        # Apply signal-specific weights
        weighted_interactions = self._apply_signal_weights(weighted_interactions)
        
        # Store processed interactions
        profile.interactions = weighted_interactions
        
        # Extract preferences
        profile.preferred_types = self._extract_preferred_types(weighted_interactions)
        profile.preferred_tiers = self._extract_preferred_tiers(weighted_interactions)
        
        profile.updated_at = datetime.now()
        
        log.debug(f"Built profile for user {user_id}: {len(weighted_interactions)} interactions")
        
        return profile
    
    def _apply_temporal_decay(self, interactions: List[UserInteraction]) -> List[UserInteraction]:
        """
        Apply temporal decay: recent interactions matter more.
        Formula: weight = base_weight * exp(-λ * days_ago)
        where λ = ln(2) / half_life
        """
        if not self.config['temporal_decay']['enabled']:
            return interactions
        
        half_life = self.config['temporal_decay']['half_life_days']
        min_weight = self.config['temporal_decay']['min_weight']
        lambda_val = math.log(2) / half_life
        
        now = datetime.now()
        
        for interaction in interactions:
            days_ago = (now - interaction.timestamp).days
            decay = math.exp(-lambda_val * days_ago)
            interaction.weight *= max(decay, min_weight)
        
        return interactions
    
    def _apply_signal_weights(self, interactions: List[UserInteraction]) -> List[UserInteraction]:
        """
        Apply config-defined weights per signal type.
        Purchase > Cart > Browse > Search
        """
        signals_config = self.config['signals']
        
        for interaction in interactions:
            signal_type = self._map_interaction_to_signal(interaction.interaction_type)
            
            if signal_type in signals_config and signals_config[signal_type]['enabled']:
                signal_weight = signals_config[signal_type]['weight']
                interaction.weight *= signal_weight
        
        return interactions
    
    def _map_interaction_to_signal(self, interaction_type: str) -> str:
        """Map interaction type to signal config key"""
        mapping = {
            'view': 'browse_history',
            'click': 'browse_history',
            'cart_add': 'cart_actions',
            'cart_remove': 'cart_actions',
            'purchase': 'purchase_history',
            'search': 'search_history'
        }
        return mapping.get(interaction_type, 'browse_history')
    
    def _extract_preferred_types(self, interactions: List[UserInteraction]) -> List[str]:
        """Extract preferred product types from weighted interactions"""
        type_scores = {}
        
        for interaction in interactions:
            product_type = interaction.metadata.get('type')
            if product_type:
                type_scores[product_type] = type_scores.get(product_type, 0) + interaction.weight
        
        # Sort by score
        sorted_types = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [t[0] for t in sorted_types[:5]]  # Top 5 types
    
    def _extract_preferred_tiers(self, interactions: List[UserInteraction]) -> List[str]:
        """Extract preferred product tiers from weighted interactions"""
        tier_scores = {}
        
        for interaction in interactions:
            product_tier = interaction.metadata.get('tier')
            if product_tier:
                tier_scores[product_tier] = tier_scores.get(product_tier, 0) + interaction.weight
        
        # Sort by score
        sorted_tiers = sorted(tier_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [t[0] for t in sorted_tiers[:3]]  # Top 3 tiers
    
    def personalize_results(
        self,
        base_results: List[Dict[str, Any]],
        user_profile: Optional[UserProfile]
    ) -> List[Dict[str, Any]]:
        """
        Apply personalization to base search results.
        
        Args:
            base_results: Results from hybrid search
            user_profile: User's preference profile (None for cold start)
            
        Returns:
            Personalized and re-ranked results
        """
        if not user_profile or user_profile.is_cold_start(self.config):
            # Cold start: return base results with diversity
            log.debug("Cold start user - using base results")
            return self._apply_diversity(base_results)
        
        # Calculate personalization score for each result
        for result in base_results:
            personalization_score = self._calculate_personalization_score(
                result,
                user_profile
            )
            
            # Combine with base score
            session_weight = self.config['real_time']['session_weight']
            result['personalization_score'] = personalization_score
            result['final_score'] = (
                result.get('rrf_score', 0.5) * (1 - session_weight) +
                personalization_score * session_weight
            )
        
        # Re-sort by final score
        base_results.sort(key=lambda r: r['final_score'], reverse=True)
        
        # Apply diversity constraints
        if self.config['diversity']['enabled']:
            base_results = self._apply_diversity(base_results)
        
        log.debug(f"Personalized {len(base_results)} results for user {user_profile.user_id}")
        
        return base_results
    
    def _calculate_personalization_score(
        self,
        product: Dict[str, Any],
        user_profile: UserProfile
    ) -> float:
        """Calculate personalization score for a product"""
        score = 0.0
        
        # Type preference boost
        if product.get('type') in user_profile.preferred_types:
            type_rank = user_profile.preferred_types.index(product['type'])
            score += (1.0 - type_rank * 0.2)  # Decay: 1.0, 0.8, 0.6, 0.4, 0.2
        
        # Tier preference boost
        if product.get('tier') in user_profile.preferred_tiers:
            tier_rank = user_profile.preferred_tiers.index(product['tier'])
            score += (0.5 - tier_rank * 0.15)  # Decay: 0.5, 0.35, 0.2
        
        # Normalize to [0, 1]
        score = min(score / 1.5, 1.0)
        
        return score
    
    def _apply_diversity(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply diversity constraints to avoid filter bubbles.
        Ensure variety in types and tiers.
        """
        if not self.config['diversity']['enabled']:
            return results
        
        # Strategy: Re-rank to ensure top results have variety
        # Keep top result, then alternate between different types/tiers
        
        if len(results) <= 3:
            return results  # Too few to diversify
        
        diversified = [results[0]]  # Always keep top result
        seen_types = {results[0].get('type')}
        seen_tiers = {results[0].get('tier')}
        
        for result in results[1:]:
            # Prefer unseen types/tiers
            result_type = result.get('type')
            result_tier = result.get('tier')
            
            if result_type not in seen_types or result_tier not in seen_tiers:
                diversified.append(result)
                seen_types.add(result_type)
                seen_tiers.add(result_tier)
            elif len(diversified) < len(results) * 0.7:  # Fill remaining 70%
                diversified.append(result)
        
        # Add remaining results if needed
        for result in results:
            if result not in diversified:
                diversified.append(result)
        
        return diversified


# Global instance
_personalization_engine: Optional[PersonalizationEngine] = None

def get_personalization_engine() -> PersonalizationEngine:
    """Get or create global personalization engine"""
    global _personalization_engine
    if _personalization_engine is None:
        _personalization_engine = PersonalizationEngine()
    return _personalization_engine
