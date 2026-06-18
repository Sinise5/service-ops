import ssl
import socket
from datetime import datetime
from ..plugin_interface import MonitorPlugin, CheckResult


class SslPlugin(MonitorPlugin):
    async def execute(self, config: dict) -> CheckResult:
        host = config.get('host')
        port = config.get('port', 443)
        warning_days = config.get('warning_days', 30)
        
        if not host:
            return CheckResult(status='failure', error_message='Host not specified')
        
        try:
            context = ssl.create_default_context()
            with socket.create_connection((host, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()
                    expiry_str = cert.get('notAfter')
                    expiry = datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (expiry - datetime.now()).days
                    
                    if days_until_expiry < 0:
                        status = 'failure'
                    elif days_until_expiry < warning_days:
                        status = 'warning'
                    else:
                        status = 'success'
                    
                    return CheckResult(
                        status=status,
                        output=f"Expires in {days_until_expiry} days"
                    )
        except Exception as e:
            return CheckResult(status='failure', error_message=str(e))
    
    def validate_config(self, config: dict) -> bool:
        return 'host' in config
