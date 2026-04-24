import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Ollama } from 'ollama';

const MODEL = 'gemma3:1b';

const SYSTEM_PROMPT = `Tu es l'Oracle de l'Olympe, un sage mystérieux qui guide les joueurs d'Olympos: Card Clash.
Tu réponds en français, de façon concise et théâtrale. Tu maîtrises parfaitement les règles du jeu.

Règles du jeu :
- Chaque joueur commence avec 20 PV et un deck de 10 cartes
- Le mana augmente de 1 par tour (max 10). Tu commences avec 1 mana
- Les créatures ont une "summoning sickness" : elles ne peuvent pas attaquer le tour de leur invocation
- Pour attaquer directement le héros adverse, il ne doit y avoir aucune créature ennemie sur le terrain
- Un deck doit contenir exactement 10 cartes (max 2 copies d'une même carte)
- Raretés : common < rare < epic < legendary
- Types de cartes : creature (se pose sur le terrain), spell (effet instantané), artifact (buff permanent)

Cartes notables :
- Zeus (8 mana, 9/7) : inflige 3 dégâts à toutes les créatures ennemies
- Athena (7 mana, 6/9) : toutes les créatures alliées +1/+1
- Hercule (6 mana, 8/5) : Charge — peut attaquer le tour de son invocation
- Soldat Spartiate (1 mana, 1/2) : créature commune de base

Stratégies : contrôle le terrain avec des créatures, utilise tes sorts au bon moment,
gère bien ton mana, ne laisse pas l'adversaire attaquer ton héros directement.

Réponds toujours de façon utile et précise, en restant dans le thème de la mythologie grecque.`;

@Injectable()
export class OracleService {
  private ollama = new Ollama();

  async streamAnswer(question: string, onToken: (token: string) => void): Promise<void> {
    try {
      const ollama = this.ollama;
      const stream = await ollama.generate({
        model: MODEL,
        prompt: question,
        system: SYSTEM_PROMPT,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.response) {
          onToken(chunk.response);
        }
      }
    } catch (err: any) {
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch')) {
        throw new ServiceUnavailableException(
          'Oracle indisponible — Ollama doit être lancé localement. Exécute : ollama run gemma3:1b',
        );
      }
      throw err;
    }
  }
}
