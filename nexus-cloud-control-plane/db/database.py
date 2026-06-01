from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This creates a local file named 'nexus_cloud.db' in your project folder
SQLALCHEMY_DATABASE_URL = "sqlite:///./nexus_cloud.db"

# The engine is the core interface to the database
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# A SessionLocal class acts as a database workspace for our API routes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All of our database models will inherit from this Base class
Base = declarative_base()

# A quick helper function we will use in our API routes to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()