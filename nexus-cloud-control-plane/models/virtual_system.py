from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from db.database import Base
from datetime import datetime, timezone
import uuid

class VirtualSystemModel(Base):
    __tablename__ = "virtual_systems"

    # Core Identifiers
    id = Column(String, primary_key=True, index=True, default=lambda: f"vsys-{uuid.uuid4().hex[:8]}")
    instance_id = Column(String, ForeignKey("instances.id"), index=True, nullable=False)
    
    # Configuration Details
    name = Column(String, index=True, nullable=False)
    system_type = Column(String, nullable=False) # e.g. Container, Database, Cache, Proxy
    image = Column(String, nullable=False)        # e.g. nginx:alpine, postgres:15-alpine
    port_mapping = Column(String, nullable=True) # e.g. 80:80, 5432:5432
    status = Column(String, default="running")   # running, stopped
    
    # Telemetry
    cpu_usage = Column(Float, default=0.0)
    memory_usage = Column(Float, default=0.0)
    
    # Timestamp
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
