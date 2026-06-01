from sqlalchemy import Column, String, Float
from db.database import Base

class InstanceModel(Base):
    __tablename__ = "instances"

    # Core Identity
    id = Column(String, primary_key=True, index=True)
    
    # Ownership Link
    owner_id = Column(String, index=True)
    
    # Instance Specs
    name = Column(String, index=True)
    instance_type = Column(String) # <--- THIS MUST BE instance_type
    status = Column(String, default="running")
    ip_address = Column(String)
    cost_per_hour = Column(Float)