import pandas as pd
from sqlalchemy.orm import Session
from api.database import engine, Base
from api.models import Patient
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_FILE_PATH = os.path.join(BASE_DIR, "healthcare_dataset.csv")
def init_db(db: Session):
    Base.metadata.create_all(bind=engine)
    
    # Check if we already have data
    if db.query(Patient).first() is not None:
        print("Database already populated. Skipping initialization.")
        return

    print("Loading data from CSV into database...")
    if not os.path.exists(CSV_FILE_PATH):
        print(f"Error: CSV file not found at {CSV_FILE_PATH}")
        return

    # Read CSV
    df = pd.read_csv(CSV_FILE_PATH)
    
    # Map CSV columns to model attributes
    df.columns = [
        "name", "age", "gender", "blood_type", "medical_condition",
        "date_of_admission", "doctor", "hospital", "insurance_provider",
        "billing_amount", "room_number", "admission_type", "discharge_date",
        "medication", "test_results"
    ]
    
    # Convert date columns to datetime objects
    df['date_of_admission'] = pd.to_datetime(df['date_of_admission']).dt.date
    df['discharge_date'] = pd.to_datetime(df['discharge_date']).dt.date
    
    # Convert room number to int and fill NaNs if any
    df['room_number'] = df['room_number'].fillna(0).astype(int)
    
    # Insert in batches
    patients = []
    for _, row in df.iterrows():
        patient = Patient(**row.to_dict())
        patients.append(patient)
        
        if len(patients) >= 5000:
            db.bulk_save_objects(patients)
            db.commit()
            patients = []
            
    if patients:
        db.bulk_save_objects(patients)
        db.commit()
    
    print("Database initialization complete.")
