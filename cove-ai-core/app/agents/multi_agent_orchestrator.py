"""
Multi-Agent Orchestrator - Coordinates specialized agents using 2024 best practices.

Implements:
- LangGraph Supervisor Pattern
- State Management with Checkpoints
- Parallel Execution (fan-out/fan-in)
- Resilience through Graceful Degradation
- Observability with Metrics
"""

from typing import Dict, Any, List, Optional, AsyncGenerator
from dataclasses import dataclass, field
import time
import logging
import json
import asyncio
import os
import litellm
from pathlib import Path

from app.core.agent_registry import registry
from app.services.conversation_manager import get_conversation_manager

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
        Smart Router: Classify query into one of the available workflows.
        
        1. Try simple keyword match (fast path)
        2. If ambiguous, ask LLM (smart path)
        
        Returns workflow name or None (if general chat).
        """
        query_lower = query.lower()
        
        # 0. Multimodal Priority: If image present, route to multimodal
        if context.get("imageUrl") or context.get("imageData"):
            log.info("🖼️ Image detected in context, routing to multimodal_search")
            return "multimodal_search"
        
        # 1. Fast Path: Keyword Shortcuts
        for workflow_name, workflow in self.workflows.items():
            triggers = workflow.get("trigger_patterns", [])
            for trigger in triggers:
                if trigger in query_lower:
                    log.info(f"✓ Fast-path matched workflow: {workflow_name} (trigger: '{trigger}')")
                    return workflow_name

        
        # 2. Smart Path: LLM Intent Classification
        try:
            # Get conversation history for context (if available)
            # This helps distinguish flow ("add shoes" vs "new outfit")
            # We assume user_id is in current context or we skip history lookup here
            # For simplicity in routing, we look at the query itself mostly
            
            # Use the dedicated Router Model (cheaper/faster, e.g. gpt-4o-mini)
            router_model = os.getenv("LLM_ROUTER_MODEL", "openrouter/openai/gpt-4o-mini")
            log.info(f"🤔 Routing query via {router_model}: {query[:50]}...")
            
            # Construct prompt with available workflows
            workflow_descriptions = []
            for name, wf in self.workflows.items():
                workflow_descriptions.append(f"- {name}: {wf.get('description')}")
            
            system_prompt = f"""You are the Orchestrator Router for a fashion AI.
Your job is to map the user's query to the best available workflow.

Available Workflows:
{chr(10).join(workflow_descriptions)}

