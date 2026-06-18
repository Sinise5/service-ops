import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from uuid import UUID


class EmailAdapter:
    """SMTP Email notification adapter"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Email adapter
        
        Config format:
        {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_user": "alerts@example.com",
            "smtp_password": "your-app-password",
            "from_email": "alerts@example.com",
            "from_name": "ServiceOps Alerts",
            "to_emails": ["oncall@example.com"]
        }
        """
        self.smtp_host = config.get("smtp_host")
        self.smtp_port = config.get("smtp_port", 587)
        self.smtp_user = config.get("smtp_user")
        self.smtp_password = config.get("smtp_password")
        self.from_email = config.get("from_email", self.smtp_user)
        self.from_name = config.get("from_name", "ServiceOps")
        self.to_emails = config.get("to_emails", [])
        
        if not self.smtp_host:
            raise ValueError("smtp_host is required in Email config")
        if not self.smtp_user:
            raise ValueError("smtp_user is required in Email config")
        if not self.smtp_password:
            raise ValueError("smtp_password is required in Email config")
        if not self.to_emails:
            raise ValueError("to_emails is required in Email config")
    
    async def send(self, message: str, incident_id: Optional[UUID] = None, subject: Optional[str] = None) -> Dict[str, Any]:
        """
        Send notification via SMTP email
        
        Args:
            message: Message text to send
            incident_id: Optional incident ID for context
            subject: Email subject (default: "ServiceOps Alert")
        
        Returns:
            Dict with status, response, and optional error
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject or "ServiceOps Alert"
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ", ".join(self.to_emails)
            
            # Plain text version
            text_part = MIMEText(message, 'plain')
            msg.attach(text_part)
            
            # HTML version (wrap in basic template)
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <pre style="white-space: pre-wrap; word-wrap: break-word;">{message}</pre>
                </div>
              </body>
            </html>
            """
            html_part = MIMEText(html_message, 'html')
            msg.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
                timeout=10.0
            )
            
            return {
                "status": "sent",
                "response": {
                    "to": self.to_emails,
                    "subject": msg['Subject']
                },
                "error_message": None
            }
        
        except aiosmtplib.SMTPException as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"SMTP error: {str(e)}"
            }
        
        except TimeoutError as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"SMTP timeout: {str(e)}"
            }
        
        except Exception as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Unexpected error: {str(e)}"
            }
    
    def format_alert_message(self, alert_data: Dict[str, Any]) -> tuple[str, str]:
        """
        Format alert data into email message
        
        Args:
            alert_data: Dict containing alert information
        
        Returns:
            Tuple of (subject, message)
        """
        severity = alert_data.get("severity", "unknown").upper()
        
        subject = f"[{severity}] ServiceOps Alert: {alert_data.get('message', 'No message')}"
        
        lines = [
            f"SEVERITY: {severity}",
            f"MESSAGE: {alert_data.get('message', 'No message')}",
            "",
        ]
        
        if alert_data.get("asset_name"):
            lines.append(f"ASSET: {alert_data['asset_name']}")
        
        if alert_data.get("rule_name"):
            lines.append(f"RULE: {alert_data['rule_name']}")
        
        if alert_data.get("check_name"):
            lines.append(f"CHECK: {alert_data['check_name']}")
        
        if alert_data.get("incident_id"):
            lines.append(f"INCIDENT ID: {alert_data['incident_id']}")
        
        lines.append("")
        lines.append("---")
        lines.append("This is an automated alert from ServiceOps.")
        
        message = "\n".join(lines)
        
        return subject, message
