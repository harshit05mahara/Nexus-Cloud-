from pydantic import BaseModel, Field

class InstanceCreate(BaseModel):
    os_image: str = Field(default="ubuntu:latest", description="The OS image to provision")
    memory_limit: str = Field(default="512m", description="RAM limit (e.g., 512m, 1g)")
    name_prefix: str = Field(default="nx", description="Prefix for the instance ID")