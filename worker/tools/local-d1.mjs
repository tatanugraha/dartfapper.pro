// Local test adapter only; deployed Worker uses the real D1 binding.
import {DatabaseSync} from 'node:sqlite';
export function localD1(schema){
  const database=new DatabaseSync(':memory:');database.exec(schema);
  const prepare=sql=>{
    let values=[];const query={bind(...args){values=args;return query;},async first(){return database.prepare(sql).get(...values)??null;},
      async run(){return {meta:database.prepare(sql).run(...values)};},async all(){return {results:database.prepare(sql).all(...values)};}};
    return query;
  };
  return {prepare,async batch(statements){database.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());database.exec('COMMIT');return result;}catch(error){database.exec('ROLLBACK');throw error;}},close:()=>database.close()};
}
