from .plugins.ping_plugin import PingPlugin
from .plugins.http_plugin import HttpPlugin
from .plugins.ssl_plugin import SslPlugin


class PluginRegistry:
    def __init__(self):
        self.plugins = {
            'ping': PingPlugin(),
            'http': HttpPlugin(),
            'ssl': SslPlugin(),
        }
    
    def get_plugin(self, check_type: str):
        plugin = self.plugins.get(check_type)
        if not plugin:
            raise ValueError(f"Unknown check type: {check_type}")
        return plugin


registry = PluginRegistry()
