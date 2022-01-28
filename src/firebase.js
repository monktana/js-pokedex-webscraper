import {initializeApp, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const POKEMON_COUNT = 898;

const serviceAccount = JSON.parse(fs.readFileSync('./docs/firebase.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);

(async () => {
  const pokemonData = [];

  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const file = fs.readFileSync(`./docs/personal/pokemon/${index}.json`, console.log);
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

(async () => {
  const typeData = [];
  const typeFiles = fs.readdirSync(`./docs/personal/types`, console.log);

  for (let index = 0; index < typeFiles.length; index++) {
    const fileName = path.parse(typeFiles[index]);
    const file = fs.readFileSync(`./docs/personal/types/${fileName.base}`);
    const data = JSON.parse(file);

    typeData.push(data);
  }
  const chunks = chunk(typeData, 100);

  const commits = chunks.map((chunk) => {
    const batch = db.batch();
    chunk.forEach((type) => {
      const doc = db.collection('types').doc(`${type.id}`);
      batch.set(doc, type);
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
