# Rapport d'audit — Activité 8 (Optimisation)

Projet : Olympos Card Clash — Enzo Aime — M2 Dev Ynov Connect

## Méthode

Audit mené sur trois axes : poids des assets servis au navigateur, requêtes Prisma côté API, organisation du code. Outils : DevTools (onglet Network), lecture des requêtes générées par Prisma, mesure directe de la taille des fichiers.

## Problèmes détectés

1. **Images de cartes surdimensionnées.** Les 37 illustrations étaient des PNG de 1024×1536 (~3 Mo chacune, 118 Mo au total) alors qu'elles sont affichées au maximum en ~250 px de large dans le deck builder et le plateau. Premier chargement de la galerie très lourd, surtout hors localhost.
2. **Historique non borné.** `GET /games/history` faisait un `findMany` sans `take` : la requête chargeait l'intégralité des parties du joueur, avec un coût qui grandit à chaque partie jouée.
3. **Bundle frontend monolithique.** Le build Vite produit un seul fichier JS de ~636 Ko : aucun découpage par route (`React.lazy`), toutes les pages sont chargées dès le login.
4. **Index BDD manquants.** Les colonnes filtrées régulièrement (`Game.player1Id`, `Game.player2Id`, `Game.status`, `GameAction.gameId`) n'ont pas d'index dédié — seules les contraintes uniques en créent. Impact invisible avec peu de données, réel à terme.
5. ~~Hygiène du dépôt.~~ Le dossier `backend/coverage/` (rapports HTML générés) était commité, ce qui alourdissait le dépôt et polluait les diffs. **Corrigé** — voir Actions menées.
6. **Composant GameBoard trop gros.** `GameBoard.tsx` fait 739 lignes (rendu + logique de ciblage + socket) ; il concentre l'essentiel de la complexité front.

## Actions d'optimisation menées

1. **Redimensionnement des images** à 512×768 (Lanczos, PNG optimisé), sans renommage — donc aucun changement de code ni de seed. Résultat mesuré : **118,2 Mo → 27,0 Mo, soit −77 %**.
2. **Pagination de l'historique** : ajout d'un `take` (50 par défaut) sur `getHistory()`. La réponse est bornée quel que soit le nombre de parties jouées.
3. **Retrait de `backend/coverage/` du dépôt** : ajouté à `.gitignore`, 64 fichiers générés désindexés (voir point 5 des problèmes détectés).

## Gains mesurés

- Poids total des cartes : −77 % (mesure directe sur les fichiers, 118,2 Mo → 27,0 Mo).
- Temps de chargement du deck builder (relevé Lighthouse 13.4, session admin authentifiée, cache HTTP purgé avant mesure — profil de débit simulé par défaut de l'outil) :
  - Poids total de la page : **30 713 Kio**, dont **≈ 25,7 Mio pour les 37 images de cartes** (26 981 039 octets) — cohérent avec les 27,0 Mo mesurés directement sur les fichiers.
  - Score Performance Lighthouse : **29/100**. LCP : **129,3 s**, TBT : 1 640 ms.
  - Un nouveau relevé "avant" n'est pas reproductible (les fichiers originaux de 118,2 Mo ont été remplacés lors de l'optimisation) ; on ne retient donc pas de chiffre "avant" précis, seule l'estimation proportionnelle sur le poids (×4,4) donnerait un ordre de grandeur.
  - **Constat additionnel** : malgré la réduction de poids, le LCP reste très élevé car les 37 images sont chargées d'un coup au montage de la page, sans lazy-loading ni pagination — la compression a traité le symptôme (poids), pas la cause (chargement non différé). Piste retenue dans `docs/ANALYSE_CRITIQUE.md`.

## Points identifiés mais non traités (priorisés pour la suite)

Code splitting par route avec `React.lazy`, ajout des index Prisma (`@@index`) avec migration dédiée, découpage de `GameBoard.tsx` en sous-composants, lazy-loading des images de cartes dans le deck builder (`loading="lazy"` + pagination/virtualisation). Détail et priorisation dans `docs/ANALYSE_CRITIQUE.md`.
