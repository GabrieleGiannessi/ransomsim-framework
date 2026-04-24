from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
from api.models import Patient, PatientCreate

def get_patients(
    db: Session, 
    skip: int = 0, 
    limit: int = 50, 
    condition: Optional[str] = None
) -> Tuple[List[Patient], int]:
    """
    Returns a tuple of (patients_list, total_count)
    """
    query = db.query(Patient)
    if condition:
        query = query.filter(Patient.medical_condition.ilike(f"%{condition}%"))
        
    total = query.count()
    patients = query.offset(skip).limit(limit).all()
    
    return patients, total

def get_patient_by_id(db: Session, patient_id: int) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()

def create_patient(db: Session, patient: PatientCreate) -> Patient:
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def update_patient(db: Session, patient_id: int, patient_data: PatientCreate) -> Optional[Patient]:
    db_patient = get_patient_by_id(db, patient_id)
    if not db_patient:
        return None
        
    for key, value in patient_data.dict().items():
        setattr(db_patient, key, value)
        
    db.commit()
    db.refresh(db_patient)
    return db_patient

def delete_patient(db: Session, patient_id: int) -> bool:
    db_patient = get_patient_by_id(db, patient_id)
    if not db_patient:
        return False
        
    db.delete(db_patient)
    db.commit()
    return True
