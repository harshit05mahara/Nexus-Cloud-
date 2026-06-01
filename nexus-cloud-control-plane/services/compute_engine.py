import docker
import uuid

class ComputeEngine:
    def __init__(self):
        try:
            # Connects to the local Docker daemon
            self.client = docker.from_env()
        except Exception as e:
            print(f"CRITICAL: Failed to connect to hypervisor: {e}")
            self.client = None

    def provision_instance(self, os_image: str, memory_limit: str, prefix: str = "nx"):
        if not self.client:
            raise RuntimeError("Hypervisor engine is offline.")
        
        # Generate an AWS-style instance ID (e.g., nx-a1b2c3d4)
        instance_id = f"{prefix}-{uuid.uuid4().hex[:8]}"
        
        try:
            # Command the hypervisor to carve out the isolated environment
            container = self.client.containers.run(
                image=os_image,
                name=instance_id,
                mem_limit=memory_limit,
                detach=True,       # Run in the background
                tty=True           # Keep the shell alive
            )
            return {
                "instance_id": instance_id,
                "status": "provisioned and running",
                "os": os_image,
                "memory": memory_limit
            }
        except docker.errors.ImageNotFound:
            raise ValueError(f"OS Image '{os_image}' not found locally.")
        except Exception as e:
            raise RuntimeError(f"Provisioning failed: {str(e)}")
    
    def list_instances(self, prefix: str = "nx"):
        if not self.client:
            raise RuntimeError("Hypervisor engine is offline.")
        
        # Fetch all instances managed by Nexus Cloud
        containers = self.client.containers.list(all=True)
        instances = []
        for c in containers:
            if c.name.startswith(f"{prefix}-"):
                instances.append({
                    "instance_id": c.name,
                    "status": c.status,
                    "image": c.image.tags[0] if c.image.tags else "unknown"
                })
        return instances

    def terminate_instance(self, instance_id: str):
        if not self.client:
            raise RuntimeError("Hypervisor engine is offline.")
        
        try:
            # Find the specific virtual machine
            container = self.client.containers.get(instance_id)
            
            # Stop the OS gracefully (give it 5 seconds to shut down processes)
            container.stop(timeout=5)
            
            # Completely destroy the container and wipe its virtual drive
            container.remove()
            
            return {
                "instance_id": instance_id,
                "status": "terminated and destroyed"
            }
        except docker.errors.NotFound:
            raise ValueError(f"Instance '{instance_id}' does not exist.")
        except Exception as e:
            raise RuntimeError(f"Failed to terminate instance: {str(e)}")