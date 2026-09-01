import { getAllElements, getAllRecipes } from './db';

const audit = async () => {
  const elements = await getAllElements();
  const nameById = new Map(elements.map(el => [el.id, el.name]));

  console.log('--- ELEMENTS ---');
  for (const el of [...elements].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${el.emoji}  ${el.name} [${el.rarity}]`);
  }

  console.log('\n--- RECIPES ---');
  const recipes = await getAllRecipes();
  for (const r of recipes) {
    const ingredientNames = r.ingredientIds.map(id => nameById.get(id) || id).join(' + ');
    console.log(`${ingredientNames} = ${nameById.get(r.resultId) || r.resultId}`);
  }

  console.log(`\nTotal elements: ${elements.length}, total recipes: ${recipes.length}`);
};

audit().catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});
