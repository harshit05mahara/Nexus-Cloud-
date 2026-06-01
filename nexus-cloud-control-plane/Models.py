from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
# Assuming you have a Base defined in a database.py file somewhere like:
# from database import Base 

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # New Feature: The Token Wallet
    wallet_balance = Column(Integer, default=10000)
    
    # Relationship to link users to their servers
    instances = relationship("Instance", back_populates="owner")

class Instance(Base):
    __tablename__ = "instances"

    # E.g., 'nx-prod-01'
    id = Column(String, primary key=True, index=True) 
    
    # Links this server to a specific user
    owner_id = Column(Integer, ForeignKey("users.id")) 
    
    name = Column(String)
    instance_type = Column(String) # E.g., 'c5.xlarge'
    ip_address = Column(String)
    status = Column(String, default="running") # 'running' or 'stopped'
    cost_per_hour = Column(Integer) # How many tokens it drains per hour

    owner = relationship("User", back_populates="instances")