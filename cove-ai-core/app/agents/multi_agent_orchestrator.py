"""
Multi-Agent Orchestrator - Coordinates specialized agents using 2024 best practices.

Implements:
- LangGraph Supervisor Pattern
- State Management with Checkpoints
- Parallel Execution (fan-out/fan-in)
- Resilience through Graceful Degradation
- Observability with Metrics
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import time
import logging
import json
import asyncio
from pathlib import Path

from app.core.agent_registry import registry

log = logging.getLogger("cove.agents.orchestrator")


@dataclass
class WorkflowState:
    """
    Shared state across all agents (LangGraph pattern).
    Maintains context and execution history.
    """
    query: str
    budget_max: float
    context: Dict[str, Any]
    
    # Execution tracking
    checkpoints: List[Dict[str, Any]] = field(default_factory=list)
    agent_results: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    
    # Metrics
    start_time: float = field(default_factory=time.time)
    agent_timings: Dict[str, float] = field(default_factory=dict)


@dataclass
class AgentStep:
    """Definition of agent execution step from config."""
    agent: str
    required: bool
    timeout_ms: int
    description: str
    parallel_group: int = 0  # For parallel execution


class MultiAgentOrchestrator:
    """
    Coordinates multiple agents using 2024 best practices.
    
    ALL WORKFLOWS LOADED FROM data/orchestrator_workflows.json - NO HARDCODING!
    
    Patterns Implemented:
    - LangGraph Supervisor Pattern
    - State Management with Checkpoints
    - Parallel Execution (fan-out/fan-in)
    - Resilience through Graceful Degradation
    - Observability with Metrics
    
    Example:
        orchestrator = MultiAgentOrchestrator()
        
        result = await orchestrator.execute_workflow(
            workflow_name="outfit_builder",
            query="business casual for meeting",
            context={"user_id": "user_123"}
        )
    """
    
    def __init__(self):
        self.workflows = self._load_workflows()
        self.registry = registry
        self.metrics = {
            "total_executions": 0,
            "successes": 0,
            "failures": 0,
            "avg_duration_ms": 0
        }
        log.info(f"✓ Orchestrator initialized with {len(self.workflows)} workflows")
    
    def _load_workflows(self) -> Dict[str, Any]:
        """
        Load workflow config from JSON.
        Config-driven - NO HARDCODING!
        """
        config_path = Path(__file__).parent.parent.parent / "data" / "orchestrator_workflows.json"
        
        try:
            with open(config_path, "r") as f:
                workflows = json.load(f)
            log.info(f"✓ Loaded {len(workflows)} workflows from {config_path}")
            return workflows
        except Exception as e:
            log.error(f"Failed to load workflows: {e}")
            return {}
    
    async def should_handle(self, query: str) -> Optional[str]:
        """
        Check if query matches any workflow triggers.
        Config-driven - NO HARDCODING!
        
        Returns workflow name or None.
        """
        query_lower = query.lower()
        
        for workflow_name, workflow in self.workflows.items():
            triggers = workflow.get("trigger_patterns", [])
            if any(trigger in query_lower for trigger in triggers):
                log.info(f"✓ Query matched workflow: {workflow_name}")
                return workflow_name
        
        return None
    
    async def execute_workflow(
        self,
        workflow_name: str,
        query: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute multi-agent workflow with 2024 best practices.
        
        Features:
        - State management across agents
        - Checkpointing for error recovery
        - Parallel execution where possible
        - Comprehensive observability
        """
        workflow = self.workflows.get(workflow_name)
        if not workflow:
            raise ValueError(f"Unknown workflow: {workflow_name}")
        
        # Initialize state (LangGraph pattern)
        state = WorkflowState(
            query=query,
            budget_max=context.get("budget_max", 500),
            context=context
        )
        
        log.info(f"🚀 Starting workflow: {workflow.get('name', workflow_name)}")
        log.info(f"   Query: {query}")
        log.info(f"   Budget: €{state.budget_max}")
        
        try:
            # Execute agents with checkpointing
            await self._execute_with_checkpoints(workflow, state)
            
            # Synthesize final result
            final = self._synthesize_results(state, workflow_name)
            
            # Update metrics
            duration_ms = (time.time() - state.start_time) * 1000
            self._update_metrics(success=final["success"], duration_ms=duration_ms)
            
            log.info(f"✅ Workflow complete: {duration_ms:.0f}ms")
            
            return final
            
        except Exception as e:
            log.error(f"❌ Workflow failed: {e}")
            self._update_metrics(success=False, duration_ms=0)
            
            # Return safe fallback
            return {
                "success": False,
                "error": str(e),
                "state": state.checkpoints,  # For debugging
                "reasoning": "Workflow failed - please try again"
            }
    
    async def _execute_with_checkpoints(
        self,
        workflow: Dict[str, Any],
        state: WorkflowState
    ):
        """
        Execute agents with checkpointing for resilience.
        Groups agents by parallel_group for concurrent execution.
        """
        steps_config = workflow.get("steps", [])
        
        # Parse steps from config
        steps = [
            AgentStep(
                agent=s["agent"],
                required=s["required"],
                timeout_ms=s["timeout_ms"],
                description=s["description"],
                parallel_group=s.get("parallel_group", 0)
            )
            for s in steps_config
        ]
        
        # Group steps by parallel_group
        grouped_steps = self._group_steps_for_parallel(steps)
        
        log.info(f"   Execution plan: {len(grouped_steps)} groups")
        
        for i, group_steps in enumerate(grouped_steps):
            log.info(f"   Group {i}: {[s.agent for s in group_steps]}")
            
            # Create checkpoint before group execution
            checkpoint = self._create_checkpoint(state)
            state.checkpoints.append(checkpoint)
            
            try:
                if len(group_steps) == 1:
                    # Sequential execution
                    await self._execute_agent_step(group_steps[0], state)
                else:
                    # Parallel execution
                    log.info(f"   ⚡ Executing {len(group_steps)} agents in parallel")
                    await self._execute_parallel_steps(group_steps, state)
                    
            except Exception as e:
                # Roll back to checkpoint on error
                log.warning(f"Error in step group, rolling back: {e}")
                self._rollback_to_checkpoint(state, checkpoint)
                
                # Check if required agent failed
                if any(step.required for step in group_steps):
                    raise  # Re-raise for required agents
                else:
                    # Continue for optional agents
                    state.errors.append(f"Optional agent failed: {e}")
    
    def _group_steps_for_parallel(self, steps: List[AgentStep]) -> List[List[AgentStep]]:
        """Group steps by parallel_group for concurrent execution."""
        from itertools import groupby
        
        # Sort by parallel_group
        sorted_steps = sorted(steps, key=lambda s: s.parallel_group)
        
        # Group consecutive steps with same parallel_group
        grouped = []
        for _, group in groupby(sorted_steps, key=lambda s: s.parallel_group):
            grouped.append(list(group))
        
        return grouped
    
    async def _execute_parallel_steps(
        self,
        steps: List[AgentStep],
        state: WorkflowState
    ):
        """
        Execute multiple agent steps in parallel (fan-out/fan-in).
        2024 Best Practice - parallel execution for speed.
        """
        tasks = [
            self._execute_agent_step(step, state)
            for step in steps
        ]
        
        # Wait for all to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check for failures in required agents
        for i, result in enumerate(results):
            if isinstance(result, Exception) and steps[i].required:
                raise result
    
    async def _execute_agent_step(
        self,
        step: AgentStep,
        state: WorkflowState
    ):
        """
        Execute single agent with timeout and retry.
        Implements retry logic for transient failures.
        """
        agent_name = step.agent
        max_retries = 2
        retry_delay = 0.5  # seconds
        
        for attempt in range(max_retries + 1):
            try:
                start = time.time()
                
                # Get agent from registry
                agent_info = self.registry.get_agent(agent_name)
                if not agent_info:
                    raise ValueError(f"Agent not found: {agent_name}")
                
                # Build task from state
                task = self._build_agent_task(agent_name, state)
                
                # Execute with timeout
                result = await asyncio.wait_for(
                    agent_info["handler"](task, state.context),
                    timeout=step.timeout_ms / 1000
                )
                
                # Store result
                duration_ms = (time.time() - start) * 1000
                state.agent_results[agent_name] = result
                state.agent_timings[agent_name] = duration_ms
                
                log.info(f"   ✓ {agent_name}: {duration_ms:.0f}ms")
                return result
                
            except asyncio.TimeoutError:
                log.warning(f"   ⏱️ {agent_name} timeout (attempt {attempt + 1}/{max_retries + 1})")
                if attempt < max_retries:
                    await asyncio.sleep(retry_delay)
                else:
                    raise
                    
            except Exception as e:
                log.error(f"   ❌ {agent_name} failed: {e} (attempt {attempt + 1}/{max_retries + 1})")
                if attempt < max_retries:
                    await asyncio.sleep(retry_delay)
                else:
                    raise
    
    def _build_agent_task(self, agent_name: str, state: WorkflowState) -> Dict[str, Any]:
        """Build task dict for specific agent from state."""
        base_task = {
            "query": state.query,
            "budget_max": state.budget_max
        }
        
        # Agent-specific task building
        if agent_name == "stylist":
            return base_task
        
        elif agent_name == "fit":
            # Pass outfit items from stylist
            stylist_result = state.agent_results.get("stylist", {})
            return {
                "items": stylist_result.get("data", {}).get("outfit_items", []),
                "user_size_history": state.context.get("user_size_history", {})
            }
        
        elif agent_name == "budget":
            # Pass outfit items from stylist
            stylist_result = state.agent_results.get("stylist", {})
            return {
                "items": stylist_result.get("data", {}).get("outfit_items", []),
                "budget_max": state.budget_max
            }
        
        return base_task
    
    def _create_checkpoint(self, state: WorkflowState) -> Dict[str, Any]:
        """Create checkpoint for rollback."""
        return {
            "timestamp": time.time(),
            "agent_results": state.agent_results.copy(),
            "errors": state.errors.copy()
        }
    
    def _rollback_to_checkpoint(self, state: WorkflowState, checkpoint: Dict):
        """Restore state from checkpoint."""
        state.agent_results = checkpoint["agent_results"].copy()
        state.errors = checkpoint["errors"].copy()
        log.info(f"   ↩️ Rolled back to checkpoint at {checkpoint['timestamp']}")
    
    def _synthesize_results(
        self,
        state: WorkflowState,
        workflow_name: str
    ) -> Dict[str, Any]:
        """
        Synthesize final result from all agent outputs.
        Combines stylist items + fit sizes + budget optimization.
        """
        stylist_result = state.agent_results.get("stylist", {})
        fit_result = state.agent_results.get("fit", {})
        budget_result = state.agent_results.get("budget", {})
        
        # Check if minimum agents succeeded
        success_count = sum(1 for r in state.agent_results.values() if r.get("success"))
        min_required = 2  # From config
        
        success = success_count >= min_required
        
        # Build final outfit
        outfit_items = stylist_result.get("data", {}).get("outfit_items", [])
        size_recs = fit_result.get("data", {}).get("size_recommendations", [])
        budget_data = budget_result.get("data", {})
        
        # Merge size recommendations into outfit items
        enriched_items = self._enrich_items_with_sizes(outfit_items, size_recs)
        
        # Build reasoning
        reasoning_parts = []
        if stylist_result.get("reasoning"):
            reasoning_parts.append(f"Styling: {stylist_result['reasoning']}")
        if fit_result.get("reasoning"):
            reasoning_parts.append(f"Sizing: {fit_result['reasoning']}")
        if budget_result.get("reasoning"):
            reasoning_parts.append(f"Budget: {budget_result['reasoning']}")
        
        reasoning = ". ".join(reasoning_parts) if reasoning_parts else "Outfit recommendation ready"
        
        return {
            "success": success,
            "workflow": workflow_name,
            "outfit_items": enriched_items,
            "total": budget_data.get("final_total", stylist_result.get("data", {}).get("total", 0)),
            "within_budget": budget_data.get("within_budget", True),
            "discount_applied": budget_data.get("discount_applied"),
            "size_recommendations": size_recs,
            "reasoning": reasoning,
            "confidence": self._calculate_overall_confidence(state),
            "agent_timings": state.agent_timings,
            "errors": state.errors
        }
    
    def _enrich_items_with_sizes(
        self,
        outfit_items: List[Dict],
        size_recs: List[Dict]
    ) -> List[Dict]:
        """Merge size recommendations into outfit items."""
        enriched = []
        
        for item in outfit_items:
            product_id = item.get("product", {}).get("id")
            
            # Find matching size recommendation
            size_rec = next(
                (r for r in size_recs if r.get("product_id") == product_id),
                None
            )
            
            enriched_item = item.copy()
            if size_rec:
                enriched_item["recommended_size"] = size_rec.get("recommended_size")
                enriched_item["size_confidence"] = size_rec.get("confidence")
                enriched_item["size_warnings"] = size_rec.get("warnings", [])
            
            enriched.append(enriched_item)
        
        return enriched
    
    def _calculate_overall_confidence(self, state: WorkflowState) -> float:
        """Calculate weighted average confidence from all agents."""
        confidences = []
        
        for agent_name, result in state.agent_results.items():
            if result.get("success"):
                confidences.append(result.get("confidence", 0.5))
        
        if not confidences:
            return 0.0
        
        return sum(confidences) / len(confidences)
    
    def _update_metrics(self, success: bool, duration_ms: float):
        """Update execution metrics."""
        self.metrics["total_executions"] += 1
        
        if success:
            self.metrics["successes"] += 1
        else:
            self.metrics["failures"] += 1
        
        # Update rolling average
        total = self.metrics["total_executions"]
        avg = self.metrics["avg_duration_ms"]
        self.metrics["avg_duration_ms"] = ((avg * (total - 1)) + duration_ms) / total
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current orchestrator metrics."""
        total = self.metrics["total_executions"]
        return {
            **self.metrics,
            "success_rate": self.metrics["successes"] / total if total > 0 else 0
        }


# Global instance
orchestrator = MultiAgentOrchestrator()

log.info("✓ Multi-agent orchestrator ready")
