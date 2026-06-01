from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import random
from jose import jwt
from api.v1.auth import SECRET_KEY, ALGORITHM

# Database Session & Models
from db.database import SessionLocal
from models.user import UserModel
from models.database import DatabaseModel

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

class DBDeployRequest(BaseModel):
    name: str
    db_engine: str # postgresql, mysql, mongodb
    version: str
    region: str
    size_gb: int

def generate_public_ip():
    return f"{random.randint(10, 220)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

def get_db_cost_rate(engine: str):
    rates = {"postgresql": 12, "mysql": 8, "mongodb": 15}
    return rates.get(engine.lower(), 10)

@router.get("/")
def get_user_databases(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Fetches all managed database instances owned by the authenticated operative"""
    databases = db.query(DatabaseModel).filter(DatabaseModel.owner_id == current_user.id).all()
    return {"status": "success", "data": databases}

@router.post("/deploy")
def deploy_new_database(
    request: DBDeployRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Provisions a new relational/NoSQL managed database instance"""
    db_id = f"db-{str(uuid.uuid4())[:8]}"
    assigned_ip = generate_public_ip()
    hourly_cost = get_db_cost_rate(request.db_engine)

    new_db = DatabaseModel(
        id=db_id,
        name=request.name,
        db_engine=request.db_engine.lower(),
        version=request.version,
        region=request.region,
        status="running",
        ip_address=assigned_ip,
        cost_per_hour=hourly_cost,
        size_gb=request.size_gb,
        owner_id=current_user.id
    )

    db.add(new_db)
    db.commit()
    db.refresh(new_db)

    print(f"[DB] Managed {request.db_engine} instance {db_id} deployed for user {current_user.email}")
    return {"status": "success", "message": "Database deployment initialized.", "server": new_db}

@router.put("/{db_id}/toggle")
def toggle_database_power(
    db_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Toggles database instance state between running and stopped"""
    database = db.query(DatabaseModel).filter(
        DatabaseModel.id == db_id,
        DatabaseModel.owner_id == current_user.id
    ).first()

    if not database:
        raise HTTPException(status_code=404, detail="Database target not found.")

    if database.status == "running":
        database.status = "stopped"
    else:
        database.status = "running"

    db.commit()
    db.refresh(database)

    print(f"[DB] Database {db_id} state changed to {database.status}")
    return {"status": "success", "message": f"Database state changed to {database.status}", "data": database}

@router.delete("/{db_id}")
def terminate_database(
    db_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Purges the database instance completely from the cluster"""
    database = db.query(DatabaseModel).filter(
        DatabaseModel.id == db_id,
        DatabaseModel.owner_id == current_user.id
    ).first()

    if not database:
        raise HTTPException(status_code=404, detail="Database target not found.")

    db.delete(database)
    db.commit()

    print(f"[DB] Database instance {db_id} terminated and wiped.")
    return {"status": "success", "message": "Database successfully terminated from infrastructure pool."}
