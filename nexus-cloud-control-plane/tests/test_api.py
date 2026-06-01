import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from main import app
from db.database import Base
from api.v1.auth import get_db as auth_get_db
from api.v1.instances import get_db as instances_get_db
from api.v1.network import get_db as network_get_db
from api.v1.storage import get_db as storage_get_db
from api.v1.databases import get_db as databases_get_db

# Use a separate test database file
TEST_DB_FILE = "./test_nexus_cloud.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override dependencies globally across all API modules
app.dependency_overrides[auth_get_db] = override_get_db
app.dependency_overrides[instances_get_db] = override_get_db
app.dependency_overrides[network_get_db] = override_get_db
app.dependency_overrides[storage_get_db] = override_get_db
app.dependency_overrides[databases_get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Clean database before tests
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    yield
    # Dispose of engine to release file locks on Windows
    engine.dispose()
    # Clean database after tests
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest.fixture(scope="module")
def auth_token():
    # 1. Register a test operative user
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": "tester@nexus.cloud", "password": "nexuspassword123"}
    )
    assert register_response.status_code == 200
    
    # 2. Login to mint access token
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "tester@nexus.cloud", "password": "nexuspassword123"}
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]

def test_auth_flow(auth_token):
    # Verify we got a valid token
    assert auth_token is not None
    assert len(auth_token) > 0

def test_vpc_flow(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Deploy VPC
    deploy_response = client.post(
        "/api/v1/network/deploy",
        headers=headers,
        json={"name": "test-vpc", "cidr_block": "10.0.0.0/16", "region": "us-east-1"}
    )
    assert deploy_response.status_code == 200
    vpc_data = deploy_response.json()["data"]
    assert vpc_data["name"] == "test-vpc"
    assert vpc_data["cidr_block"] == "10.0.0.0/16"
    
    # 2. List VPCs
    list_response = client.get("/api/v1/network/", headers=headers)
    assert list_response.status_code == 200
    vpcs = list_response.json()["data"]
    assert len(vpcs) > 0
    assert any(v["id"] == vpc_data["id"] for v in vpcs)
    
    # 3. Delete VPC
    delete_response = client.delete(f"/api/v1/network/{vpc_data['id']}", headers=headers)
    assert delete_response.status_code == 200

def test_storage_flow(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Create Storage Bucket
    create_response = client.post(
        "/api/v1/storage/create",
        headers=headers,
        json={"name": "test-bucket-unique-name", "storage_class": "STANDARD", "region": "us-east-1"}
    )
    assert create_response.status_code == 200
    bucket_data = create_response.json()["data"]
    assert bucket_data["name"] == "test-bucket-unique-name"
    assert bucket_data["size_gb"] == 0
    
    # 2. List storage buckets
    list_response = client.get("/api/v1/storage/", headers=headers)
    assert list_response.status_code == 200
    buckets = list_response.json()["data"]
    assert len(buckets) > 0
    assert any(b["id"] == bucket_data["id"] for b in buckets)
    
    # 3. Resize bucket capacity (Upload payload simulation)
    resize_response = client.put(
        f"/api/v1/storage/{bucket_data['id']}/resize",
        headers=headers,
        json={"size_gb": 120}
    )
    assert resize_response.status_code == 200
    assert resize_response.json()["data"]["size_gb"] == 120
    
    # 4. Delete storage bucket
    delete_response = client.delete(f"/api/v1/storage/{bucket_data['id']}", headers=headers)
    assert delete_response.status_code == 200

def test_databases_flow(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Deploy relational database
    deploy_response = client.post(
        "/api/v1/databases/deploy",
        headers=headers,
        json={"name": "test-postgres", "db_engine": "postgresql", "version": "15", "region": "eu-central-1", "size_gb": 50}
    )
    assert deploy_response.status_code == 200
    db_data = deploy_response.json()["server"]
    assert db_data["name"] == "test-postgres"
    assert db_data["db_engine"] == "postgresql"
    assert db_data["status"] == "running"
    
    # 2. List databases
    list_response = client.get("/api/v1/databases/", headers=headers)
    assert list_response.status_code == 200
    databases = list_response.json()["data"]
    assert len(databases) > 0
    assert any(d["id"] == db_data["id"] for d in databases)
    
    # 3. Toggle database power (Stop)
    toggle_response = client.put(f"/api/v1/databases/{db_data['id']}/toggle", headers=headers)
    assert toggle_response.status_code == 200
    assert toggle_response.json()["data"]["status"] == "stopped"
    
    # 4. Terminate database instance
    delete_response = client.delete(f"/api/v1/databases/{db_data['id']}", headers=headers)
    assert delete_response.status_code == 200
