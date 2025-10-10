import { db } from '../server/db';
import { procedures, planProcedures, plans } from '../shared/schema';
import { readFileSync } from 'fs';
import { eq, and } from 'drizzle-orm';

interface ProcedureData {
  name: string;
  category: string;
  plan: string;
  coparticipacao: string;
  carencia: string;
  limitesAnuais: string;
}

function parseMoneyToNumber(value: string): number {
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) * 100);
}

function parseBasicFile(content: string): ProcedureData[] {
  const procedures: ProcedureData[] = [];
  const lines = content.split('\n');
  
  let currentProcedure: Partial<ProcedureData> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Procedimento:')) {
      if (currentProcedure.name) {
        procedures.push(currentProcedure as ProcedureData);
      }
      currentProcedure = {
        name: trimmed.replace('Procedimento:', '').trim()
      };
    } else if (trimmed.startsWith('Categoria do procedimento:')) {
      currentProcedure.category = trimmed.replace('Categoria do procedimento:', '').trim();
    } else if (trimmed.startsWith('Plano:')) {
      currentProcedure.plan = trimmed.replace('Plano:', '').trim();
    } else if (trimmed.startsWith('Coparticipação (R$):')) {
      currentProcedure.coparticipacao = trimmed.replace('Coparticipação (R$):', '').trim();
    } else if (trimmed.startsWith('Carência (Dias):')) {
      currentProcedure.carencia = trimmed.replace('Carência (Dias):', '').trim();
    } else if (trimmed.startsWith('Limites Anuais:')) {
      currentProcedure.limitesAnuais = trimmed.replace('Limites Anuais:', '').trim();
    }
  }
  
  if (currentProcedure.name) {
    procedures.push(currentProcedure as ProcedureData);
  }
  
  return procedures;
}

function parseInlineFile(content: string): ProcedureData[] {
  const procedures: ProcedureData[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const nameMatch = line.match(/Procedimento:\s*([^C]+?)\s*Categoria do procedimento:/);
    const categoryMatch = line.match(/Categoria do procedimento:\s*([^P]+?)\s*Plano:/);
    const planMatch = line.match(/Plano:\s*([^C]+?)\s*Coparticipação/);
    const coparticipacaoMatch = line.match(/Coparticipação \(R\$\):\s*([^C]+?)\s*Carência/);
    const carenciaMatch = line.match(/Carência \(Dias\):\s*([^L]+?)\s*Limites Anuais:/);
    const limitesMatch = line.match(/Limites Anuais:\s*(.+?)$/);
    
    if (nameMatch && categoryMatch && planMatch) {
      procedures.push({
        name: nameMatch[1].trim(),
        category: categoryMatch[1].trim(),
        plan: planMatch[1].trim(),
        coparticipacao: coparticipacaoMatch ? coparticipacaoMatch[1].trim() : 'R$ 0,00',
        carencia: carenciaMatch ? carenciaMatch[1].trim() : '0',
        limitesAnuais: limitesMatch ? limitesMatch[1].trim() : ''
      });
    }
  }
  
  return procedures;
}

