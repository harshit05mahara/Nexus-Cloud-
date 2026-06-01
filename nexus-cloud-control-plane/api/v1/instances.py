from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import random
from jose import jwt
from api.v1.auth import SECRET_KEY, ALGORITHM

# Import your database session and models
from db.database import SessionLocal
from models.instance import InstanceModel
from models.user import UserModel
from models.virtual_system import VirtualSystemModel

router = APIRouter()

# -----------------------------------------
# SECURITY PROTOCOLS (JWT)
# -----------------------------------------
# This tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# The Security Guard Function
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Decodes the JWT token to find the authenticated user.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Subject missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# -----------------------------------------
# PYDANTIC SCHEMAS
# -----------------------------------------
class DeployRequest(BaseModel):
    name: str
    instance_type: str
    region: str

# -----------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------
def generate_public_ip():
    return f"{random.randint(3, 200)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

def get_cost_rate(instance_type: str):
    rates = {"t3.medium": 4, "c5.xlarge": 12, "g4dn.xlarge": 35}
    return rates.get(instance_type, 10)

# -----------------------------------------
# SECURED API ROUTES
# -----------------------------------------
@router.get("/")
def get_active_instances(
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user) # <-- SECURED
):
    """Fetches ONLY the running servers owned by the authenticated user"""
    instances = db.query(InstanceModel).filter(InstanceModel.owner_id == current_user.id).all()
    return {"status": "success", "data": instances}


@router.post("/deploy")
def deploy_new_instance(
    request: DeployRequest, 
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user) # <-- SECURED
):
    """Mints a new server and attaches it strictly to the authenticated user"""
    
    server_id = f"nx-{str(uuid.uuid4())[:8]}"
    assigned_ip = generate_public_ip()
    hourly_cost = get_cost_rate(request.instance_type)

    new_instance = InstanceModel(
        id=server_id,
        name=request.name,
        instance_type=request.instance_type,
        ip_address=assigned_ip,
        status="running",
        cost_per_hour=hourly_cost,
        owner_id=current_user.id # <-- Attaches the server to this exact user
    )

    db.add(new_instance)
    db.commit()
    db.refresh(new_instance)

    return {"message": "Instance Deployment Initiated", "server": new_instance}

# -----------------------------------------
# LIFECYCLE CONTROLS (NEW)
# -----------------------------------------
@router.put("/{instance_id}/toggle")
def toggle_instance_power(
    instance_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Toggles node state between 'running' and 'stopped' to halt token usage"""
    # Find the specific instance ensuring it belongs to the authenticated user
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()

    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")

    # Flip the execution state
    if instance.status == "running":
        instance.status = "stopped"
    else:
        instance.status = "running"

    db.commit()
    db.refresh(instance)
    
    print(f"[COMPUTE] Instance {instance_id} state altered to: {instance.status}")
    return {"status": "success", "message": f"Node state mutated to {instance.status}", "data": instance}


@router.delete("/{instance_id}")
def terminate_instance(
    instance_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Completely purges an instance from the infrastructure grid"""
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()

    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")

    db.delete(instance)
    db.commit()
    
    print(f"[COMPUTE] Purge protocol completed for node: {instance_id}")
    return {"status": "success", "message": "Node successfully terminated from infrastructure pool."}

# -----------------------------------------
# NESTED VIRTUAL SYSTEMS CONTROLS (NEW)
# -----------------------------------------
class VirtualSystemDeployRequest(BaseModel):
    name: str
    system_type: str
    image: str
    port_mapping: str = None

@router.get("/{instance_id}/virtual-systems")
def get_nested_virtual_systems(
    instance_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Fetches all virtual systems running inside a specific compute node"""
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")
        
    vsystems = db.query(VirtualSystemModel).filter(VirtualSystemModel.instance_id == instance_id).all()
    
    # Slight dynamic simulation check for telemetry on read
    for vs in vsystems:
        if vs.status == "running":
            vs.cpu_usage = round(random.uniform(0.5, 12.0), 1)
            base_mem = 128.0
            if "postgres" in vs.image: base_mem = 256.0
            elif "redis" in vs.image: base_mem = 32.0
            elif "nginx" in vs.image: base_mem = 64.0
            vs.memory_usage = round(base_mem + random.uniform(-1.5, 2.5), 1)
        else:
            vs.cpu_usage = 0.0
            vs.memory_usage = 0.0
            
    return {"status": "success", "data": vsystems}

@router.post("/{instance_id}/virtual-systems")
def deploy_nested_virtual_system(
    instance_id: str,
    request: VirtualSystemDeployRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Deploys a nested virtual system/container inside a running compute node"""
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")
        
    if instance.status != "running":
        raise HTTPException(status_code=400, detail="Cannot deploy virtual systems on an offline instance.")

    base_mem = 128.0
    if "postgres" in request.image: base_mem = 256.0
    elif "redis" in request.image: base_mem = 32.0
    elif "nginx" in request.image: base_mem = 64.0
    
    new_vsys = VirtualSystemModel(
        id=f"vsys-{str(uuid.uuid4())[:8]}",
        instance_id=instance_id,
        name=request.name,
        system_type=request.system_type,
        image=request.image,
        port_mapping=request.port_mapping,
        status="running",
        cpu_usage=round(random.uniform(1.0, 5.0), 1),
        memory_usage=base_mem
    )
    
    db.add(new_vsys)
    db.commit()
    db.refresh(new_vsys)
    
    print(f"[CONTAINER] Provisioned virtual system {new_vsys.id} inside instance {instance_id}")
    return {"status": "success", "message": "Virtual system successfully provisioned.", "data": new_vsys}

@router.put("/{instance_id}/virtual-systems/{vsys_id}/toggle")
def toggle_nested_virtual_system(
    instance_id: str,
    vsys_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Starts or stops a nested virtual system"""
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")

    vsys = db.query(VirtualSystemModel).filter(
        VirtualSystemModel.id == vsys_id,
        VirtualSystemModel.instance_id == instance_id
    ).first()
    if not vsys:
        raise HTTPException(status_code=404, detail="Virtual system target not found.")
        
    if vsys.status == "running":
        vsys.status = "stopped"
    else:
        if instance.status != "running":
            raise HTTPException(status_code=400, detail="Cannot start virtual systems on an offline instance.")
        vsys.status = "running"
        
    db.commit()
    db.refresh(vsys)
    
    print(f"[CONTAINER] State of virtual system {vsys_id} altered to: {vsys.status}")
    return {"status": "success", "message": f"Virtual system state mutated to {vsys.status}", "data": vsys}

@router.delete("/{instance_id}/virtual-systems/{vsys_id}")
def terminate_nested_virtual_system(
    instance_id: str,
    vsys_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Deletes/purges a nested virtual system"""
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == current_user.id
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Compute node target not found.")

    vsys = db.query(VirtualSystemModel).filter(
        VirtualSystemModel.id == vsys_id,
        VirtualSystemModel.instance_id == instance_id
    ).first()
    if not vsys:
        raise HTTPException(status_code=404, detail="Virtual system target not found.")
        
    db.delete(vsys)
    db.commit()
    
    print(f"[CONTAINER] Purge completed for virtual system: {vsys_id}")
    return {"status": "success", "message": "Virtual system successfully deleted."}