from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.database import get_db
from api.models import PatientCreate, PatientResponse, PaginatedPatientResponse
from api.services import patient_service

router = APIRouter(
    prefix="/patients",
    tags=["patients"]
)

@router.get("/", response_model=PaginatedPatientResponse)
def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    condition: Optional[str] = None,
    db: Session = Depends(get_db)
):
    patients, total = patient_service.get_patients(db, skip=skip, limit=limit, condition=condition)
    
    return {
        "total": total,
        "page": (skip // limit) + 1,
        "size": limit,
        "data": patients
    }

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    return patient_service.create_patient(db, patient)

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, patient: PatientCreate, db: Session = Depends(get_db)):
    updated_patient = patient_service.update_patient(db, patient_id, patient)
    if not updated_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated_patient

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    success = patient_service.delete_patient(db, patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}
