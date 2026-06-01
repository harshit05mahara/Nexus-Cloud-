from sqlalchemy import Column, String, DateTime, Float, Integer
from db.database import Base
from datetime import datetime, timezone
import uuid

class DatabaseModel(Base):
    __tablename__ = "databases"

    # Core Identifiers
    id = Column(String, primary_key=True, index=True, default=lambda: f"db-{uuid.uuid4().hex[:8]}")
    owner_id = Column(String, index=True, nullable=False)
    
    # Specification details
    name = Column(String, nullable=False, index=True)
    db_engine = Column(String, nullable=False) # postgresql, mysql, mongodb
    version = Column(String, nullable=False)
    region = Column(String, nullable=False)
    status = Column(String, default="running") # running, stopped
    ip_address = Column(String)
    cost_per_hour = Column(Float, default=10.0)
    size_gb = Column(Integer, default=20)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
