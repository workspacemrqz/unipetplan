-- Script para adicionar mais procedimentos aos planos existentes

DO $$ 
DECLARE 
    plan_record RECORD;
BEGIN
    -- Para cada plano ativo
    FOR plan_record IN SELECT id, name FROM plans WHERE is_active = true
    LOOP
        RAISE NOTICE 'Adicionando mais procedimentos ao plano: %', plan_record.name;
        
        -- Adicionar consultas
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
                WHEN plan_record.name = 'BASIC' THEN '6 vezes no ano'
                WHEN plan_record.name = 'COMFORT' THEN '12 vezes no ano'
                WHEN plan_record.name = 'PLATINUM' THEN '24 vezes no ano'
                ELSE '999 vezes no ano'  -- Ilimitado para INFINITY
            END as limites_anuais
        FROM procedures p
        WHERE p.name IN (
            'Consulta Clínica Geral',
            'Consulta Plantão',
            'Consulta para Cirurgia',
            'Consulta Cardiologista',
            'Consulta Dermatologista'
        )
        AND p.is_active = true
        ON CONFLICT (plan_id, procedure_id) DO NOTHING;
        
        -- Adicionar exames
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
                WHEN plan_record.name = 'BASIC' THEN 12000  -- R$ 120,00
                WHEN plan_record.name = 'COMFORT' THEN 15000  -- R$ 150,00
                WHEN plan_record.name = 'PLATINUM' THEN 18000  -- R$ 180,00
                ELSE 20000  -- R$ 200,00 para INFINITY
            END as price,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 9000  -- R$ 90,00
                WHEN plan_record.name = 'COMFORT' THEN 12000  -- R$ 120,00
                WHEN plan_record.name = 'PLATINUM' THEN 15000  -- R$ 150,00
                ELSE 18000  -- R$ 180,00 para INFINITY
            END as pay_value,
            true as is_included,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 2500  -- R$ 25,00 coparticipação
                WHEN plan_record.name = 'COMFORT' THEN 1500  -- R$ 15,00
                WHEN plan_record.name = 'PLATINUM' THEN 500  -- R$ 5,00
                ELSE 0  -- Sem coparticipação para INFINITY
            END as coparticipacao,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '45 dias'
                WHEN plan_record.name = 'COMFORT' THEN '30 dias'
                WHEN plan_record.name = 'PLATINUM' THEN '15 dias'
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
            'Hemograma',
            'Glicemia',
            'Coleta de Exames de Sangue',
            'Creatinina',
            'Ureia'
        )
        AND p.is_active = true
        ON CONFLICT (plan_id, procedure_id) DO NOTHING;
        
        -- Adicionar vacinas
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
                WHEN plan_record.name = 'BASIC' THEN 5000  -- R$ 50,00
                WHEN plan_record.name = 'COMFORT' THEN 7000  -- R$ 70,00
                WHEN plan_record.name = 'PLATINUM' THEN 9000  -- R$ 90,00
                ELSE 10000  -- R$ 100,00 para INFINITY
            END as price,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 3500  -- R$ 35,00
                WHEN plan_record.name = 'COMFORT' THEN 5000  -- R$ 50,00
                WHEN plan_record.name = 'PLATINUM' THEN 7000  -- R$ 70,00
                ELSE 9000  -- R$ 90,00 para INFINITY
            END as pay_value,
            true as is_included,
            CASE 
                WHEN plan_record.name = 'BASIC' THEN 1500  -- R$ 15,00 coparticipação
                WHEN plan_record.name = 'COMFORT' THEN 1000  -- R$ 10,00
                WHEN plan_record.name = 'PLATINUM' THEN 500  -- R$ 5,00
                ELSE 0  -- Sem coparticipação para INFINITY
            END as coparticipacao,
            '0 dias' as carencia, -- Sem carência para vacinas
            CASE 
                WHEN plan_record.name = 'BASIC' THEN '2 vezes no ano'
                WHEN plan_record.name = 'COMFORT' THEN '4 vezes no ano'
                WHEN plan_record.name = 'PLATINUM' THEN '6 vezes no ano'
                ELSE '999 vezes no ano'  -- Ilimitado para INFINITY
            END as limites_anuais
        FROM procedures p
        WHERE p.name IN (
            'Vacina ',
            'Vacina de Raiva',
            'Vacina de Gripe'
        )
        AND p.is_active = true
        ON CONFLICT (plan_id, procedure_id) DO NOTHING;
        
    END LOOP;
    
    RAISE NOTICE 'Procedimentos adicionados com sucesso!';
END $$;

-- Verificar o total de procedimentos por plano
SELECT 
    p.name as plano,
    COUNT(pp.procedure_id) as total_procedimentos,
    STRING_AGG(pr.name, ', ' ORDER BY pr.name) as procedimentos
FROM plans p
LEFT JOIN plan_procedures pp ON p.id = pp.plan_id
LEFT JOIN procedures pr ON pp.procedure_id = pr.id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY p.name;