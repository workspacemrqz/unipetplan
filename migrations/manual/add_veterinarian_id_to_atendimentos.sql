-- Add veterinarian_id column to atendimentos table
ALTER TABLE atendimentos 
ADD COLUMN IF NOT EXISTS veterinarian_id VARCHAR REFERENCES veterinarians(id);