import subprocess
import re
import time
from ..plugin_interface import MonitorPlugin, CheckResult


class PingPlugin(MonitorPlugin):
    async def execute(self, config: dict) -> CheckResult:
        host = config.get('host')
        count = config.get('count', 4)
        timeout = config.get('timeout', 5)
        
        if not host:
            return CheckResult(status='failure', error_message='Host not specified')
        
        start = time.time()
        try:
            result = subprocess.run(
                ['ping', '-c', str(count), '-W', str(timeout), host],
                capture_output=True,
                text=True,
                timeout=timeout + 5
            )
            response_time = (time.time() - start) * 1000
            
            if result.returncode == 0:
                loss_match = re.search(r'(\d+(?:\.\d+)?)\% packet loss', result.stdout)
                loss = float(loss_match.group(1)) if loss_match else 0
                status = 'success' if loss == 0 else 'warning'
                return CheckResult(
                    status=status,
                    response_time_ms=response_time,
                    output=f"Loss: {loss}%"
                )
            else:
                return CheckResult(
                    status='failure',
                    response_time_ms=response_time,
                    output=result.stdout[:200]
                )
        except Exception as e:
            return CheckResult(status='failure', error_message=str(e))
    
    def validate_config(self, config: dict) -> bool:
        return 'host' in config
