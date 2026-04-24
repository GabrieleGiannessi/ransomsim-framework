import axios from 'axios';

const API_URL = 'http://localhost:8000/patients';

export type Patient = {
  id: number;
  name: string;
  age: number;
  gender: string;
  blood_type: string;
  medical_condition: string;
  date_of_admission: string;
  doctor: string;
  hospital: string;
  insurance_provider: string;
  billing_amount: number;
  room_number: number;
  admission_type: string;
  discharge_date: string;
  medication: string;
  test_results: string;
}

export type PaginatedResponse = {
  total: number;
  page: number;
  size: number;
  data: Patient[];
}

export const getPatients = async (skip: number = 0, limit: number = 50, condition?: string): Promise<PaginatedResponse> => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  if (condition) {
    params.append('condition', condition);
  }
  const response = await axios.get<PaginatedResponse>(`${API_URL}?${params.toString()}`);
  return response.data;
};

export const getPatient = async (id: number): Promise<Patient> => {
  const response = await axios.get<Patient>(`${API_URL}/${id}`);
  return response.data;
};

export const createPatient = async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
  const response = await axios.post<Patient>(API_URL, patient);
  return response.data;
};

export const updatePatient = async (id: number, patient: Omit<Patient, 'id'>): Promise<Patient> => {
  const response = await axios.put<Patient>(`${API_URL}/${id}`, patient);
  return response.data;
};

export const deletePatient = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};
