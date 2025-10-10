import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db.js';
import { procedures, planProcedures } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const PLAN_IDS = {
  'BASIC': 'ec994283-76de-4605-afa3-0670a8a0a475',
  'INFINITY': '887dd8ae-1885-4d66-bc65-0ec460912c59',
  'COMFORT': '7a8c94f9-1336-495f-a771-12755bfd4921',
  'PLATINUM': '20f78143-ae37-4438-ab4b-57380fb17818'
};

interface ProcedureData {
  name: string;
  category: string;
  planData: {
    planName: string;
    planId: string;
    coparticipacao: number;
    carencia: string;
    limitesAnuais: string;
  }[];
}

function parseMoneyToCents(value: string): number {
  const cleaned = value.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
  const number = parseFloat(cleaned);
  return Math.round(number * 100); // Convert to cents
}

function parseProcedureFile(filePath: string, planName: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const proceduresData: any[] = [];
  let currentProcedure: any = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Procedimento:')) {
      if (currentProcedure.name) {
        proceduresData.push({...currentProcedure});
      }
      currentProcedure = {
        name: trimmedLine.replace('Procedimento:', '').trim(),
        planName: planName,
        planId: PLAN_IDS[planName as keyof typeof PLAN_IDS]
      };
    } else if (trimmedLine.startsWith('Categoria do procedimento:')) {
      currentProcedure.category = trimmedLine.replace('Categoria do procedimento:', '').trim();
    } else if (trimmedLine.startsWith('Coparticipação (R$):')) {
      const value = trimmedLine.replace('Coparticipação (R$):', '').trim();
      currentProcedure.coparticipacao = parseMoneyToCents(value);
    } else if (trimmedLine.startsWith('Carência (Dias):')) {
      currentProcedure.carencia = trimmedLine.replace('Carência (Dias):', '').trim();
    } else if (trimmedLine.startsWith('Limites Anuais:')) {
      currentProcedure.limitesAnuais = trimmedLine.replace('Limites Anuais:', '').trim();
    }
  }
  
  // Add last procedure
  if (currentProcedure.name) {
    proceduresData.push(currentProcedure);
  }
  
  return proceduresData;
}

async function importProcedures() {
  console.log('🚀 Starting procedure import...');
  
  const files = [
    { path: 'attached_assets/BASIC_1760113735600.txt', plan: 'BASIC' },
    { path: 'attached_assets/INFINITY_1760113735600.txt', plan: 'INFINITY' },
    { path: 'attached_assets/COMFORT_1760113735600.txt', plan: 'COMFORT' },
    { path: 'attached_assets/PLATINUM_1760113735600.txt', plan: 'PLATINUM' }
  ];
  
  // Parse all files
  const allProceduresData: any[] = [];
  for (const file of files) {
    console.log(`📄 Parsing ${file.plan} file...`);
    const parsed = parseProcedureFile(file.path, file.plan);
    allProceduresData.push(...parsed);
  }
  
  console.log(`📊 Total procedure-plan records parsed: ${allProceduresData.length}`);
  
  // Group by procedure name
  const procedureMap = new Map<string, ProcedureData>();
  
  for (const proc of allProceduresData) {
    if (!procedureMap.has(proc.name)) {
      procedureMap.set(proc.name, {
        name: proc.name,
        category: proc.category,
        planData: []
      });
    }
    
    const procedureData = procedureMap.get(proc.name)!;
    procedureData.planData.push({
      planName: proc.planName,
      planId: proc.planId,
      coparticipacao: proc.coparticipacao,
      carencia: proc.carencia,
      limitesAnuais: proc.limitesAnuais
    });
  }
  
  console.log(`🔍 Unique procedures found: ${procedureMap.size}`);
  
  // Insert procedures and plan_procedures
  let proceduresCreated = 0;
  let planProceduresCreated = 0;
  
  for (const [name, data] of procedureMap) {
    try {
      // Insert procedure
      const [newProcedure] = await db.insert(procedures).values({
        name: data.name,
        category: data.category,
        isActive: true,
        displayOrder: 0
      }).returning();
      
      proceduresCreated++;
      
      // Insert plan_procedures for each plan
      for (const planData of data.planData) {
        await db.insert(planProcedures).values({
          procedureId: newProcedure.id,
          planId: planData.planId,
          price: 0, // Not provided in the data
          coparticipacao: planData.coparticipacao,
          carencia: planData.carencia,
          limitesAnuais: planData.limitesAnuais,
          isIncluded: true,
          displayOrder: 0
        });
        
        planProceduresCreated++;
      }
      
      if (proceduresCreated % 50 === 0) {
        console.log(`✅ Processed ${proceduresCreated} procedures...`);
      }
    } catch (error) {
      console.error(`❌ Error inserting procedure "${name}":`, error);
    }
  }
  
  console.log('\n✨ Import completed!');
  console.log(`📝 Procedures created: ${proceduresCreated}`);
  console.log(`🔗 Plan-procedure relationships created: ${planProceduresCreated}`);
}

importProcedures()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
