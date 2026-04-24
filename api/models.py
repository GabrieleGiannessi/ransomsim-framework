from sqlalchemy import Column, Integer, String, Float, Date
from api.database import Base
from pydantic import BaseModel
from datetime import date
from typing import Optional

# SQLAlchemy Models
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    blood_type = Column(String)
    medical_condition = Column(String, index=True)
    date_of_admission = Column(Date)
    doctor = Column(String)
    hospital = Column(String)
    insurance_provider = Column(String)
    billing_amount = Column(Float)
    room_number = Column(Integer)
    admission_type = Column(String)
    discharge_date = Column(Date)
    medication = Column(String)
    test_results = Column(String)

# Pydantic Schemas
class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    blood_type: str
    medical_condition: str
    date_of_admission: date
    doctor: str
    hospital: str
    insurance_provider: str
    billing_amount: float
    room_number: int
    admission_type: str
    discharge_date: date
    medication: str
    test_results: str

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int

    class Config:
        from_attributes = True

class PaginatedPatientResponse(BaseModel):
    total: int
    page: int
    size: int
    data: list[PatientResponse]
