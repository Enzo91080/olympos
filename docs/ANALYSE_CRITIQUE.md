# Analyse critique & feuille de route — Activité 10

Projet : Olympos Card Clash — Enzo Aime — M2 Dev Ynov Connect

## 1. Points forts

**Le moteur de jeu est isolé et testé.** Toute la logique des règles (mana, summoning sickness, taunt implicite, overdraw, combat symétrique) vit dans `game-engine.service.ts`, séparé de la persistance (`game.service.ts`) et du transport (`game.gateway.ts`). C'est ce qui a permis d'écrire des tests unitaires sur le moteur sans mocker Redis ni les sockets.

**La gestion de la concurrence a été prise au sérieux.** L'état de partie vit dans Redis avec un TTL de 10 minutes, et un verrou `SET NX` empêche deux actions simultanées de corrompre l'état. C'est le genre de problème qu'on ne voit pas en local à un joueur, mais qui casse une partie PvP réelle.

**Le périmètre annoncé dans le document de cadrage est tenu.** Auth JWT avec rôles et bannissement, decks, matchmaking ELO ±200, PvP temps réel, historique, classement, et la fonctionnalité IA (l'Oracle via Ollama) est réellement implémentée en streaming SSE — pas un mock.

**La stack est cohérente de bout en bout.** TypeScript des deux côtés, types Prisma générés, DTO validés côté NestJS. Peu de zones non typées.

## 2. Points faibles

**GameBoard.tsx concentre trop de choses** (739 lignes) : rendu, logique de ciblage des sorts, gestion socket, animations. Toute évolution du plateau passe par ce fichier, c'est le premier candidat à la refactorisation.

**Pas de tests d'intégration.** Les tests couvrent le moteur et la persistance Redis, mais aucun test ne traverse HTTP ou WebSocket de bout en bout. Une régression sur un DTO ou un événement socket ne serait pas détectée automatiquement. (Hors périmètre du module, mais c'est une vraie dette.)

**Le bot solo est rudimentaire** : il pose la carte la moins chère et attaque systématiquement. Suffisant pour tester, pas pour intéresser un joueur.

**Des optimisations restent en attente** — détaillées dans `docs/RAPPORT_AUDIT.md` : code splitting par route, index BDD sur les colonnes de filtrage, lazy-loading des images de cartes (le poids a été réduit de 77 % mais les 37 images se chargent toujours d'un coup, LCP mesuré à 129 s sous Lighthouse).

**Dépendance à un service local pour l'IA.** Sans Ollama lancé, l'Oracle renvoie une 503. Le choix est assumé (gratuit, pas de clé API à gérer, pas de données envoyées à un tiers), mais il complique la démo sur une autre machine.

## 3. Apports du module au projet

Ce que le module a directement changé dans ma façon de construire le projet :

**Modéliser avant de coder évite de refaire le schéma en cours de route.** Écrire le MCD puis le MLD (activité 2) avant d'ouvrir `schema.prisma` m'a forcé à trancher les cardinalités à froid — par exemple qu'un joueur n'a jamais qu'une seule entrée en file de matchmaking à la fois, ou que `deck_card` est une vraie table de jonction avec une quantité bornée (1-2) plutôt qu'un simple array JSON. Ces choix, faits sur papier avant tout code, ne sont plus jamais revenus poser problème pendant les 8 activités suivantes.

**Sécuriser dès l'activité 5 plutôt qu'à la fin change l'architecture, pas juste le code.** Ayant posé le guard JWT et le hash bcrypt tôt, toutes les routes construites après (decks, parties, admin) l'ont été *avec* la contrainte d'authentification dès le départ plutôt qu'en la retrofittant. Le `AdminGuard` et le rôle `admin` sur `Player` en sont la conséquence directe : ils n'auraient pas été aussi simples à greffer sur une API déjà écrite sans notion d'utilisateur courant.

**L'activité 8 (optimisation) m'a fait mesurer plutôt que supposer.** Je pensais que réduire le poids des images de cartes (-77 %, 118 Mo → 27 Mo) suffirait. Le relevé Lighthouse fait après coup montre un LCP de 129 s malgré cette réduction : le vrai problème n'est pas le poids par image mais l'absence de lazy-loading sur les 37 images chargées d'un coup. Sans la discipline de mesurer plutôt que de juger un fix "terminé" à l'instinct, ce point serait resté invisible.

**L'activité 10 oblige à un regard honnête plutôt qu'à un pitch.** Écrire noir sur blanc que `GameBoard.tsx` fait 739 lignes ou qu'il n'y a aucun test d'intégration est inconfortable, mais c'est ce qui a permis de prioriser une vraie feuille de route au lieu de se contenter de dire que "le projet est fini".

## 4. Feuille de route post-module

### Risques identifiés

1. **Technique** : toute évolution du plateau de jeu est risquée tant que `GameBoard.tsx` n'est pas découpé.
2. **Fonctionnel** : sans tests d'intégration, chaque ajout de fonctionnalité peut casser silencieusement le parcours matchmaking → partie → fin de partie.
3. **Exploitation** : le projet n'a jamais tourné ailleurs qu'en local ; un déploiement réel (Railway/Vercel, prévus au cadrage) révélera des problèmes de configuration (CORS, URLs en dur dans `main.ts`).

### Plan d'action priorisé

| Priorité | Action | Justification |
|---|---|---|
| 1 | Tests e2e sur le flux critique (register → deck → partie solo → fin) | Sécurise tout le reste avant d'y toucher |
| 2 | Découper `GameBoard.tsx` (PlayerZone, TargetingOverlay, BattleLog) | Réduit le risque n°1 |
| 3 | Code splitting par route + index Prisma | Optimisations identifiées à l'audit, faibles en effort |
| 4 | Déploiement Railway + Vercel avec variables d'environnement propres | Valide la config hors localhost |
| 5 | Bot avec heuristiques (ciblage, courbe de mana) | Valeur joueur, mais rien ne bloque sans |
