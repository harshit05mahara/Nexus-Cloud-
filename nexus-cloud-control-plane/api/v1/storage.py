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
from models.storage import StorageBucketModel

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

class BucketCreateRequest(BaseModel):
    name: str
    storage_class: str
    region: str

class BucketResizeRequest(BaseModel):
    size_gb: int

@router.get("/")
def get_user_buckets(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Lists all active storage buckets owned by the authenticated operative"""
    buckets = db.query(StorageBucketModel).filter(StorageBucketModel.owner_id == current_user.id).all()
    return {"status": "success", "data": buckets}

@router.post("/create")
def create_new_bucket(
    request: BucketCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Provisions a new storage bucket on the network cluster"""
    bucket_id = f"bucket-{str(uuid.uuid4())[:8]}"
    
    # Check if bucket name is already taken
    existing_bucket = db.query(StorageBucketModel).filter(StorageBucketModel.name == request.name).first()
    if existing_bucket:
        raise HTTPException(status_code=400, detail="Bucket name must be globally unique.")

    new_bucket = StorageBucketModel(
        id=bucket_id,
        name=request.name,
        storage_class=request.storage_class,
        region=request.region,
        owner_id=current_user.id,
        size_gb=0
    )

    db.add(new_bucket)
    db.commit()
    db.refresh(new_bucket)

    print(f"[STORAGE] Storage bucket {bucket_id} ({request.name}) created by user {current_user.email}")
    return {"status": "success", "message": "Storage bucket created successfully.", "data": new_bucket}

@router.delete("/{bucket_id}")
def delete_bucket(
    bucket_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Deletes/purges a storage bucket"""
    bucket = db.query(StorageBucketModel).filter(
        StorageBucketModel.id == bucket_id,
        StorageBucketModel.owner_id == current_user.id
    ).first()

    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket target not found.")

    db.delete(bucket)
    db.commit()

    print(f"[STORAGE] Bucket {bucket_id} successfully deleted.")
    return {"status": "success", "message": "Storage bucket deleted successfully."}

@router.put("/{bucket_id}/resize")
def resize_bucket(
    bucket_id: str,
    request: BucketResizeRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Resizes bucket space allocation to simulate uploading or deleting file streams"""
    bucket = db.query(StorageBucketModel).filter(
        StorageBucketModel.id == bucket_id,
        StorageBucketModel.owner_id == current_user.id
    ).first()

    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket target not found.")

    if request.size_gb < 0:
        raise HTTPException(status_code=400, detail="Storage size allocation cannot be negative.")

    bucket.size_gb = request.size_gb
    db.commit()
    db.refresh(bucket)

    print(f"[STORAGE] Resized bucket {bucket_id} to {request.size_gb} GB.")
    return {"status": "success", "message": f"Storage bucket size updated to {request.size_gb} GB.", "data": bucket}
