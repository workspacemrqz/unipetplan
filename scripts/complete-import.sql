-- Script para completar a importação dos relacionamentos procedimento-plano

-- Obter IDs dos planos
DO $$
DECLARE
  plan_infinity_id VARCHAR;
  plan_comfort_id VARCHAR;
  plan_platinum_id VARCHAR;
  plan_basic_id VARCHAR;
BEGIN
  -- Get plan IDs
  SELECT id INTO plan_infinity_id FROM plans WHERE name = 'INFINITY';
  SELECT id INTO plan_comfort_id FROM plans WHERE name = 'COMFORT';
  SELECT id INTO plan_platinum_id FROM plans WHERE name = 'PLATINUM';
  SELECT id INTO plan_basic_id FROM plans WHERE name = 'BASIC';

  -- Limpar relacionamentos existentes para recomeçar limpo
  DELETE FROM plan_procedures 
  WHERE plan_id IN (plan_infinity_id, plan_comfort_id, plan_platinum_id);

  -- INFINITY Plan Procedures - Consultas
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 9000, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Consulta Clinica Geral';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 0, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Retorno Clinico';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 9000, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Atestado de Saúde';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 11000, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Consulta Cardiologista', 'Consulta Dentista', 'Consulta Dermatologista', 'Consulta Oncologista', 'Consulta Ortopedista', 'Consulta Nefrologista', 'Consulta Neurologista');
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 9000, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Consulta Plantão';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 5500, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'TAXA DE RETORNO';

  -- INFINITY Plan - Exames Laboratoriais 1 (sem carência)
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 1250, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES LABORATORIAIS - 1' 
  AND name IN ('Alanina Aminotransferase (TGP/ALT)', 'Albumina', 'Aspartato Aminotransferase  (TGO/AST)', 'Bilirrubinas - totais e frações', 'Creatinina', 'Fosfatase Alcalina (prazo 01 dia útil)', 'Fósforo UV (prazo 01 dia útil)', 'Gama Glutamil Transferase (GGT)', 'Proteínas Totais', 'Teste de Glicemia', 'Teste de Glicemia (Aparelho)', 'Uréia');
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 2750, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Hemograma( prazo para laudo 12 horas)';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 2500, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Parasitológico de Fezes (prazo para laudo 12 horas)', 'Relação Proteína / Creatinina Urinária (UPC)(prazo para laudo 12 horas)', 'Sumário de Urina (prazo para laudo 12 horas)');

  -- INFINITY Plan - Exames Laboratoriais 2 (30 dias carência)
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 1250, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Cálcio sérico ou urinário', 'Colesterol total', 'Curva Glicêmica', 'Função hepática (prazo para laudo 12 horas)', 'Triglicerídeos');
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 4000, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Cálculo renal Análise físico química';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 2500, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Citologia do Ouvido (prazo para laudo 12 horas)', 'Função renal( prazo para laudo 12 horas)', 'Microscopia para Sarna (prazo para laudo 12 horas)', 'Pesquisa de hemoparasitas( prazo para laudo 12 horas)', 'Pesquisa de Microfilárias', 'Tricograma');
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 6250, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Citologia Vaginal (prazo para laudo 12 horas)';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 3000, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Dosagem de Cálcio Iônico (prazo 01 dia útil)';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 1500, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'FIBRINOGÊNIO (prazo para laudo 12 horas)';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_infinity_id, id, 5000, '30 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Hemograma com contagem de reticulócitos( prazo para laudo 12 horas)', 'Lipidograma (Colesterol + HDL + LDL + Triglicerídeos)(prazo 01 dia útil)');

  -- COMFORT Plan Procedures  
  -- Consultas
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', '6 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Consulta Clinica Geral';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', '24 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Retorno Clinico';

  -- Exames Laboratoriais
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', '120 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES LABORATORIAIS - 1' 
  AND name IN ('Alanina Aminotransferase (TGP/ALT)', 'Albumina', 'Aspartato Aminotransferase  (TGO/AST)', 'Bilirrubinas - totais e frações', 'Creatinina', 'Fosfatase Alcalina (prazo 01 dia útil)', 'Fósforo UV (prazo 01 dia útil)', 'Gama Glutamil Transferase (GGT)', 'Hemograma( prazo para laudo 12 horas)', 'Parasitológico de Fezes (prazo para laudo 12 horas)', 'Proteínas Totais', 'Relação Proteína / Creatinina Urinária (UPC)(prazo para laudo 12 horas)', 'Sumário de Urina (prazo para laudo 12 horas)', 'Teste de Glicemia', 'Teste de Glicemia (Aparelho)', 'Uréia');

  -- Exames de Imagem
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '30 dias', '5 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Ultrassonografia (prazo 02 dias úteis)', 'Ultrassonografia Guiada');

  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '30 dias', '2 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Cistocentese guiada para coleta de urina';

  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '60 dias', '10 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES IMAGEM - 3';

  -- Vacinas
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', '2 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Vacina de Raiva', 'Vacina Polivalente (V7, V8, V10)', 'Vacina Quadrupla v4', 'Vacina Triplice (V3)');

  -- Anestesia
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', '2 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Anestesia local / Tranquilização';

  -- Coleta
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_comfort_id, id, 0, '0 dias', 'ILIMITADO', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'COLETA DE EXAMES DE SANGUE';

  -- PLATINUM Plan Procedures
  -- Consultas
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '0 dias', '12 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Consulta Clinica Geral';
  
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '0 dias', '24 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name = 'Retorno Clinico';

  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '0 dias', '5 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Atestado de Saúde', 'Consulta Cardiologista', 'Consulta Dentista', 'Consulta Dermatologista', 'Consulta Oncologista', 'Consulta Ortopedista', 'Consulta Plantão');

  -- Exames Laboratoriais 1
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '0 dias', '120 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES LABORATORIAIS - 1'
  AND name IN ('Alanina Aminotransferase (TGP/ALT)', 'Albumina', 'Aspartato Aminotransferase  (TGO/AST)', 'Bilirrubinas - totais e frações', 'Creatinina', 'Fosfatase Alcalina (prazo 01 dia útil)', 'Fósforo UV (prazo 01 dia útil)', 'Gama Glutamil Transferase (GGT)', 'Hemograma( prazo para laudo 12 horas)', 'Parasitológico de Fezes (prazo para laudo 12 horas)', 'Proteínas Totais', 'Relação Proteína / Creatinina Urinária (UPC)(prazo para laudo 12 horas)', 'Sumário de Urina (prazo para laudo 12 horas)', 'Teste de Glicemia', 'Teste de Glicemia (Aparelho)', 'Uréia');

  -- Exames Laboratoriais 2
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '30 dias', '20 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES LABORATORIAIS - 2';

  -- Exames de Imagem
  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '30 dias', '5 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE name IN ('Ultrassonografia (prazo 02 dias úteis)', 'Ultrassonografia Guiada', 'Cistocentese guiada para coleta de urina');

  INSERT INTO plan_procedures (plan_id, procedure_id, coparticipacao, carencia, limites_anuais, is_included, price, pay_value, display_order, created_at)
  SELECT plan_platinum_id, id, 0, '60 dias', '20 vezes no ano', true, 0, 0, 0, CURRENT_TIMESTAMP
  FROM procedures WHERE category = 'EXAMES IMAGEM - 3';

  RAISE NOTICE 'Importação dos procedimentos concluída com sucesso!';
END $$;