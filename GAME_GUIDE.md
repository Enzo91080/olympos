# Olympos: Card Clash — Guide du joueur

## Objectif

Réduire les **Points de Vie (PV) du héros adverse de 20 à 0**.  
Le premier joueur à atteindre 0 PV perd la partie.

---

## L'interface de jeu

```
┌─────────────────────────────────────────────────────────────────┐
│  ARCHIVES (journal)  │  PHASE / TOUR  │  YOUR TURN / ENEMY TURN │
├──────────────────────┼────────────────────────────────────────── │
│                      │   [ Héros ennemi — HP / Mana ]           │
│  Journal des         │   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │
│  actions             │   │  │ │  │ │  │ │  │ │  │ │  │        │
│  (lecture seule)     │   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘        │
│                      │          TERRAIN ENNEMI                   │
│                      │  ──────────── ⚡ ────────────────         │
│                      │          VOTRE TERRAIN                    │
│                      │   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │
│                      │   │  │ │  │ │  │ │  │ │  │ │  │        │
│                      │   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘        │
│                      │                                           │
│  Votre avatar        │   [ Votre main — 4 à 7 cartes ]          │
├──────────────────────┴───────────────────────────────────────────┤
│  Panneau droit : Deck restant │ Bouton END TURN │ Vos HP / Mana  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Le tour par tour

### Structure d'un tour
1. **Début de tour** : vous recevez automatiquement +1 cristal de mana (max 10) et piochez 1 carte.
2. **Phase d'action** : jouez autant de cartes que votre mana le permet, dans n'importe quel ordre.
3. **Fin de tour** : cliquez **END TURN**. L'adversaire joue alors automatiquement.

> Le mana non dépensé est **perdu** à la fin du tour — il ne s'accumule pas.

### Progression du mana
| Tour joueur | Mana disponible |
|-------------|-----------------|
| 1           | 1               |
| 2           | 2               |
| 3           | 3               |
| …           | …               |
| 10+         | 10 (maximum)    |

---

## Les cartes

Chaque carte possède :
- **Coût en mana** (cercle en haut à gauche) — ce que vous devez payer pour la jouer
- **Attaque** (chiffre en bas à gauche, fond doré) — dégâts infligés lors d'un combat
- **Défense** (chiffre en bas à droite, fond rouge) — PV de la créature ; tombe à 0 = détruite
- **Texte d'effet** — capacité spéciale de la carte

### Raretés
| Rareté     | Couleur  | Puissance générale |
|------------|----------|--------------------|
| Commune    | Blanc    | Faible             |
| Rare       | Bleu     | Moyenne            |
| Épique     | Violet   | Élevée             |
| Légendaire | Doré     | Très élevée        |

---

## Les 3 types de cartes

### 1. Créatures
Cartes permanentes qui restent sur votre terrain et combattent.

**Pour invoquer une créature :**
1. Cliquez la créature dans votre main (elle se surélève)
2. La bannière affiche `→ Click an empty slot to play`
3. Cliquez une case **vide** de votre terrain (6 cases disponibles)

**Règle importante — Mal des invocations :**  
Une créature invoquée **ne peut pas attaquer le tour où elle arrive**.  
Elle est signalée par une icône ⏳ et une opacité réduite.  
Elle pourra attaquer dès le tour suivant.

**Pour attaquer avec une créature :**
1. Cliquez votre créature sur le terrain (elle se met en surbrillance dorée)
2. La bannière affiche `→ Click an enemy to attack`
3. Cliquez une **créature ennemie** pour l'attaquer — ou le **héros ennemi** si le terrain adverse est vide
4. Le combat se résout simultanément : les deux créatures s'infligent mutuellement leurs dégâts

**Résolution du combat :**
- La défense de chaque créature est réduite par l'attaque de l'adversaire
- Une créature dont la défense tombe à ≤ 0 est **détruite**
- Une créature peut attaquer **une seule fois par tour**
- Après une attaque, la créature est marquée comme ayant attaqué (point gris en haut à droite)

> **Attaque directe au héros :** vous ne pouvez attaquer le héros adverse directement que si son terrain est **entièrement vide**. Tant qu'il a des créatures, vous devez les éliminer d'abord.

---

### 2. Sorts

Cartes à usage unique qui produisent un effet immédiat puis disparaissent.

Il existe 4 comportements selon le sort :

#### Sorts ciblés (`targeted` / `targeted_creature`)
Nécessitent de choisir une cible après sélection.

1. Cliquez le sort dans votre main
2. La bannière affiche `→ Click an enemy to cast`
3. Cliquez une **créature ennemie** (ou le **héros** pour les sorts `targeted`)

| Carte | Cible | Effet |
|-------|-------|-------|
| Frappe Divine (1 mana) | Créature ennemie | 2 dégâts |
| Flèche d'Apollon (2 mana) | Créature ennemie | 3 dégâts |
| Foudre de l'Olympe (7 mana) | Créature ou héros ennemi | 7 dégâts |

#### Sorts de zone (`aoe_enemy`)
S'appliquent automatiquement à **toutes** les créatures ennemies.

1. Cliquez le sort dans votre main
2. Un bouton **Cast ✦** apparaît dans la bannière
3. Cliquez **Cast ✦** pour déclencher l'effet

> Ces sorts sont **grisés et inutilisables** si le terrain ennemi est vide.

| Carte | Mana | Effet |
|-------|------|-------|
| Brume du Styx | 3 | 2 dégâts à toutes les créatures ennemies |
| Colère de Poséidon | 5 | 3 dégâts à toutes les créatures ennemies |
| Torche de Prométhée | 2 | 1 dégât à toutes les créatures ennemies |

#### Sorts sur soi (`self`)
S'appliquent automatiquement au joueur ou à ses créatures.

1. Cliquez le sort dans votre main
2. Un bouton **Cast ✦** apparaît dans la bannière
3. Cliquez **Cast ✦**

| Carte | Mana | Effet |
|-------|------|-------|
| Soin des Muses | 2 | +4 PV |
| Bénédiction d'Athena | 3 | +3 PV |
| Lyre d'Orphée | 3 | +2 PV |
| Amulette d'Héra | 1 | +2 PV |
| Égide d'Athena | 6 | +2 défense à toutes vos créatures |

#### Sorts d'invocation (`summon`)
Invoquent directement une créature sur votre terrain.

1. Cliquez le sort dans votre main
2. Un bouton **Cast ✦** apparaît dans la bannière
3. Cliquez **Cast ✦**

> Ces sorts sont **grisés** si votre terrain est plein (6 créatures).

| Carte | Mana | Effet |
|-------|------|-------|
| Invocation Mineure | 1 | Invoque un Soldat Spartiate (1 ATK / 2 DEF) |

---

### 3. Artefacts

Cartes qui **équipent une créature alliée** pour lui donner des bonus permanents.

1. Cliquez l'artefact dans votre main
2. La bannière affiche `→ Click an empty slot to play` (pour les artefacts `self`) ou un bouton **Cast ✦**
3. Pour les artefacts `equip` : cliquez une **créature alliée** déjà sur le terrain

> Les artefacts `equip` sont **grisés** si vous n'avez aucune créature sur le terrain.

| Carte | Mana | Effet |
|-------|------|-------|
| Trident de Poséidon | 5 | Créature ciblée +3 ATK |
| Casque d'Hadès | 4 | Créature ciblée +2 ATK / +2 DEF |
| Sandales d'Hermès | 3 | Créature ciblée +2 ATK + peut attaquer immédiatement |
| Bouclier de Persée | 2 | Créature ciblée +3 DEF |

---

## Le deck

- Votre deck contient **30 cartes**
- Vous commencez avec **4 cartes en main**, dont au moins une jouable au tour 1
- Vous **piochez 1 carte** au début de chaque tour
- Le compteur **REMAINING** (panneau droit) indique le nombre de cartes restantes dans votre deck

---

## Indicateurs visuels

| Élément | Signification |
|---------|---------------|
| Carte surélévée dans la main | Carte sélectionnée |
| Bordure dorée pulsante sur une case vide | Case où vous pouvez jouer une créature |
| Bordure rouge pulsante sur le terrain ennemi | Créature/héros ciblable pour une attaque ou un sort |
| Créature à 50% d'opacité + icône ⏳ | Mal des invocations — ne peut pas attaquer ce tour |
| Carte en main grisée (bordure normale) | Pas assez de mana |
| Carte en main grisée (bordure rouge subtile) | Mana suffisant mais aucune cible valide |
| Bannière `✗ Aucune créature ennemie à cibler` | Sort de zone inutilisable sans cibles |
| Bannière `✗ Votre terrain est plein` | Invocation impossible |
| Point gris en haut à droite d'une créature | A déjà attaqué ce tour |

---

## L'adversaire (Bot)

L'adversaire est contrôlé par le jeu. À chaque tour ennemi :
1. Il **pioche une carte**
2. Il **invoque une créature** s'il peut se le permettre en mana
3. Il **attaque avec toutes ses créatures** disponibles — en priorité vos créatures, sinon votre héros directement

Le bot joue de façon prévisible — apprenez à lire ses créatures et anticipez ses attaques.

---

## Stratégies de base

**Contrôle du terrain**  
Éliminer les créatures ennemies avant d'attaquer le héros. Tant que l'adversaire a des créatures, vous ne pouvez pas attaquer son héros directement.

**Courbe de mana**  
Construisez un deck avec des créatures à chaque coût (1, 2, 3, 4…) pour toujours avoir quelque chose à jouer. Ne mettez pas que des cartes coûteuses.

**Sorts de dégâts**  
Utilisez Frappe Divine et Flèche d'Apollon pour éliminer les petites créatures sans exposer les vôtres au combat.

**Soins**  
Soin des Muses (+4 PV) et Bénédiction d'Athena (+3 PV) peuvent retourner une partie quand vous êtes bas en PV.

**Artefacts**  
Les artefacts d'équipement sont puissants sur une créature déjà solide. Casque d'Hadès sur un Cyclope de Sicile (4+2 ATK / 2+2 DEF) crée une menace difficile à gérer.

---

## Conditions de victoire et de défaite

- **Victoire** : le héros adverse atteint 0 PV → écran VICTORY
- **Défaite** : votre héros atteint 0 PV → écran DEFEAT
- Depuis l'écran de fin : **Play Again** relance une nouvelle partie, **Dashboard** retourne au menu principal
