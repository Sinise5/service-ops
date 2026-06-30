from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ─────────────────────────────────────────────
# Docker Host
# ─────────────────────────────────────────────
class DockerHostCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    host: str = Field(..., min_length=1)
    port: int = Field(default=22, ge=1, le=65535)
    username: str = Field(..., min_length=1)
    auth_type: str = Field(default="password")  # "password" | "key"
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    ssh_key_passphrase: Optional[str] = None
    default_path: str = Field(default="/opt/docker")
    tags: list[str] = Field(default_factory=list)
    docker_context: Optional[str] = None  # docker context name, None = default


class DockerHostUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    auth_type: Optional[str] = None
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    ssh_key_passphrase: Optional[str] = None
    default_path: Optional[str] = None
    tags: Optional[list[str]] = None
    docker_context: Optional[str] = None
    is_active: Optional[bool] = None


class DockerHostResponse(BaseModel):
    id: str
    name: str
    host: str
    port: int
    username: str
    auth_type: str
    default_path: str
    tags: list[str]
    docker_context: Optional[str]
    is_active: bool
    last_connected_at: Optional[str]
    created_at: str
    updated_at: str
    # Status (not stored, computed on-the-fly)
    connection_status: Optional[str] = None  # "online" | "offline" | "unknown"


# ─────────────────────────────────────────────
# Container
# ─────────────────────────────────────────────
class ContainerInfo(BaseModel):
    container_id: str
    name: str
    image: str
    status: str  # running, exited, paused, created
    state: str
    created: str
    ports: list[str] = Field(default_factory=list)
    labels: dict[str, str] = Field(default_factory=dict)


class ContainerStats(BaseModel):
    container_id: str
    name: str
    cpu_percent: float
    mem_usage: str  # e.g. "123.4MiB / 512MiB"
    mem_percent: float
    net_io: str  # e.g. "1.2MB / 3.4MB"
    block_io: str  # e.g. "10MB / 20MB"
    pids: int


class ContainerInspect(BaseModel):
    container_id: str
    name: str
    image: str
    image_id: str
    created: str
    state: dict
    config: dict
    network_settings: dict
    mounts: list[dict]
    host_config: dict
    inspect_raw: dict  # Full docker inspect JSON


# ─────────────────────────────────────────────
# Image
# ─────────────────────────────────────────────
class ImageInfo(BaseModel):
    repository: str
    tag: str
    image_id: str
    created: str
    size: str


# ─────────────────────────────────────────────
# Volume
# ─────────────────────────────────────────────
class VolumeInfo(BaseModel):
    name: str
    driver: str
    mountpoint: str
    scope: str
    labels: dict[str, str] = Field(default_factory=dict)


# ─────────────────────────────────────────────
# Docker Compose
# ─────────────────────────────────────────────
class ComposeProjectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    path: str = Field(..., min_length=1)


class ComposeProjectResponse(BaseModel):
    id: str
    host_id: str
    name: str
    path: str
    services: list[str]
    is_active: bool
    status: Optional[str] = None  # running, stopped, unknown


# ─────────────────────────────────────────────
# Deploy
# ─────────────────────────────────────────────
class PortMapping(BaseModel):
    host_port: int
    container_port: int
    protocol: str = Field(default="tcp")


class EnvVar(BaseModel):
    key: str
    value: str


class VolumeMount(BaseModel):
    host_path: str
    container_path: str
    read_only: bool = False


class DeployRequest(BaseModel):
    image: str = Field(..., min_length=1)
    container_name: str = Field(..., min_length=1)
    ports: list[PortMapping] = Field(default_factory=list)
    envs: list[EnvVar] = Field(default_factory=list)
    volumes: list[VolumeMount] = Field(default_factory=list)
    restart_policy: str = Field(default="no")  # no, always, unless-stopped, on-failure
    privileged: bool = False
    tty: bool = False
    command: Optional[str] = None
    workdir: Optional[str] = None
    network: Optional[str] = None  # network name


# ─────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────
class DeployTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    image: str = Field(..., min_length=1)
    default_ports: list[PortMapping] = Field(default_factory=list)
    default_envs: list[EnvVar] = Field(default_factory=list)
    default_volumes: list[VolumeMount] = Field(default_factory=list)
    restart_policy: str = Field(default="no")
    is_system: bool = False  # system templates can't be deleted by users


class DeployTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    image: str
    default_ports: list[PortMapping]
    default_envs: list[EnvVar]
    default_volumes: list[VolumeMount]
    restart_policy: str
    is_system: bool
    created_at: str


# ─────────────────────────────────────────────
# Logs (DB retention)
# ─────────────────────────────────────────────
class ContainerLogCreate(BaseModel):
    host_id: str
    container_id: str
    container_name: str
    content: str
    stream: str = "stdout"  # stdout | stderr
    timestamp: Optional[str] = None
    save_to_db: bool = True


class ContainerLogResponse(BaseModel):
    id: str
    host_id: str
    container_id: str
    container_name: str
    content: str
    stream: str
    timestamp: Optional[str]
    created_at: str
