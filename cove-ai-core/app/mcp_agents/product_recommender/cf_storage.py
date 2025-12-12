"""
CF Model Storage Helper for AI Core.

Bridges between Django models (in backend) and AI Core.
Uses Django's database connection to save/load CF models.
"""

import os
import sys
import pickle
import logging
from typing import Dict, Any, Optional
from datetime import datetime

log = logging.getLogger("cove.cf_storage")

# Add backend to Python path for Django imports
BACKEND_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from analytics.models import CFModel


def save_cf_model_to_db(
    model_data: Dict[str, Any],
    model_type: str = 'item_similarity',
    metadata: Optional[Dict[str, Any]] = None
) -> int:
    """
    Save CF model to Neon DB via Django.
    
    Args:
        model_data: Dict containing similarity_matrix, mappings, config
        model_type: Type of CF model
        metadata: Training metadata (num_users, num_items, etc.)
    
    Returns:
        Version number of saved model
    """
    try:
        # Pickle the model data
        model_bytes = pickle.dumps(model_data)
        
        # Prepare metadata
        meta = metadata or {}
        meta['saved_at'] = datetime.now().isoformat()
        meta['model_size_mb'] = len(model_bytes) / (1024 * 1024)
        
        # Save to DB
        cf_model = CFModel.objects.create(
            model_type=model_type,
            model_data=model_bytes,
            metadata=meta,
            is_active=True
        )
        
        log.info(f"✅ Saved CF model to DB: v{cf_model.version} ({meta['model_size_mb']:.2f}MB)")
        
        # Cleanup old versions (keep last 5)
        deleted = CFModel.cleanup_old_versions(model_type=model_type, keep_last_n=5)
        if deleted > 0:
            log.info(f"Cleaned up {deleted} old model versions")
        
        return cf_model.version
        
    except Exception as e:
        log.error(f"Failed to save CF model to DB: {e}")
        raise


def load_cf_model_from_db(
    model_type: str = 'item_similarity',
    version: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Load CF model from Neon DB via Django.
    
    Args:
        model_type: Type of CF model to load
        version: Specific version to load (None = latest active)
    
    Returns:
        Dict containing similarity_matrix, mappings, config (or None if not found)
    """
    try:
        if version is not None:
            # Load specific version
            cf_model = CFModel.objects.filter(
                model_type=model_type,
                version=version
            ).first()
        else:
            # Load latest active version
            cf_model = CFModel.get_active_model(model_type=model_type)
        
        if cf_model is None:
            log.warning(f"No CF model found in DB (type={model_type}, version={version})")
            return None
        
        # Unpickle model data
        model_data = pickle.loads(cf_model.model_data)
        
        log.info(f"✅ Loaded CF model from DB: v{cf_model.version} ({cf_model.file_size_bytes / (1024*1024):.2f}MB)")
        
        return model_data
        
    except Exception as e:
        log.error(f"Failed to load CF model from DB: {e}")
        return None


def list_cf_models(model_type: str = 'item_similarity', limit: int = 10) -> list:
    """
    List available CF models in DB.
    
    Returns:
        List of dicts with version, created_at, size, is_active
    """
    try:
        models = CFModel.objects.filter(model_type=model_type)[:limit]
        
        return [
            {
                'version': m.version,
                'created_at': m.created_at.isoformat(),
                'size_mb': m.file_size_bytes / (1024 * 1024),
                'is_active': m.is_active,
                'metadata': m.metadata
            }
            for m in models
        ]
        
    except Exception as e:
        log.error(f"Failed to list CF models: {e}")
        return []
