from sqlalchemy.orm import Session
from models.instance import InstanceModel

def create_instance_record(db: Session, instance_id: str, os_image: str, memory_limit: str, status: str):
    # Create the new database row
    db_instance = InstanceModel(
        instance_id=instance_id,
        os_image=os_image,
        memory_limit=memory_limit,
        status=status
    )
    # Add it to the table and save (commit)
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)
    return db_instance

def get_all_instances(db: Session):
    # Fetch every server from the database
    return db.query(InstanceModel).all()

def delete_instance_record(db: Session, instance_id: str):
    # Find the specific server in the database
    db_instance = db.query(InstanceModel).filter(InstanceModel.instance_id == instance_id).first()
    
    # If it exists, permanently delete the row
    if db_instance:
        db.delete(db_instance)
        db.commit()
    return db_instance