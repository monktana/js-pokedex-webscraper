import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./docs/firebase.json'));

const app = initializeApp({
  credential: cert(serviceAccount)
});
let db = getFirestore(app);

(async () => {
  const pokemonArray = [];

  for (let index = 1; index <= 800; index++) {
    const pokemon = JSON.parse(fs.readFileSync(`./docs/personal/pokemon_${index}.json`, console.log));
    pokemonArray.push(pokemon);
  }
  const pokemonChunks = chunk(pokemonArray, 100);

  const commitPromises = pokemonChunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(pokemon => {
      const doc = db.collection('pokemon').doc(`${pokemon.id}`);
      batch.set(doc, pokemon);
    });
    return batch.commit();
  });
  await Promise.all(commitPromises);
})();

function chunk (input, size) {
  return input.reduce((resultArray, item, index) => { 
    const chunkIndex = Math.floor(index/size);

    if(!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []
    }
  
    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [])
}