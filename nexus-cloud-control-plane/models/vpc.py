from sqlalchemy import Column, String, DateTime
from db.database import Base
from datetime import datetime, timezone
import uuid

class VPCModel(Base):
    __tablename__ = "vpcs"

    # Core Identifiers
    id = Column(String, primary_key=True, index=True, default=lambda: f"vpc-{uuid.uuid4().hex[:8]}")
    owner_id = Column(String, index=True, nullable=False)
    
    # Specification details
    name = Column(String, nullable=False, index=True)
    cidr_block = Column(String, nullable=False) # e.g. "10.0.0.0/16"
    region = Column(String, nullable=False)
    status = Column(String, default="available") # available
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
