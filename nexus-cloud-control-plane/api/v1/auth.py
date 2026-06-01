from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from pydantic import BaseModel

# Import your database session and models
from db.database import SessionLocal
from models.user import UserModel

# ==========================================
# CRYPTOGRAPHIC CONFIGURATION
# ==========================================
# In a real production app, NEVER hardcode this. It belongs in a .env file.
SECRET_KEY = "NEXUS_SUPREME_MASTER_KEY_007" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class UserCreate(BaseModel):
    email: str
    password: str

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================
@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Hashes the password and mints a fresh account with a 10,000 TKN wallet"""
    
    # 1. Verify the email isn't already taken
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered in the Nexus Core.")

    # 2. Hash the plaintext password
    hashed_pw = pwd_context.hash(user.password)
    
    # 3. Create the new user record
    new_user = UserModel(
        email=user.email, 
        hashed_password=hashed_pw, 
        wallet_balance=10000
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"[SECURITY] New operative registered: {user.email}")
    return {"message": "User successfully registered to the Nexus grid.", "user_id": new_user.id}


@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Verifies credentials and returns a secure JWT Bearer token"""
    
    # 1. Find the user by email (OAuth2 dictates the field is called 'username')
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    
    # 2. Verify the user exists AND the password matches the hash
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        print(f"[SECURITY WARNING] Failed breach attempt on account: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Mint the JSON Web Token
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": str(user.id), "exp": expire} # We pack the user's ID into the token
    
    encoded_jwt = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    print(f"[SECURITY] Access granted. Token minted for operative: {user.email}")
    
    # React expects these exact keys to store in localStorage
    return {"access_token": encoded_jwt, "token_type": "bearer"}