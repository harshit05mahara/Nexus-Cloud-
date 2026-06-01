import asyncio
from db.database import SessionLocal
from models.instance import InstanceModel
from models.user import UserModel
from models.database import DatabaseModel

async def run_billing_cycle():
    print("[BILLING DAEMON] Micro-billing worker initialized. Draining per minute...")
    
    while True:
        # Sleep for exactly 60 seconds before running the next calculation
        await asyncio.sleep(60)
        
        db = SessionLocal()
        try:
            # 1. Scan the global infrastructure for running nodes and databases
            running_instances = db.query(InstanceModel).filter(InstanceModel.status == "running").all()
            running_databases = db.query(DatabaseModel).filter(DatabaseModel.status == "running").all()
            
            # Process running compute nodes
            for instance in running_instances:
                # Look up the specific user who owns this node
                owner = db.query(UserModel).filter(UserModel.id == instance.owner_id).first()
                
                if owner:
                    # Calculate micro-cost (Hourly cost divided by 60 minutes)
                    cost_per_minute = instance.cost_per_hour / 60.0
                    
                    # Drain the wallet
                    owner.wallet_balance -= cost_per_minute
                    
                    # The "AWS" Rule: Auto-shutdown if they run out of money
                    if owner.wallet_balance <= 0:
                        owner.wallet_balance = 0
                        instance.status = "stopped"
                        print(f"[SECURITY] Auto-terminated instance {instance.id}. Reason: Insufficient Funds.")

            # Process running database instances
            for database in running_databases:
                # Look up the specific user who owns this database
                owner = db.query(UserModel).filter(UserModel.id == database.owner_id).first()
                
                if owner:
                    # Calculate micro-cost (Hourly cost divided by 60 minutes)
                    cost_per_minute = database.cost_per_hour / 60.0
                    
                    # Drain the wallet
                    owner.wallet_balance -= cost_per_minute
                    
                    # Auto-shutdown if out of money
                    if owner.wallet_balance <= 0:
                        owner.wallet_balance = 0
                        database.status = "stopped"
                        print(f"[SECURITY] Auto-terminated database {database.id}. Reason: Insufficient Funds.")
            
            # Save the new wallet balances and status changes to the database
            db.commit()
            
            if running_instances or running_databases:
                print(f"[BILLING] Processed micro-transactions for {len(running_instances)} active compute nodes and {len(running_databases)} active databases.")
                
        except Exception as e:
            print(f"[BILLING ERROR] Sequence failed: {e}")
        finally:
            db.close()