Rules:
1. RESPONSE MUST BE RAW JSON. Do not include markdown blocks (```json).
2. Format: {{"workflow": "workflow_name"}} or {{"workflow": null}}.
3. Be conservative. If user just says "hi", return null.
4. "outfit_builder" is ONLY for complex OUTFIT requests ("outfit for date", "what matches this", "style me").
5. "knowledge_query" is for QUESTIONS about fashion/style ("what is...", "how to wear...").
6. "support_request" is for RETURNS, SHIPPING, ORDER STATUS.
7. SIMPLE SEARCH ("show me hoodies", "red dress", "search for shoes") -> null (Legacy system handles these).
8. "add to cart", "buy", "checkout", "check out" -> null.
"""

            response = await litellm.acompletion(
                model=router_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            
            result = json.loads(response.choices[0].message.content)
            workflow = result.get("workflow")
            
            if workflow and workflow in self.workflows:
                log.info(f"🎯 LLM routed to: {workflow}")
                return workflow
                
            log.info("🤷 LLM declined to route (general chat)")
            return None
            
        except Exception as e:
            log.error(f"Router failed: {e}")
            return None
    
    async def execute_workflow(
        self,
        workflow_name: str,
        query: str,
        context: Dict[str, Any],
        stream: bool = False  # NEW: Enable streaming progress updates
    ):
        """
        Execute multi-agent workflow with 2024 best practices.
        
        Features:
        - State management across agents
        - Checkpointing for error recovery
        - Parallel execution where possible
        - Comprehensive observability
        - Optional streaming for real-time progress (NEW)
        
        Args:
            workflow_name: Name of workflow to execute
            query: User query
            context: Execution context
            stream: If True, yields progress updates during execution
            
        Returns:
            If stream=False: Dict with results
            If stream=True: AsyncGenerator yielding progress updates
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
        log.info(f"   Streaming: {stream}")
        
        if stream:
            # Streaming mode - yield from async generator
            async for update in self._execute_streaming_workflow(workflow, state, workflow_name):
                yield update
        else:
            # Non-streaming mode - yield single result
            result = await self._execute_standard_workflow(workflow, state, workflow_name)
            yield result
    
    async def _execute_standard_workflow(
        self,
        workflow: Dict[str, Any],
        state: WorkflowState,
        workflow_name: str,
        stream_callback: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Execute workflow without streaming (standard mode)."""
        try:
            # Execute agents with checkpointing
            await self._execute_with_checkpoints(workflow, state, stream_callback)
            
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
    
    async def _execute_streaming_workflow(
        self,
        workflow: Dict[str, Any],
        state: WorkflowState,
        workflow_name: str
    ):
        """Execute workflow with streaming (async generator)."""
        try:
            # Stream progress updates
            async for update in self._execute_streaming(workflow, state):
                yield update
            
            # Yield final result
            final = self._synthesize_results(state, workflow_name)
            duration_ms = (time.time() - state.start_time) * 1000
            self._update_metrics(success=final["success"], duration_ms=duration_ms)
            
            yield {
                "type": "complete",
                "result": final,
                "duration_ms": duration_ms
            }
            
        except Exception as e:
            log.error(f"❌ Workflow failed: {e}")
            self._update_metrics(success=False, duration_ms=0)
            
            # Yield error
            yield {
                "type": "error",
                "error": str(e),
                "result": {
                    "success": False,
                    "error": str(e),
                    "state": state.checkpoints,
                    "reasoning": "Workflow failed - please try again"
                }
            }
    
    
    async def _execute_streaming(
        self,
        workflow: Dict[str, Any],
        state: WorkflowState
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute workflow steps in streaming mode.
        Wrapper around _execute_steps that ensures agentic events are captured.
        """
        # We pass a dummy callback to enable the internal event queueing 
        # mechanism in _execute_steps for agents like outfit_builder
        async def _noop_callback(event):
            pass
            
        steps = workflow.get("steps", [])
        async for update in self._execute_steps(steps, state, stream_callback=_noop_callback):
            yield update

    async def _execute_steps(
        self, 
        steps_config: List[Dict[str, Any]], 
        state: WorkflowState,
        stream_callback: Optional[Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute workflow with streaming progress updates.
        Yields progress events as agents complete.
        ✨ PHASE 6: Now also yields agentic exploration events (category_start, category_candidates, item_selected)
        """
        
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
        
        total_groups = len(grouped_steps)
        log.info(f"   Execution plan: {total_groups} groups")
        
        for i, group_steps in enumerate(grouped_steps, 1):
            agent_names = [s.agent for s in group_steps]
            log.info(f"   Group {i}/{total_groups}: {agent_names}")
            
            # Yield progress update
            if stream_callback:
                await stream_callback({
                    "type": "progress",
                    "step": i,
                    "total": total_groups,
                    "agents": agent_names,
                    "status": f"Running {', '.join(agent_names)}..."
                })
            
            yield {
                "type": "progress",
                "step": i,
                "total": total_groups,
                "agents": agent_names,
                "status": f"Running {', '.join(agent_names)}..."
            }
            
            # Create checkpoint before group execution
            checkpoint = self._create_checkpoint(state)
            state.checkpoints.append(checkpoint)
            
            try:
                if len(group_steps) == 1:
                    step = group_steps[0]
                    
                    # ✨ PHASE 6: Create async queue for agentic events (stylist AND outfit_builder)
                    if step.agent in ("stylist", "outfit_builder") and stream_callback:
                        agentic_queue = asyncio.Queue()
                        
                        # ✨ ROBUST: Safe Async Callback Wrapper
                        # Explicitly defined as async def to guarantee a Coroutine is returned.
                        async def safe_agentic_callback_wrapper(event):
                            """Callback for stylist/outfit_builder to emit exploration events"""
                            try:
                                await agentic_queue.put(event)
                            except Exception as e:
                                # Start a background logger or just log robustly
                                # We must NOT propagate exceptions that would crash the await
                                logging.getLogger("cove.orchestrator").warning(f"Failed to enqueue agentic event: {e}")

                        # Run agent execution in background
                        async def run_agent():
                            try:
                                # Pass safer wrapper
                                await self._execute_agent_step(step, state, stream_callback=safe_agentic_callback_wrapper)
                            finally:
                                # Ensure we ALWAYS signal completion, even if agent crashes/times out
                                await agentic_queue.put(None)
                        
                        agent_task = asyncio.create_task(run_agent())
                        
                        # Yield agentic events as they come in
                        while True:
                            event = await agentic_queue.get()
                            if event is None:
                                log.info("📤 AGENTIC QUEUE: Received completion signal (None)")
                                break  # Agent done
                            log.info(f"📤 AGENTIC QUEUE yielding event: {event.get('event_type')}")
                            if stream_callback:
                                await stream_callback({
                                    "type": "agentic_event",
                                    **event
                                })
                            yield {
                                "type": "agentic_event",
                                **event
                            }
                        
                        # Wait for agent to fully complete
                        await agent_task
                    else:
                        # Sequential execution (non-streaming agent or no stream_callback)
                        await self._execute_agent_step(group_steps[0], state, stream_callback)
                else:
                    # Parallel execution
                    log.info(f"   ⚡ Executing {len(group_steps)} agents in parallel")
                    await self._execute_parallel_steps(group_steps, state, stream_callback)
                
                # Yield completion update
                step_results = {}
                for name in agent_names:
                    res = state.agent_results.get(name)
                    if res and hasattr(res, "to_dict"):
                        step_results[name] = res.to_dict()
                    else:
                        step_results[name] = res
                
                if stream_callback:
                    await stream_callback({
                        "type": "step_complete",
                        "step": i,
                        "agents": agent_names,
                        "results": step_results,
                        "status": f"Completed {', '.join(agent_names)}"
                    })
                
                yield {
                    "type": "step_complete",
                    "step": i,
                    "agents": agent_names,
                    "results": step_results,
                    "status": f"Completed {', '.join(agent_names)}"
                }
                
                # ✨ EARLY EXIT: Check if any agent requested confirmation
                should_halt = False
                for name in agent_names:
                    res = self._get_result_dict(state.agent_results.get(name))
                    data = res.get("data", {})
                    if data.get("needs_confirmation"):
                        log.info(f"🛑 Halting workflow for confirmation request by {name}")
                        should_halt = True
                        break
                
                if should_halt:
                    break
                    
            except Exception as e:
                # Roll back to checkpoint on error
                log.warning(f"Error in step group, rolling back: {e}")
                self._rollback_to_checkpoint(state, checkpoint)
                
                # Yield error update
                if stream_callback:
                    await stream_callback({
                        "type": "step_error",
                        "step": i,
                        "agents": agent_names,
                        "error": str(e)
                    })
                
                yield {
                    "type": "step_error",
                    "step": i,
                    "agents": agent_names,
                    "error": str(e)
                }
                
                # Check if required agent failed
                if any(step.required for step in group_steps):
                    raise  # Re-raise for required agents
                else:
                    # Continue for optional agents
                    state.errors.append(f"Optional agent failed: {e}")
    
    
    async def _execute_with_checkpoints(
        self,
        workflow: Dict[str, Any],
        state: WorkflowState,
        stream_callback: Optional[Any] = None
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
                    await self._execute_agent_step(group_steps[0], state, stream_callback)
                else:
                    # Parallel execution
                    log.info(f"   ⚡ Executing {len(group_steps)} agents in parallel")
                    await self._execute_parallel_steps(group_steps, state, stream_callback)
                
                # ✨ EARLY EXIT: Check if any agent requested confirmation
                should_halt = False
                for step in group_steps:
                    res = self._get_result_dict(state.agent_results.get(step.agent))
                    data = res.get("data", {})
                    if data.get("needs_confirmation"):
                        log.info(f"🛑 Halting workflow for confirmation request by {step.agent}")
                        should_halt = True
                        break
                
                if should_halt:
                    break
                    
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
        state: WorkflowState,
        stream_callback: Optional[Any] = None
    ):
        """
        Execute multiple agent steps in parallel (fan-out/fan-in).
        2024 Best Practice - parallel execution for speed.
        """
        tasks = [
            self._execute_agent_step(step, state, stream_callback)
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
        state: WorkflowState,
        stream_callback: Optional[Any] = None  # ✨ PHASE 6: For agentic streaming
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
                
                # ✨ FIXED: Re-enable stream_callback for stylist and outfit_builder
                # Pass stream_callback to agents that support it for real-time progress updates
                
                if (agent_name == "stylist" or agent_name == "outfit_builder") and stream_callback:
                    # Pass stream_callback to streaming-capable agents
                    result = await asyncio.wait_for(
                        agent_info["handler"](task, state.context, stream_callback=stream_callback),
                        timeout=step.timeout_ms / 1000
                    )
                else:
                    # Standard execution for non-streaming agents
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

    def _get_result_dict(self, result: Any) -> Dict[str, Any]:
        """Convert AgentResult or dict to standardized dict."""
        if result and hasattr(result, "to_dict"):
            return result.to_dict()
        return result if isinstance(result, dict) else {}
    
    def _build_agent_task(self, agent_name: str, state: WorkflowState) -> Dict[str, Any]:
        """Build task dict for specific agent from state."""
        base_task = {
            "query": state.query,
            "budget_max": state.budget_max
        }
        
        # Agent-specific task building
        if agent_name == "vision" or agent_name == "fashion_analyzer":
            return {
                "query": state.query,
                "imageUrl": state.context.get("imageUrl"),
                "imageData": state.context.get("imageData")
            }

        elif agent_name == "stylist":
            # If coming from vision/fashion analyzer, inject visual tags into query
            analyzer_result = self._get_result_dict(state.agent_results.get("fashion_analyzer") or state.agent_results.get("vision"))
            if analyzer_result.get("success"):
                data = analyzer_result.get("data", {})
                tags = data.get("search_tags") or data.get("tags", [])
                description = data.get("core_item") or data.get("description", "")
                vibe = data.get("vibe", "")
                
                if tags or vibe:
                    log.info(f"🎨 Injecting visual DNA into stylist: {vibe} {tags}")
                    # Prepend tags and vibe to query
                    boosted_query = f"{state.query} style: {vibe} {', '.join(tags)} {description}".strip()
                    return {
                        "query": boosted_query,
                        "budget_max": state.budget_max,
                        "visual_context": data
                    }
            return base_task

        elif agent_name == "outfit_builder":
            # Pass candidates from stylist
            stylist_result = self._get_result_dict(state.agent_results.get("stylist"))
            intent = stylist_result.get("data", {}).get("intent", {})
            
            # Prioritize context-level filters passed from agent.py
            brand_filter = state.context.get("brand") or \
                           intent.get("brand_filter") or \
                           intent.get("filters", {}).get("brand")
            
            gender = state.context.get("gender") or \
                     intent.get("gender") or \
                     intent.get("filters", {}).get("gender")

            return {
                "candidates": stylist_result.get("data", {}).get("candidates", {}),
                "intent": intent,
                # FIX: Explicitly pass style/occasion/gender for OutfitBuilder to use
                "style": intent.get("style", "casual"),
                "occasion": intent.get("occasion", "casual"),
                "gender": gender, 
                "brand_filter": brand_filter,
                "user_preferences": stylist_result.get("data", {}).get("user_preferences", {}),
                "budget_max": state.budget_max
            }
        
        elif agent_name == "fit":
            # Pass outfit items from builder
            builder_result = self._get_result_dict(state.agent_results.get("outfit_builder"))
            return {
                "items": builder_result.get("data", {}).get("outfit_items", []),
                "user_size_history": state.context.get("user_size_history", {})
            }
        
        elif agent_name == "budget":
            # Pass outfit items from builder
            builder_result = self._get_result_dict(state.agent_results.get("outfit_builder"))
            return {
                "items": builder_result.get("data", {}).get("outfit_items", []),
                "budget_max": state.budget_max
            }
        
        elif agent_name == "vto_agent":
            # Pass final outfit items from builder
            builder_result = self._get_result_dict(state.agent_results.get("outfit_builder"))
            return {
                "items": builder_result.get("data", {}).get("outfit_items", []),
                "imageUrl": state.context.get("imageUrl"),
                "imageData": state.context.get("imageData")
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
        def get_res_dict(name):
            res = state.agent_results.get(name)
            if res and hasattr(res, "to_dict"):
                return res.to_dict()
            return res or {}

        stylist_result = get_res_dict("stylist")
        fit_result = get_res_dict("fit")
        budget_result = get_res_dict("budget")
        
        # Check if minimum agents succeeded
        success_count = 0
        for r in state.agent_results.values():
            is_success = r.success if hasattr(r, "success") else r.get("success")
            if is_success:
                success_count += 1
        
        min_required = 2  # From config
        
        success = success_count >= min_required
        
        # ✨ CONFIRMATION CHECK: If any agent asked for info, bubble it up immediately
        if stylist_result.get("data", {}).get("needs_confirmation"):
            return {
                "success": True,
                "workflow": workflow_name,
                "outfit_items": [],
                "needs_confirmation": True,
                "question": stylist_result["data"]["question"],
                "options": stylist_result["data"]["options"],
                "reasoning": stylist_result["reasoning"],
                "agent_timings": state.agent_timings
            }
        # Build final outfit
        builder_result = get_res_dict("outfit_builder")
        vto_result = get_res_dict("vto_agent")
        
        # Prefer Builder items, fallback to Stylist (legacy)
        outfit_items = builder_result.get("data", {}).get("outfit_items") or \
                       stylist_result.get("data", {}).get("outfit_items", [])
                       
        size_recs = fit_result.get("data", {}).get("size_recommendations", [])
        budget_data = budget_result.get("data", {})
        
        # Merge size recommendations into outfit items
        enriched_items = self._enrich_items_with_sizes(outfit_items, size_recs)
        
        # Build reasoning
        reasoning_parts = []
        if stylist_result.get("reasoning"):
            reasoning_parts.append(f"Planning: {stylist_result['reasoning']}")
        if builder_result.get("reasoning"):
            reasoning_parts.append(f"Styling: {builder_result['reasoning']}")
        if fit_result.get("reasoning"):
            reasoning_parts.append(f"Sizing: {fit_result['reasoning']}")
        if budget_result.get("reasoning"):
            reasoning_parts.append(f"Budget: {budget_result['reasoning']}")
        
        reasoning = ". ".join(reasoning_parts) if reasoning_parts else "Outfit recommendation ready"
        
        # Get calculated total (Builder > Stylist)
        builder_total = builder_result.get("data", {}).get("total_cost", 0)
        stylist_total = stylist_result.get("data", {}).get("total", 0)
        base_total = builder_total if builder_total > 0 else stylist_total
        
        # Budget agent may override with discounts, but only if it calculated something
        budget_final_total = budget_data.get("final_total")
        budget_within_budget = budget_data.get("within_budget")
        
        # Use budget agent's total only if it actually computed one (not 0 or None)
        # Otherwise use the base running total
        final_total = budget_final_total if budget_final_total and budget_final_total > 0 else base_total
        final_within_budget = budget_within_budget if budget_within_budget is not None else True
        
        return {
            "success": success,
            "workflow": workflow_name,
            "outfit_items": enriched_items,
            "total": final_total,
            "within_budget": final_within_budget,
            "discount_applied": budget_data.get("discount_applied"),
            "size_recommendations": size_recs,
            "reasoning": reasoning,
            "confidence": self._calculate_overall_confidence(state),
            "agent_timings": state.agent_timings,
            "errors": state.errors,
            "vto_image_url": vto_result.get("data", {}).get("vto_image_url")
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
            
            # ✨ PHASE 7: Preserve outfit_id if present
            if item.get("outfit_id"):
                enriched_item["outfit_id"] = item["outfit_id"]
                
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
            is_success = result.success if hasattr(result, "success") else result.get("success")
            if is_success:
                confidence = result.confidence if hasattr(result, "confidence") else result.get("confidence", 0.5)
                confidences.append(confidence)
        
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
