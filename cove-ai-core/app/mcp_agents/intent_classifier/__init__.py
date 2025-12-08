"""
Intent Classifier MCP Agent
"""

from .classifier import IntentClassifier, get_classifier
# from .server import app as mcp_server  # TODO: Install python-mcp SDK

__all__ = ["IntentClassifier", "get_classifier"]
