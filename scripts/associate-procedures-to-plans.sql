-- Script para associar procedimentos aos planos existentes
-- Este script adiciona procedimentos básicos a cada plano com configurações de exemplo

-- Função auxiliar para inserir procedimentos em todos os planos
DO $$ 
DECLARE 
    plan_record RECORD;
    procedure_record RECORD;
BEGIN
    -- Para cada plano ativo
    FOR plan_record IN SELECT id, name FROM plans WHERE is_active = true
    LOOP
        RAISE NOTICE 'Processando plano: %', plan_record.name;
        
        -- Adicionar consultas básicas
        INSERT INTO plan_procedures (
            plan_id, 
            procedure_id, 
            price, 
            pay_value, 
            is_included, 
            coparticipacao, 
            carencia, 
            limites_anuais
        )
        SELECT 
            plan_record.id,
            p.id,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 8000  -- R$ 80,00
                WHEN plan_record.name = 'COMFORT' THEN 10000  -- R$ 100,00
                WHEN plan_record.name = 'PLATINUM' THEN 12000  -- R$ 120,00
                ELSE 15000  -- R$ 150,00 para INFINITY
            END as price,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 6000  -- R$ 60,00
                WHEN plan_record.name = 'COMFORT' THEN 8000  -- R$ 80,00
                WHEN plan_record.name = 'PLATINUM' THEN 10000  -- R$ 100,00
                ELSE 12000  -- R$ 120,00 para INFINITY
            END as pay_value,
            true as is_included,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 2000  -- R$ 20,00 coparticipação
                WHEN plan_record.name = 'COMFORT' THEN 1500  -- R$ 15,00
                WHEN plan_record.name = 'PLATINUM' THEN 1000  -- R$ 10,00
                ELSE 0  -- Sem coparticipação para INFINITY
            END as coparticipacao,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '30 dias'
                WHEN plan_record.name = 'COMFORT' THEN '15 dias'
                WHEN plan_record.name = 'PLATINUM' THEN '7 dias'
                ELSE '0 dias'  -- Sem carência para INFINITY
            END as carencia,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '4 vezes no ano'
                WHEN plan_record.name = 'COMFORT' THEN '8 vezes no ano'
                WHEN plan_record.name = 'PLATINUM' THEN '12 vezes no ano'
                ELSE '999 vezes no ano'  -- Ilimitado para INFINITY
            END as limites_anuais
        FROM procedures p
        WHERE p.name IN (
            'Consulta Veterinária',
            'Consulta de Retorno',
            'Consulta de Emergência',
            'Aferição da Pressão arterial',
            'Vacinação'
        )
        AND p.is_active = true
        ON CONFLICT (plan_id, procedure_id) DO NOTHING;
        
        -- Adicionar exames básicos
        INSERT INTO plan_procedures (
            plan_id, 
            procedure_id, 
            price, 
            pay_value, 
            is_included, 
            coparticipacao, 
            carencia, 
            limites_anuais
        )
        SELECT 
            plan_record.id,
            p.id,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 15000  -- R$ 150,00
                WHEN plan_record.name = 'COMFORT' THEN 20000  -- R$ 200,00
                WHEN plan_record.name = 'PLATINUM' THEN 25000  -- R$ 250,00
                ELSE 30000  -- R$ 300,00 para INFINITY
            END as price,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 10000  -- R$ 100,00
                WHEN plan_record.name = 'COMFORT' THEN 15000  -- R$ 150,00
                WHEN plan_record.name = 'PLATINUM' THEN 20000  -- R$ 200,00
                ELSE 25000  -- R$ 250,00 para INFINITY
            END as pay_value,
            true as is_included,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 3000  -- R$ 30,00 coparticipação
                WHEN plan_record.name = 'COMFORT' THEN 2000  -- R$ 20,00
                WHEN plan_record.name = 'PLATINUM' THEN 1000  -- R$ 10,00
                ELSE 0  -- Sem coparticipação para INFINITY
            END as coparticipacao,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '60 dias'
                WHEN plan_record.name = 'COMFORT' THEN '30 dias'
                WHEN plan_record.name = 'PLATINUM' THEN '15 dias'
                ELSE '0 dias'  -- Sem carência para INFINITY
            END as carencia,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '2 vezes no ano'
                WHEN plan_record.name = 'COMFORT' THEN '4 vezes no ano'
                WHEN plan_record.name = 'PLATINUM' THEN '6 vezes no ano'
                ELSE '999 vezes no ano'  -- Ilimitado para INFINITY
            END as limites_anuais
        FROM procedures p
        WHERE p.name IN (
            'Hemograma Completo',
            'Urinálise',
            'Parasitológico de Fezes',
            'Glicemia',
            'Ultrassonografia'
        )
        AND p.is_active = true
        ON CONFLICT (plan_id, procedure_id) DO NOTHING;
        
    END LOOP;
    
    RAISE NOTICE 'Script concluído com sucesso!';
END $$;

-- Verificar quantos procedimentos foram associados
SELECT 
    p.name as plano,
    COUNT(pp.procedure_id) as total_procedimentos
FROM plans p
LEFT JOIN plan_procedures pp ON p.id = pp.plan_id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY p.name;