from sqlalchemy import Column, String, Integer, DateTime
from db.database import Base
from datetime import datetime, timezone
import uuid

class UserModel(Base):
    __tablename__ = "users"

    # User Identity
    id = Column(String, primary_key=True, index=True, default=lambda: uuid.uuid4().hex)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Nexus Cloud Economy
    wallet_balance = Column(Integer, default=10000)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))