async function main() {
  try {
    console.log('🚀 Iniciando importação de procedimentos...\n');
    
    const basicContent = readFileSync('attached_assets/BASIC_1760116116607.txt', 'utf-8');
    const comfortContent = readFileSync('attached_assets/COMFORT_1760116116607.txt', 'utf-8');
    const infinityContent = readFileSync('attached_assets/INFINITY_1760116116607.txt', 'utf-8');
    const platinumContent = readFileSync('attached_assets/PLATINUM_1760116116607.txt', 'utf-8');
    
    const basicProcedures = parseBasicFile(basicContent);
    const comfortProcedures = parseBasicFile(comfortContent);
    const infinityProcedures = parseInlineFile(infinityContent);
    const platinumProcedures = parseInlineFile(platinumContent);
    
    const allProcedures = [
      ...basicProcedures.map(p => ({ ...p, planName: 'BASIC' })),
      ...comfortProcedures.map(p => ({ ...p, planName: 'COMFORT' })),
      ...infinityProcedures.map(p => ({ ...p, planName: 'INFINITY' })),
      ...platinumProcedures.map(p => ({ ...p, planName: 'PLATINUM' }))
    ];
    
    console.log(`📊 Total de registros encontrados: ${allProcedures.length}`);
    console.log(`   - BASIC: ${basicProcedures.length}`);
    console.log(`   - COMFORT: ${comfortProcedures.length}`);
    console.log(`   - INFINITY: ${infinityProcedures.length}`);
    console.log(`   - PLATINUM: ${platinumProcedures.length}\n`);
    
    const allPlans = await db.select().from(plans);
    const planMap = new Map(allPlans.map(p => [p.name, p.id]));
    
    console.log('📋 Planos encontrados no banco:');
    allPlans.forEach(plan => console.log(`   - ${plan.name} (${plan.id})`));
    console.log('');
    
    const uniqueProceduresMap = new Map<string, { name: string; category: string; plans: Array<{ planName: string; data: typeof allProcedures[0] }> }>();
    
    for (const proc of allProcedures) {
      if (!uniqueProceduresMap.has(proc.name)) {
        uniqueProceduresMap.set(proc.name, {
          name: proc.name,
          category: proc.category,
          plans: []
        });
      }
      uniqueProceduresMap.get(proc.name)!.plans.push({
        planName: proc.planName,
        data: proc
      });
    }
    
    console.log(`🔍 Procedimentos únicos identificados: ${uniqueProceduresMap.size}\n`);
    
    let insertedProcedures = 0;
    let insertedRelations = 0;
    
    for (const [procName, procInfo] of uniqueProceduresMap) {
      let procedureId: string;
      
      const existingProcedure = await db
        .select()
        .from(procedures)
        .where(eq(procedures.name, procName))
        .limit(1);
      
      if (existingProcedure.length > 0) {
        procedureId = existingProcedure[0].id;
        console.log(`⏭️  Procedimento já existe: ${procName}`);
      } else {
        const [newProcedure] = await db
          .insert(procedures)
          .values({
            name: procName,
            category: procInfo.category,
            isActive: true,
            displayOrder: 0
          })
          .returning();
        
        procedureId = newProcedure.id;
        insertedProcedures++;
        console.log(`✅ Inserido procedimento: ${procName}`);
      }
      
      for (const planData of procInfo.plans) {
        const planId = planMap.get(planData.planName);
        
        if (!planId) {
          console.log(`⚠️  Plano não encontrado: ${planData.planName}`);
          continue;
        }
        
        const coparticipacaoValue = parseMoneyToNumber(planData.data.coparticipacao);
        
        let carenciaFormatted = planData.data.carencia;
        if (carenciaFormatted && carenciaFormatted.trim() !== '' && /^\d+$/.test(carenciaFormatted.trim())) {
          carenciaFormatted = `${carenciaFormatted.trim()} dias`;
        }
        
        let limitesFormatted = planData.data.limitesAnuais;
        if (limitesFormatted && limitesFormatted.trim() !== '') {
          if (limitesFormatted.toUpperCase() === 'ILIMITADO') {
            limitesFormatted = 'ILIMITADO';
          } else if (/^\d+$/.test(limitesFormatted.trim())) {
            limitesFormatted = `${limitesFormatted.trim()} vezes no ano`;
          }
        } else {
          limitesFormatted = '0';
        }
        
        try {
          await db.insert(planProcedures).values({
            planId,
            procedureId,
            price: 0,
            isIncluded: true,
            coparticipacao: coparticipacaoValue,
            carencia: carenciaFormatted,
            limitesAnuais: limitesFormatted,
            payValue: 0,
            displayOrder: 0
          });
          
          insertedRelations++;
          console.log(`   ✅ Vinculado ao plano: ${planData.planName} (Coparticipação: R$ ${(coparticipacaoValue / 100).toFixed(2)}, Carência: ${carenciaFormatted}, Limites: ${limitesFormatted})`);
        } catch (error: any) {
          if (error.code === '23505') {
            console.log(`   ⏭️  Relação já existe: ${procName} - ${planData.planName}`);
          } else {
            console.error(`   ❌ Erro ao vincular: ${procName} - ${planData.planName}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n✨ Importação concluída com sucesso!');
    console.log(`   📝 Procedimentos inseridos: ${insertedProcedures}`);
    console.log(`   🔗 Relações criadas: ${insertedRelations}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    process.exit(1);
  }
}

main();
