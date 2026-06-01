from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

# In a production deployment, this would be hidden in a .env file
SECRET_KEY = "nexus_cloud_super_secret_master_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

# Initializes the Bcrypt hashing algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if the provided password matches the database hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain text password for secure database storage."""
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    """Generates a secure JSON Web Token (JWT) for the React frontend."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt