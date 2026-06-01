import time
import asyncio
import subprocess # <-- REQUIRED FOR LIVE TERMINAL
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import jwt
from api.v1.auth import SECRET_KEY, ALGORITHM

# Nexus Cloud Modules
from worker import run_billing_cycle  
from api.v1 import instances, auth, network, storage, databases
from db.database import engine, Base, SessionLocal
from models.instance import InstanceModel
from models.user import UserModel   
from models.virtual_system import VirtualSystemModel
from models.vpc import VPCModel
from models.storage import StorageBucketModel
from models.database import DatabaseModel


# Initialize Database Tables
Base.metadata.create_all(bind=engine)

# ==========================================
# 1. LIFESPAN BOOT MANAGER
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*50)
    print("NEXUS CLOUD KERNEL INITIATED")
    print("Database connections secured.")
    daemon = asyncio.create_task(run_billing_cycle())
    print("Awaiting React uplink on port 5173...")
    print("="*50 + "\n")
    yield
    daemon.cancel()
    print("\nNEXUS CLOUD SHUTTING DOWN. Disconnecting database...")

app = FastAPI(title="Nexus Cloud", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ==========================================
# 2. TELEMETRY & ERROR HANDLING
# ==========================================
@app.middleware("http")
async def inject_telemetry_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Nexus-Process-Time"] = f"{process_time:.4f}s"
    print(f"[NETWORK I/O] {request.method} {request.url.path} - {process_time:.4f}s")
    return response

@app.exception_handler(Exception)
async def global_security_handler(request: Request, exc: Exception):
    print(f"[CRITICAL EXCEPTION] {request.url.path} - {str(exc)}")
    return JSONResponse(status_code=500, content={"error": "CRITICAL_SYSTEM_FAILURE"})

# ==========================================
# ROUTER MOUNTING
# ==========================================
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(instances.router, prefix="/api/v1/instances")
app.include_router(network.router, prefix="/api/v1/network")
app.include_router(storage.router, prefix="/api/v1/storage")
app.include_router(databases.router, prefix="/api/v1/databases")

# ==========================================
# 4. LIVE TELEMETRY WEBSOCKET (BILLING)
# ==========================================
@app.websocket("/ws/telemetry")
async def telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    try:
        while True:
            db = SessionLocal()
            try:
                user = db.query(UserModel).filter(UserModel.id == user_id).first()
                if user:
                    await websocket.send_json({"wallet_balance": int(user.wallet_balance)})
                else:
                    await websocket.close(code=1008)
                    break
            except Exception as e:
                print(f"[TELEMETRY ERROR] {e}")
                break
            finally:
                db.close()
            await asyncio.sleep(2)  # Check and stream every 2 seconds
    except WebSocketDisconnect:
        print(f"[TELEMETRY] Session closed for user {user_id}")

# ==========================================
# 5. LIVE TERMINAL EXECUTION ENGINE (ASYNC)
# ==========================================
@app.websocket("/ws/terminal/{instance_id}")
async def terminal_endpoint(websocket: WebSocket, instance_id: str):
    await websocket.accept()
    
    # Authenticate token from query parameter
    token = websocket.query_params.get("token")
    if not token:
        await websocket.send_text("ERROR: Authentication required.\n")
        await websocket.close(code=1008)
        return
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.send_text("ERROR: Invalid token.\n")
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.send_text("ERROR: Invalid token signature.\n")
        await websocket.close(code=1008)
        return
        
    db = SessionLocal()
    instance = db.query(InstanceModel).filter(
        InstanceModel.id == instance_id,
        InstanceModel.owner_id == user_id
    ).first()
    db.close()
    
    if not instance:
        await websocket.send_text("ERROR: Instance not found or access unauthorized.\n")
        await websocket.close(code=1008)
        return
        
    if instance.status != "running":
        await websocket.send_text("ERROR: Instance is offline.\n")
        await websocket.close()
        return

    await websocket.send_text(f"Connected to Nexus Execution Engine.\nVirtualizing Node: {instance.name}\nType standard Windows commands (dir, ping, ipconfig).\n")
    
    try:
        while True:
            command = await websocket.receive_text()
            
            try:
                # True Async Subprocess Execution
                process = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Wait for command to finish (10 second limit)
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
                
                output = (stdout.decode() + stderr.decode()).strip()
                if not output:
                    output = "[Executed successfully with no output]"
                    
                await websocket.send_text(output + "\n")
                
            except asyncio.TimeoutError:
                await websocket.send_text("ERROR: Command timed out after 10 seconds.\n")
            except Exception as e:
                await websocket.send_text(f"ERROR: {str(e)}\n")
                
    except WebSocketDisconnect:
        print(f"[TERMINAL] Session closed for {instance_id}")

@app.get("/")
def health_check():
    return {"status": "online"}