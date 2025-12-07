# cove_ai_tools/http_client.py
"""
HTTP client for AI tools layer.

Provides a robust, reusable HTTP client with retry logic, timeouts, and error handling.
"""
import httpx
import logging
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .config import ToolsConfig

logger = logging.getLogger(__name__)


class ToolsHTTPError(Exception):
    """Base exception for HTTP errors in tools layer."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class ToolsHTTPClient:
    """
    Robust HTTP client for AI tools with automatic retries and error handling.
    
    Features:
    - Automatic retry on transient failures (5xx, network errors)
    - Configurable timeouts
    - Structured error responses
    - Request/response logging
    """
    
    def __init__(self):
        self.timeout = httpx.Timeout(ToolsConfig.HTTP_TIMEOUT)
        self.client = httpx.AsyncClient(timeout=self.timeout)
    
    @retry(
        stop=stop_after_attempt(ToolsConfig.MAX_RETRIES),
        wait=wait_exponential(multiplier=ToolsConfig.RETRY_BACKOFF, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True
    )
    async def post(
        self,
        url: str,
        json_data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Execute POST request with retry logic.
        
        Args:
            url: Target URL
            json_data: JSON payload
            headers: Optional HTTP headers
            
        Returns:
            Response JSON
            
        Raises:
            ToolsHTTPError: On HTTP errors or invalid responses
        """
        headers = headers or {}
        headers.setdefault("Content-Type", "application/json")
        
        logger.info(f"POST {url}", extra={"payload_keys": list(json_data.keys())})
        
        try:
            response = await self.client.post(url, json=json_data, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"POST {url} success", extra={"status": response.status_code})
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"POST {url} failed: {e.response.status_code}", exc_info=True)
            raise ToolsHTTPError(
                f"HTTP {e.response.status_code} error",
                status_code=e.response.status_code,
                response_data=e.response.text
            )
        except httpx.TimeoutException:
            logger.error(f"POST {url} timeout after {ToolsConfig.HTTP_TIMEOUT}s")
            raise ToolsHTTPError(f"Request timeout after {ToolsConfig.HTTP_TIMEOUT}s")
        except Exception as e:
            logger.exception(f"POST {url} unexpected error")
            raise ToolsHTTPError(f"Unexpected error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(ToolsConfig.MAX_RETRIES),
        wait=wait_exponential(multiplier=ToolsConfig.RETRY_BACKOFF, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True
    )
    async def get(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Execute GET request with retry logic.
        
        Args:
            url: Target URL
            params: Query parameters
            headers: Optional HTTP headers
            
        Returns:
            Response JSON
            
        Raises:
            ToolsHTTPError: On HTTP errors or invalid responses
        """
        headers = headers or {}
        params = params or {}
        
        logger.info(f"GET {url}", extra={"params": list(params.keys())})
        
        try:
            response = await self.client.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"GET {url} success", extra={"status": response.status_code})
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"GET {url} failed: {e.response.status_code}", exc_info=True)
            raise ToolsHTTPError(
                f"HTTP {e.response.status_code} error",
                status_code=e.response.status_code,
                response_data=e.response.text
            )
        except httpx.TimeoutException:
            logger.error(f"GET {url} timeout after {ToolsConfig.HTTP_TIMEOUT}s")
            raise ToolsHTTPError(f"Request timeout after {ToolsConfig.HTTP_TIMEOUT}s")
        except Exception as e:
            logger.exception(f"GET {url} unexpected error")
            raise ToolsHTTPError(f"Unexpected error: {str(e)}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Singleton instance
_http_client: Optional[ToolsHTTPClient] = None


def get_http_client() -> ToolsHTTPClient:
    """Get or create singleton HTTP client instance."""
    global _http_client
    if _http_client is None:
        _http_client = ToolsHTTPClient()
    return _http_client
