import {initializeApp, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./docs/firebase.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);

(async () => {
  const pokemonData = [];

  for (let index = 1; index <= 898; index++) {
    const file = fs.readFileSync(`./docs/personal/pokemon_${index}.json`, console.log);
    const data = JSON.parse(file);

    pokemonData.push(data);
  }
  const chunks = chunk(pokemonData, 100);

  const commits = chunks.map((chunk) => {
    const batch = db.batch();
    chunk.forEach((pokemon) => {
      const doc = db.collection('pokemon').doc(`${pokemon.id}`);
      batch.set(doc, pokemon);
    });
    return batch.commit();
  });
  await Promise.all(commits);
})();

/**
 * Splits the array into chucks of the specified size.
 *
 * @param {array} input
 * @param {number} size
 * @return {array} array containing chunks
 */
function chunk(input, size) {
  return input.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index/size);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);
}
