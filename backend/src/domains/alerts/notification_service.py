import aiohttp
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.session = None

    async def send(self, channel_type: str, config: dict, message: str, title: str = "Alert"):
        """Route notification to appropriate channel"""
        try:
            if channel_type == "telegram":
                await self._send_telegram(config, message, title)
            elif channel_type == "discord":
                await self._send_discord(config, message, title)
            elif channel_type == "email":
                await self._send_email(config, message, title)
            elif channel_type == "webhook":
                await self._send_webhook(config, message, title)
            else:
                logger.warning(f"Unknown notification type: {channel_type}")
        except Exception as e:
            logger.error(f"Notification send failed ({channel_type}): {e}")

    async def _send_telegram(self, config: dict, message: str, title: str):
        """Send via Telegram Bot API"""
        bot_token = config.get("bot_token")
        chat_id = config.get("chat_id")
        
        if not bot_token or not chat_id:
            logger.error("Telegram: missing bot_token or chat_id")
            return
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": f"🚨 {title}\n\n{message}",
            "parse_mode": "HTML"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                if resp.status != 200:
                    logger.error(f"Telegram error: {await resp.text()}")

    async def _send_discord(self, config: dict, message: str, title: str):
        """Send via Discord Webhook"""
        webhook_url = config.get("webhook_url")
        
        if not webhook_url:
            logger.error("Discord: missing webhook_url")
            return
        
        payload = {
            "embeds": [{
                "title": title,
                "description": message,
                "color": 15158332,
                "footer": {"text": "ServiceOps Alert"}
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as resp:
                if resp.status not in [200, 204]:
                    logger.error(f"Discord error: {await resp.text()}")

    async def _send_email(self, config: dict, message: str, title: str):
        """Send via SMTP Email"""
        smtp_host = config.get("smtp_host")
        smtp_port = config.get("smtp_port", 587)
        sender = config.get("sender_email")
        password = config.get("sender_password")
        recipient = config.get("recipient_email")
        
        if not all([smtp_host, sender, password, recipient]):
            logger.error("Email: missing required config")
            return
        
        try:
            msg = MIMEMultipart()
            msg["From"] = sender
            msg["To"] = recipient
            msg["Subject"] = f"[Alert] {title}"
            msg.attach(MIMEText(message, "plain"))
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(sender, password)
                server.send_message(msg)
            
            logger.info(f"Email sent to {recipient}")
        except Exception as e:
            logger.error(f"Email send failed: {e}")

    async def _send_webhook(self, config: dict, message: str, title: str):
        """Send via generic HTTP webhook"""
        webhook_url = config.get("webhook_url")
        
        if not webhook_url:
            logger.error("Webhook: missing webhook_url")
            return
        
        payload = {
            "title": title,
            "message": message,
            "timestamp": str(json.dumps({}))
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as resp:
                if resp.status not in [200, 201]:
                    logger.error(f"Webhook error: {await resp.text()}")


notification_service = NotificationService()
