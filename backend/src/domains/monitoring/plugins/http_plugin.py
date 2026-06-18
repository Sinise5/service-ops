import httpx
import time
from ..plugin_interface import MonitorPlugin, CheckResult


class HttpPlugin(MonitorPlugin):
    async def execute(self, config: dict) -> CheckResult:
        url = config.get('url')
        method = config.get('method', 'GET')
        expected_status = config.get('expected_status', 200)
        timeout = config.get('timeout', 10)
        
        if not url:
            return CheckResult(status='failure', error_message='URL not specified')
        
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(method, url)
                response_time = (time.time() - start) * 1000
                
                status = 'success' if response.status_code == expected_status else 'failure'
                return CheckResult(
                    status=status,
                    response_time_ms=response_time,
                    output=f"HTTP {response.status_code}"
                )
        except Exception as e:
            response_time = (time.time() - start) * 1000
            return CheckResult(
                status='failure',
                response_time_ms=response_time,
                error_message=str(e)
            )
    
    def validate_config(self, config: dict) -> bool:
        return 'url' in config
