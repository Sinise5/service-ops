from typing import Dict, Any
from .adapters.telegram import TelegramAdapter
from .adapters.discord import DiscordAdapter
from .adapters.email import EmailAdapter
from .adapters.webhook import WebhookAdapter


class NotificationAdapterFactory:
    """Factory for creating notification adapters by type"""
    
    ADAPTERS = {
        "telegram": TelegramAdapter,
        "discord": DiscordAdapter,
        "email": EmailAdapter,
        "webhook": WebhookAdapter,
    }
    
    @classmethod
    def create(cls, channel_type: str, config: Dict[str, Any]):
        """
        Create adapter instance by channel type
        
        Args:
            channel_type: Type of channel (telegram, discord, email, webhook)
            config: Channel configuration dict
        
        Returns:
            Adapter instance
        
        Raises:
            ValueError: If channel_type not supported
        """
        if channel_type not in cls.ADAPTERS:
            raise ValueError(f"Unsupported channel type: {channel_type}. Supported: {list(cls.ADAPTERS.keys())}")
        
        adapter_class = cls.ADAPTERS[channel_type]
        return adapter_class(config)
    
    @classmethod
    def get_supported_types(cls) -> list[str]:
        """Get list of supported notification channel types"""
        return list(cls.ADAPTERS.keys())
