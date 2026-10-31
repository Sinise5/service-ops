from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "ServiceOps"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8080

    # Database
    database_url: str = "postgresql://postgres:***@localhost:5432/serviceops_dev"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Vulnerability feed
    nvd_api_key: str = ""
    vulnerability_feed_interval_seconds: int = 300
    kev_refresh_interval_seconds: int = 3600


settings = Settings()
