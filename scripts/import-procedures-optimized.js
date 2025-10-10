import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Parse procedure data from text files
function parseProcedureFromText(text, planName) {
  const procedures = [];
  const lines = text.split('\n');
  
  let currentProcedure = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Procedimento:')) {
      if (currentProcedure.name) {
        procedures.push({ ...currentProcedure });
      }
      currentProcedure = {
        name: line.replace('Procedimento:', '').trim(),
        plan: planName
      };
    } else if (line.startsWith('Categoria do procedimento:')) {
      currentProcedure.category = line.replace('Categoria do procedimento:', '').trim();
    } else if (line.startsWith('Coparticipação (R$):')) {
      const value = line.replace('Coparticipação (R$):', '').replace('R$', '').trim();
      currentProcedure.coparticipacao = parseFloat(value.replace(',', '.')) || 0;
    } else if (line.startsWith('Carência (Dias):')) {
      const days = line.replace('Carência (Dias):', '').trim();
      currentProcedure.carencia = days === '0' ? '0 dias' : `${days} dias`;
    } else if (line.startsWith('Limites Anuais:')) {
      const limit = line.replace('Limites Anuais:', '').trim();
      if (limit === 'ILIMITADO' || limit === '') {
        currentProcedure.limitesAnuais = 'ILIMITADO';
      } else {
        currentProcedure.limitesAnuais = `${limit} vezes no ano`;
      }
    }
  }
  
  // Add last procedure
  if (currentProcedure.name) {
    procedures.push(currentProcedure);
  }
  
  return procedures;
}

// Parse INFINITY format (space-separated single line format)
function parseInfinityFormat(text, planName) {
  const procedures = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const procedureMatch = trimmedLine.match(/Procedimento: ([^:]+?) Categoria do procedimento: ([^:]+?) Plano: \w+ Coparticipação \(R\$\): ([^:]+?) Carência \(Dias\): (\d+) Limites Anuais: ?(.*?)$/);
    
    if (procedureMatch) {
      const [, name, category, coparticipacao, carencia, limitesAnuais] = procedureMatch;
      
      procedures.push({
        name: name.trim(),
        category: category.trim(),
        plan: planName,
        coparticipacao: parseFloat(coparticipacao.replace('R$', '').replace(',', '.').trim()) || 0,
        carencia: carencia === '0' ? '0 dias' : `${carencia} dias`,
        limitesAnuais: !limitesAnuais || limitesAnuais.trim() === '' ? 'ILIMITADO' : `${limitesAnuais.trim()} vezes no ano`
      });
    }
  }
  
  return procedures;
}

