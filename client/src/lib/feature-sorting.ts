/**
 * Função para ordenar features de planos de forma que textos que quebram de linha
 * fiquem por último na lista
 * 
 * @param features Array de strings com as features do plano
 * @returns Array ordenado com features que quebram linha por último
 */
export function sortFeaturesByLineBreak(features: string[]): string[] {
  // Separar features em dois grupos: que quebram linha e que não quebram
  const singleLineFeatures: string[] = [];
  const multiLineFeatures: string[] = [];
  
  features.forEach(feature => {
    // Verificar se a feature contém quebras de linha ou é muito longa
    // Features que contêm "/" ou são muito longas tendem a quebrar linha
    if (feature.includes('/') || feature.length > 40) {
      multiLineFeatures.push(feature);
    } else {
      singleLineFeatures.push(feature);
    }
  });
  
  // Retornar primeiro as features de linha única, depois as que quebram linha
  return [...singleLineFeatures, ...multiLineFeatures];
}

/**
 * Função para dividir features em duas colunas, mantendo a ordem
 * e garantindo que features que quebram linha fiquem por último
 * 
 * @param features Array de strings com as features do plano
 * @returns Objeto com duas arrays: leftColumn e rightColumn
 */
export function splitFeaturesIntoColumns(features: string[]): {
  leftColumn: string[];
  rightColumn: string[];
} {
  const sortedFeatures = sortFeaturesByLineBreak(features);
  const midPoint = Math.ceil(sortedFeatures.length / 2);
  
  return {
    leftColumn: sortedFeatures.slice(0, midPoint),
    rightColumn: sortedFeatures.slice(midPoint)
  };
}
