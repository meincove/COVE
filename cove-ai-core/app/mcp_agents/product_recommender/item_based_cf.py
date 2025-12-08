"""
Item-Based Collaborative Filtering.
Computes item-item similarities for "customers who bought X also bought Y" recommendations.
Research-backed implementation using cosine similarity and efficient caching.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import numpy as np
from scipy.sparse import csr_matrix
from scipy.spatial.distance import cosine
import pickle

log = logging.getLogger("cove.item_cf")

# Load config
CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "data" / "cf_config.json"

def load_config() -> Dict[str, Any]:
    """Load CF configuration"""
    with open(CONFIG_PATH) as f:
        return json.load(f)

CONFIG = load_config()


class ItemBasedCF:
    """
    Item-based collaborative filtering using cosine similarity.
    
    Approach:
    1. Build user-item interaction matrix from implicit feedback
    2. Compute item-item similarity matrix  
    3. Cache similarities for fast lookup
    4. Recommend items similar to those user has interacted with
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or CONFIG['item_based_cf']
        self.similarity_matrix: Dict[str, List[Tuple[str, float]]] = {}
        self.user_item_matrix: Optional[csr_matrix] = None
        self.item_to_idx: Dict[str, int] = {}
        self.idx_to_item: Dict[int, str] = {}
        
        log.info("ItemBasedCF initialized")
    
    def build_user_item_matrix(
        self,
        interactions: List[Dict[str, Any]]
    ) -> csr_matrix:
        """
        Build sparse user-item interaction matrix.
        
        Args:
            interactions: List of {user_id, item_id, weight} dicts
            
        Returns:
            Sparse matrix where M[user][item] = interaction weight
        """
        # Create mappings
        users = sorted(set(i['user_id'] for i in interactions))
        items = sorted(set(i['item_id'] for i in interactions))
        
        user_to_idx = {u: idx for idx, u in enumerate(users)}
        self.item_to_idx = {item: idx for idx, item in enumerate(items)}
        self.idx_to_item = {idx: item for item, idx in self.item_to_idx.items()}
        
        # Build sparse matrix
        rows, cols, data = [], [], []
        for interaction in interactions:
            user_idx = user_to_idx[interaction['user_id']]
            item_idx = self.item_to_idx[interaction['item_id']]
            weight = interaction.get('weight', 1.0)
            
            rows.append(user_idx)
            cols.append(item_idx)
            data.append(weight)
        
        matrix = csr_matrix(
            (data, (rows, cols)),
            shape=(len(users), len(items))
        )
        
        log.info(f"Built user-item matrix: {matrix.shape[0]} users × {matrix.shape[1]} items")
        
        # Calculate sparsity (avoid division by zero)
        if matrix.shape[0] > 0 and matrix.shape[1] > 0:
            sparsity = 100 * (1 - matrix.nnz / (matrix.shape[0] * matrix.shape[1]))
            log.info(f"Sparsity: {sparsity:.2f}%")
        
        self.user_item_matrix = matrix
        return matrix
    
    def compute_item_similarity(
        self,
        item_id_1: str,
        item_id_2: str
    ) -> float:
        """
        Compute cosine similarity between two items.
        
        Similarity based on users who interacted with both items.
        """
        if self.user_item_matrix is None:
            return 0.0
        
        idx1 = self.item_to_idx.get(item_id_1)
        idx2 = self.item_to_idx.get(item_id_2)
        
        if idx1 is None or idx2 is None:
            return 0.0
        
        # Get item vectors (columns from user-item matrix)
        vec1 = self.user_item_matrix[:, idx1].toarray().flatten()
        vec2 = self.user_item_matrix[:, idx2].toarray().flatten()
        
        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
    
    def compute_all_similarities(self) -> Dict[str, List[Tuple[str, float]]]:
        """
        Compute similarity matrix for all items.
        
        Returns:
            Dict mapping item_id → [(similar_item_id, similarity_score), ...]
        """
        if self.user_item_matrix is None:
            log.warning("User-item matrix not built. Call build_user_item_matrix first.")
            return {}
        
        n_items = len(self.item_to_idx)
        log.info(f"Computing similarities for {n_items} items...")
        
        # Compute item-item similarity matrix
        # Transpose to get item-user matrix, then compute cosine similarity
        item_user_matrix = self.user_item_matrix.T  # items × users
        
        similarities = defaultdict(list)
        
        for i in range(n_items):
            item_id = self.idx_to_item[i]
            vec_i = item_user_matrix[i].toarray().flatten()
            norm_i = np.linalg.norm(vec_i)
            
            if norm_i == 0:
                continue
            
            item_similarities = []
            
            for j in range(n_items):
                if i == j:
                    continue
                
                item_j_id = self.idx_to_item[j]
                vec_j = item_user_matrix[j].toarray().flatten()
                norm_j = np.linalg.norm(vec_j)
                
                if norm_j == 0:
                    continue
                
                # Check minimum common users
                common_users = np.sum((vec_i > 0) & (vec_j > 0))
                if common_users < self.config['min_common_users']:
                    continue
                
                # Cosine similarity
                similarity = np.dot(vec_i, vec_j) / (norm_i * norm_j)
                
                if similarity > 0:
                    item_similarities.append((item_j_id, float(similarity)))
            
            # Sort by similarity and keep top K
            item_similarities.sort(key=lambda x: x[1], reverse=True)
            top_k = self.config['top_k_similar']
            similarities[item_id] = item_similarities[:top_k]
            
            if (i + 1) % 10 == 0 or (i + 1) == n_items:
                log.info(f"  Progress: {i+1}/{n_items} items processed")
        
        self.similarity_matrix = dict(similarities)
        log.info(f"✅ Computed similarities for {len(self.similarity_matrix)} items")
        
        return self.similarity_matrix
    
    def get_similar_items(
        self,
        item_id: str,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get most similar items to a given item.
        
        Args:
            item_id: Target item
            top_k: Number of similar items to return
            
        Returns:
            List of (item_id, similarity_score) tuples
        """
        if item_id not in self.similarity_matrix:
            log.warning(f"No similarities computed for item {item_id}")
            return []
        
        similarities = self.similarity_matrix[item_id]
        return similarities[:top_k]
    
    def recommend_based_on_history(
        self,
        user_items: List[str],
        top_k: int = 10,
        exclude_items: Optional[List[str]] = None
    ) -> List[Tuple[str, float]]:
        """
        Recommend items based on user's interaction history.
        
        Approach: Aggregate similarities from all items user has interacted with.
        
        Args:
            user_items: List of item IDs user has interacted with
            top_k: Number of recommendations to return
            exclude_items: Items to exclude from recommendations
            
        Returns:
            List of (item_id, aggregated_score) tuples
        """
        exclude_items = exclude_items or []
        exclude_set = set(exclude_items) | set(user_items)
        
        # Aggregate scores from all user items
        candidate_scores = defaultdict(float)
        
        for user_item in user_items:
            similar_items = self.get_similar_items(user_item, top_k=50)
            
            for item_id, similarity in similar_items:
                if item_id not in exclude_set:
                    candidate_scores[item_id] += similarity
        
        # Sort by aggregated score
        recommendations = sorted(
            candidate_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return recommendations[:top_k]
    
    def save_model(self, filepath: str):
        """Save similarity matrix to disk"""
        model_data = {
            'similarity_matrix': self.similarity_matrix,
            'item_to_idx': self.item_to_idx,
            'idx_to_item': self.idx_to_item,
            'config': self.config
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        log.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load similarity matrix from disk"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.similarity_matrix = model_data['similarity_matrix']
        self.item_to_idx = model_data['item_to_idx']
        self.idx_to_item = model_data['idx_to_item']
        self.config = model_data.get('config', self.config)
        
        log.info(f"Model loaded from {filepath}")
        log.info(f"Loaded {len(self.similarity_matrix)} item similarities")


# Global instance
_item_cf: Optional[ItemBasedCF] = None

def get_item_cf() -> ItemBasedCF:
    """Get or create global item-based CF instance"""
    global _item_cf
    if _item_cf is None:
        _item_cf = ItemBasedCF()
    return _item_cf