async function importProcedures() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Read all procedure files
    const files = [
      { path: '../attached_assets/BASIC_1760114875981.txt', plan: 'BASIC' },
      { path: '../attached_assets/INFINITY_1760114875981.txt', plan: 'INFINITY' },
      { path: '../attached_assets/COMFORT_1760114875982.txt', plan: 'COMFORT' },
      { path: '../attached_assets/PLATINUM_1760114875982.txt', plan: 'PLATINUM' }
    ];
    
    // Get plan IDs
    const plansResult = await client.query(`
      SELECT id, name FROM plans 
      WHERE name IN ('BASIC', 'INFINITY', 'COMFORT', 'PLATINUM')
    `);
    
    const planMap = {};
    plansResult.rows.forEach(row => {
      planMap[row.name] = row.id;
    });
    
    console.log('Found plans:', Object.keys(planMap));
    
    // Process each file
    const allProcedures = new Map(); // key: procedure name, value: procedure data
    const procedurePlans = []; // array of plan-procedure relationships
    
    for (const file of files) {
      console.log(`Processing ${file.plan}...`);
      const content = fs.readFileSync(file.path, 'utf-8');
      
      let procedures;
      if (file.plan === 'INFINITY' || file.plan === 'PLATINUM') {
        procedures = parseInfinityFormat(content, file.plan);
      } else {
        procedures = parseProcedureFromText(content, file.plan);
      }
      
      console.log(`Found ${procedures.length} procedures in ${file.plan}`);
      
      // Add procedures to map and collect plan relationships
      for (const proc of procedures) {
        if (!allProcedures.has(proc.name)) {
          allProcedures.set(proc.name, {
            name: proc.name,
            category: proc.category
          });
        }
        
        procedurePlans.push({
          procedureName: proc.name,
          planName: proc.plan,
          coparticipacao: proc.coparticipacao,
          carencia: proc.carencia,
          limitesAnuais: proc.limitesAnuais
        });
      }
    }
    
    console.log(`\nTotal unique procedures: ${allProcedures.size}`);
    
    // Get existing procedures
    const existingResult = await client.query('SELECT id, name FROM procedures');
    const existingProcedures = new Map();
    existingResult.rows.forEach(row => {
      existingProcedures.set(row.name, row.id);
    });
    
    console.log(`Existing procedures in database: ${existingProcedures.size}`);
    
    // Batch insert new procedures
    const newProcedures = [];
    for (const [name, data] of allProcedures) {
      if (!existingProcedures.has(name)) {
        newProcedures.push([name, data.category]);
      }
    }
    
    if (newProcedures.length > 0) {
      console.log(`Inserting ${newProcedures.length} new procedures...`);
      
      // Build batch insert query
      const values = newProcedures.map((_, i) => 
        `($${i*2+1}, $${i*2+2}, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).join(',');
      
      const flatValues = newProcedures.flat();
      
      const insertResult = await client.query(`
        INSERT INTO procedures (name, category, is_active, display_order, created_at, updated_at)
        VALUES ${values}
        RETURNING id, name
      `, flatValues);
      
      // Add new procedures to the map
      insertResult.rows.forEach(row => {
        existingProcedures.set(row.name, row.id);
      });
    }
    
    // Update existing procedures with missing categories
    const updatePromises = [];
    for (const [name, data] of allProcedures) {
      if (existingProcedures.has(name)) {
        updatePromises.push(
          client.query(`
            UPDATE procedures 
            SET category = $1, updated_at = CURRENT_TIMESTAMP
            WHERE name = $2 AND (category IS NULL OR category != $1)
          `, [data.category, name])
        );
      }
    }
    
    if (updatePromises.length > 0) {
      console.log(`Updating ${updatePromises.length} existing procedures...`);
      await Promise.all(updatePromises);
    }
    
    // Delete existing relationships for these plans
    console.log('\nClearing existing plan-procedure relationships...');
    await client.query(`
      DELETE FROM plan_procedures 
      WHERE plan_id IN (SELECT id FROM plans WHERE name IN ('BASIC', 'INFINITY', 'COMFORT', 'PLATINUM'))
    `);
    
    // Batch insert plan-procedure relationships
    console.log('Inserting plan-procedure relationships...');
    const relationships = [];
    
    for (const rel of procedurePlans) {
      const procedureId = existingProcedures.get(rel.procedureName);
      const planId = planMap[rel.planName];
      
      if (!procedureId || !planId) {
        console.log(`Warning: Could not find IDs for ${rel.procedureName} in plan ${rel.planName}`);
        continue;
      }
      
      const coparticipacaoCents = Math.round(rel.coparticipacao * 100);
      relationships.push([
        planId,
        procedureId,
        coparticipacaoCents,
        rel.carencia,
        rel.limitesAnuais
      ]);
    }
    
    if (relationships.length > 0) {
      console.log(`Creating ${relationships.length} relationships...`);
      
      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < relationships.length; i += chunkSize) {
        const chunk = relationships.slice(i, i + chunkSize);
        
        const values = chunk.map((_, idx) => 
          `($${idx*5+1}, $${idx*5+2}, $${idx*5+3}, $${idx*5+4}, $${idx*5+5}, true, 0, 0, 0, CURRENT_TIMESTAMP)`
        ).join(',');
        
        const flatValues = chunk.flat();
        
        await client.query(`
          INSERT INTO plan_procedures (
            plan_id, 
            procedure_id, 
            coparticipacao, 
            carencia, 
            limites_anuais, 
            is_included,
            price,
            pay_value,
            display_order,
            created_at
          ) VALUES ${values}
        `, flatValues);
      }
    }
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        p.name as plan_name,
        COUNT(pp.id) as procedure_count
      FROM plans p
      LEFT JOIN plan_procedures pp ON p.id = pp.plan_id
      WHERE p.name IN ('BASIC', 'INFINITY', 'COMFORT', 'PLATINUM')
      GROUP BY p.name
      ORDER BY p.name
    `);
    
    console.log('\n=== Summary ===');
    summaryResult.rows.forEach(row => {
      console.log(`${row.plan_name}: ${row.procedure_count} procedures`);
    });
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('Error importing procedures:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importProcedures();