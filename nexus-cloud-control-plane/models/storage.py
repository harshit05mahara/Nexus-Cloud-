from sqlalchemy import Column, String, DateTime, Integer
from db.database import Base
from datetime import datetime, timezone
import uuid

class StorageBucketModel(Base):
    __tablename__ = "storage_buckets"

    # Core Identifiers
    id = Column(String, primary_key=True, index=True, default=lambda: f"bucket-{uuid.uuid4().hex[:8]}")
    owner_id = Column(String, index=True, nullable=False)
    
    # Specification details
    name = Column(String, nullable=False, unique=True, index=True)
    storage_class = Column(String, default="STANDARD") # STANDARD, COLD, ARCHIVE
    region = Column(String, nullable=False)
    size_gb = Column(Integer, default=0) # simulated object size in GB
    status = Column(String, default="active") # active
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
