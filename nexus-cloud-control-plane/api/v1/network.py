from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
from jose import jwt
from api.v1.auth import SECRET_KEY, ALGORITHM

# Database Session & Models
from db.database import SessionLocal
from models.user import UserModel
from models.vpc import VPCModel

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

class VPCDeployRequest(BaseModel):
    name: str
    cidr_block: str
    region: str

@router.get("/")
def get_user_vpcs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Fetches all virtual private networks owned by the authenticated operative"""
    vpcs = db.query(VPCModel).filter(VPCModel.owner_id == current_user.id).all()
    return {"status": "success", "data": vpcs}

@router.post("/deploy")
def deploy_new_vpc(
    request: VPCDeployRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Provisions a new virtual private network partition"""
    vpc_id = f"vpc-{str(uuid.uuid4())[:8]}"
    
    # Optional Validation of CIDR Format Simple Check
    if "/" not in request.cidr_block:
        raise HTTPException(status_code=400, detail="Invalid CIDR block format.")

    new_vpc = VPCModel(
        id=vpc_id,
        name=request.name,
        cidr_block=request.cidr_block,
        region=request.region,
        owner_id=current_user.id
    )

    db.add(new_vpc)
    db.commit()
    db.refresh(new_vpc)

    print(f"[NETWORK] VPC subnet {vpc_id} ({request.cidr_block}) provisioned for user {current_user.email}")
    return {"status": "success", "message": "VPC Subnet allocated successfully.", "data": new_vpc}

@router.delete("/{vpc_id}")
def terminate_vpc(
    vpc_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Deletes/purges a virtual private network"""
    vpc = db.query(VPCModel).filter(
        VPCModel.id == vpc_id,
        VPCModel.owner_id == current_user.id
    ).first()

    if not vpc:
        raise HTTPException(status_code=404, detail="VPC target not found.")

    db.delete(vpc)
    db.commit()

    print(f"[NETWORK] VPC {vpc_id} deleted successfully.")
    return {"status": "success", "message": "VPC network deleted successfully."}
