"""
A/B Testing Framework for Recommendation System.
Enables controlled experiments to measure CF effectiveness.
"""

import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

log = logging.getLogger("cove.ab_testing")

# Load config
CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "data" / "ab_test_config.json"

def load_config() -> Dict[str, Any]:
    """Load A/B test configuration"""
    with open(CONFIG_PATH) as f:
        return json.load(f)

CONFIG = load_config()


class Variant(str, Enum):
    """A/B test variants"""
    CONTROL = "control"
    TREATMENT = "treatment"


class ABTestManager:
    """
    Manages A/B test variant assignment and tracking.
    
    Features:
    - User-based variant assignment (consistent)
    - Event tracking for metrics
    - Statistical significance calculation
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or CONFIG
        self.experiments = self.config["experiments"]
        self.assignment_config = self.config["assignment"]
        self.tracking_config = self.config["tracking"]
        
        log.info("ABTestManager initialized")
    
    def assign_variant(
        self,
        user_id: str,
        experiment_name: str = "cf_vs_baseline"
    ) -> Variant:
        """
        Assign user to a variant using consistent hashing.
        
        Args:
            user_id: User identifier
            experiment_name: Name of experiment
            
        Returns:
            Assigned variant (control or treatment)
        """
        if experiment_name not in self.experiments:
            log.warning(f"Unknown experiment: {experiment_name}")
            return Variant.CONTROL
        
        experiment = self.experiments[experiment_name]
        
        if not experiment["enabled"]:
            log.info(f"Experiment {experiment_name} is disabled")
            return Variant.CONTROL
        
        # Hash user_id to get consistent assignment
        hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        
        # Determine variant based on weights
        control_weight = experiment["variants"]["control"]["weight"]
        treatment_weight = experiment["variants"]["treatment"]["weight"]
        total_weight = control_weight + treatment_weight
        
        threshold = control_weight / total_weight
        random_val = (hash_val % 10000) / 10000  # 0.0000 to 0.9999
        
        if random_val < threshold:
            variant = Variant.CONTROL
        else:
            variant = Variant.TREATMENT
        
        log.debug(f"User {user_id} assigned to {variant} (hash: {random_val:.4f}, threshold: {threshold:.4f})")
        
        return variant
    
    def get_variant_config(
        self,
        variant: Variant,
        experiment_name: str = "cf_vs_baseline"
    ) -> Dict[str, Any]:
        """
        Get configuration for a specific variant.
        
        Args:
            variant: Assigned variant
            experiment_name: Name of experiment
            
        Returns:
            Variant configuration
        """
        experiment = self.experiments.get(experiment_name, {})
        return experiment.get("variants", {}).get(variant.value, {}).get("config", {})
    
    def track_event(
        self,
        event_name: str,
        properties: Dict[str, Any]
    ):
        """
        Track an A/B test event for later analysis.
        
        Args:
            event_name: Name of event (e.g., 'recommendation_shown')
            properties: Event properties
        """
        events_config = self.tracking_config["events"]
        
        if event_name not in events_config:
            log.warning(f"Unknown event: {event_name}")
            return
        
        if not events_config[event_name]["enabled"]:
            return
        
        # Add timestamp if not present
        if "timestamp" not in properties:
            properties["timestamp"] = datetime.now().isoformat()
        
        # TODO: Store in database
        # For now, just log
        log.info(f"AB Event: {event_name} - {properties}")
        
        # In production, insert into database:
        # await db.execute(
        #     "INSERT INTO ab_test_events (event_name, properties, timestamp) VALUES ($1, $2, $3)",
        #     event_name, json.dumps(properties), properties["timestamp"]
        # )
    
    def should_use_cf(
        self,
        user_id: Optional[str],
        experiment_name: str = "cf_vs_baseline"
    ) -> bool:
        """
        Determine if CF should be enabled for this user.
        
        Args:
            user_id: User identifier (None = no A/B test)
            experiment_name: Name of experiment
            
        Returns:
            True if CF should be enabled
        """
        if not user_id:
            # No user_id = use default config
            return self.config["experiments"][experiment_name]["variants"]["treatment"]["config"]["cf_enabled"]
        
        variant = self.assign_variant(user_id, experiment_name)
        config = self.get_variant_config(variant, experiment_name)
        
        return config.get("cf_enabled", False)
    
    def get_experiment_stats(
        self,
        experiment_name: str = "cf_vs_baseline"
    ) -> Dict[str, Any]:
        """
        Get current statistics for an experiment.
        
        Args:
            experiment_name: Name of experiment
            
        Returns:
            Experiment statistics
        """
        # TODO: Query database for actual stats
        # For now, return placeholder
        return {
            "experiment": experiment_name,
            "status": "running",
            "start_date": self.experiments[experiment_name]["start_date"],
            "variants": {
                "control": {
                    "users": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "ctr": 0.0,
                    "conversion_rate": 0.0
                },
                "treatment": {
                    "users": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "ctr": 0.0,
                    "conversion_rate": 0.0
                }
            },
            "significance": {
                "is_significant": False,
                "p_value": 1.0,
                "confidence": 0.50
            }
        }


# Global instance
_ab_manager: Optional[ABTestManager] = None

def get_ab_manager() -> ABTestManager:
    """Get or create global A/B test manager"""
    global _ab_manager
    if _ab_manager is None:
        _ab_manager = ABTestManager()
    return _ab_manager
