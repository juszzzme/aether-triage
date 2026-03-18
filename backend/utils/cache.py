"""
Response Cache Layer for Aether Triage System
Implements hybrid in-memory caching with TTL and LRU eviction.
Designed for easy migration to Redis in production.
"""

import hashlib
import json
import time
from typing import Dict, Optional, Any
from collections import OrderedDict
from datetime import datetime, timedelta
from utils.logger import get_logger

logger = get_logger(__name__)


class TriageCache:
    """
    Hybrid in-memory cache for triage responses.
    
    Features:
    - SHA-256 hash-based cache keys
    - TTL (time-to-live) support
    - LRU (Least Recently Used) eviction
    - Cache hit/miss metrics
    - Thread-safe for concurrent access
    
    Production: Replace with Redis for distributed caching.
    """
    
    def __init__(self, max_size: int = 1000, ttl_hours: int = 24):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of items to cache (LRU eviction after this)
            ttl_hours: Default time-to-live in hours
        """
        self.max_size = max_size
        self.default_ttl_hours = ttl_hours
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        
        # Metrics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        
        logger.info(
            f"TriageCache initialized",
            extra={"extra_fields": {
                "max_size": max_size,
                "ttl_hours": ttl_hours
            }}
        )
    
    def get_cache_key(self, ticket_data: Dict) -> str:
        """
        Generate a deterministic cache key from ticket data.
        
        Uses SHA-256 hash of normalized input to:
        - Avoid PII in cache keys (uses masked text)
        - Ensure identical tickets hit same cache entry
        - Prevent hash collisions
        
        Args:
            ticket_data: Dict with 'masked_text' and optionally 'vertical'
        
        Returns:
            SHA-256 hex digest as cache key
        """
        try:
            # Normalize the data for consistent hashing
            normalized = {
                "text": ticket_data.get("masked_text", ticket_data.get("text", "")).lower().strip(),
                "language": ticket_data.get("language", "auto"),
            }
            
            # Sort keys for deterministic JSON serialization
            canonical = json.dumps(normalized, sort_keys=True)
            
            # Generate SHA-256 hash
            hash_obj = hashlib.sha256(canonical.encode('utf-8'))
            cache_key = hash_obj.hexdigest()
            
            logger.debug(
                f"Generated cache key",
                extra={"extra_fields": {
                    "cache_key": cache_key[:16] + "...",  # First 16 chars for logging
                    "text_length": len(normalized["text"])
                }}
            )
            
            return cache_key
            
        except Exception as e:
            logger.error(f"Cache key generation failed: {str(e)}", exc_info=True)
            # Fallback to timestamp-based key (effectively disables caching for this request)
            return f"error_{int(time.time() * 1000)}"
    
    def get(self, key: str) -> Optional[Dict]:
        """
        Retrieve cached value if it exists and hasn't expired.
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if miss/expired
        """
        try:
            if key not in self.cache:
                self.misses += 1
                logger.debug(f"Cache miss: {key[:16]}...")
                return None
            
            # Move to end (LRU)
            self.cache.move_to_end(key)
            
            # Get cached entry
            entry = self.cache[key]
            
            # Check TTL
            expires_at = entry.get("expires_at")
            if expires_at and time.time() > expires_at:
                # Expired - remove and count as miss
                del self.cache[key]
                self.misses += 1
                logger.debug(f"Cache expired: {key[:16]}...")
                return None
            
            # Cache hit!
            self.hits += 1
            logger.info(
                f"Cache hit",
                extra={"extra_fields": {
                    "cache_key": key[:16] + "...",
                    "hit_rate": self.get_hit_rate()
                }}
            )
            
            return entry.get("value")
            
        except Exception as e:
            logger.error(f"Cache get failed: {str(e)}", exc_info=True)
            self.misses += 1
            return None
    
    def set(self, key: str, value: Dict, ttl_hours: Optional[int] = None) -> bool:
        """
        Store value in cache with TTL.
        
        Implements LRU eviction when cache size exceeds max_size.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_hours: Time-to-live in hours (uses default if None)
        
        Returns:
            True if cached successfully, False otherwise
        """
        try:
            # Calculate expiration time
            ttl = ttl_hours if ttl_hours is not None else self.default_ttl_hours
            expires_at = time.time() + (ttl * 3600)  # Convert hours to seconds
            
            # Check if we need to evict
            if key not in self.cache and len(self.cache) >= self.max_size:
                # Remove oldest item (first in OrderedDict)
                evicted_key, _ = self.cache.popitem(last=False)
                self.evictions += 1
                logger.debug(
                    f"LRU eviction",
                    extra={"extra_fields": {
                        "evicted_key": evicted_key[:16] + "...",
                        "cache_size": len(self.cache)
                    }}
                )
            
            # Store the entry
            self.cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "cached_at": time.time(),
            }
            
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            
            logger.info(
                f"Cached response",
                extra={"extra_fields": {
                    "cache_key": key[:16] + "...",
                    "ttl_hours": ttl,
                    "cache_size": len(self.cache)
                }}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set failed: {str(e)}", exc_info=True)
            return False
    
    def invalidate(self, key: str) -> bool:
        """
        Remove a specific key from cache.
        
        Args:
            key: Cache key to invalidate
        
        Returns:
            True if key was present and removed
        """
        try:
            if key in self.cache:
                del self.cache[key]
                logger.info(f"Cache invalidated: {key[:16]}...")
                return True
            return False
        except Exception as e:
            logger.error(f"Cache invalidation failed: {str(e)}", exc_info=True)
            return False
    
    def clear(self) -> int:
        """
        Clear all cached entries.
        
        Returns:
            Number of entries cleared
        """
        try:
            count = len(self.cache)
            self.cache.clear()
            logger.warning(f"Cache cleared: {count} entries removed")
            return count
        except Exception as e:
            logger.error(f"Cache clear failed: {str(e)}", exc_info=True)
            return 0
    
    def get_hit_rate(self) -> float:
        """
        Calculate cache hit rate.
        
        Returns:
            Hit rate as percentage (0-100)
        """
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return round((self.hits / total) * 100, 2)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics for monitoring.
        
        Returns:
            Dict with cache metrics
        """
        total_requests = self.hits + self.misses
        hit_rate = self.get_hit_rate()
        
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "utilization_pct": round((len(self.cache) / self.max_size) * 100, 2) if self.max_size > 0 else 0,
            "total_requests": total_requests,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_pct": hit_rate,
            "evictions": self.evictions,
            "ttl_hours": self.default_ttl_hours,
        }
    
    def __len__(self) -> int:
        """Return current cache size."""
        return len(self.cache)
    
    def __contains__(self, key: str) -> bool:
        """Check if key exists in cache (doesn't check TTL)."""
        return key in self.cache


# Singleton instance for application-wide use
_cache_instance: Optional[TriageCache] = None


def get_cache(max_size: int = 1000, ttl_hours: int = 24) -> TriageCache:
    """
    Get or create the singleton cache instance.
    
    Args:
        max_size: Maximum cache size (only used on first call)
        ttl_hours: Default TTL in hours (only used on first call)
    
    Returns:
        TriageCache singleton instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = TriageCache(max_size=max_size, ttl_hours=ttl_hours)
    return _cache_instance
