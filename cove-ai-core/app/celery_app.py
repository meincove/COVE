"""
Celery application configuration for COVE background tasks.

This module configures Celery for distributed task processing with Redis as the message broker.
"""

from celery import Celery
import os

# Redis configuration from environment (falls back to localhost for dev)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Celery configuration
celery_app = Celery(
    'cove_tasks',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['app.tasks.fact_extraction']  # Auto-discover tasks
)

# Configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit (warning)
    
    # Worker configuration
    worker_prefetch_multiplier=1,  # Only fetch 1 task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (prevent memory leaks)
    
    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={'master_name': 'mymaster'},
    
    # Retry configuration
    task_acks_late=True,  # Acknowledge task after completion (not before)
    task_reject_on_worker_lost=True,  # Reject task if worker dies
)

# Optional: Configure logging
celery_app.conf.update(
    worker_hijack_root_logger=False,  # Don't hijack root logger
)
