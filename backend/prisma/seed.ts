import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const cardData = [
  // ─── CRÉATURES LÉGENDAIRES ───────────────────────────────────────
  { name: 'Zeus, Roi des Dieux', cardType: 'creature', manaCost: 8, attack: 9, defense: 7, effectText: 'Lorsque Zeus entre en jeu, inflige 3 dégâts à toutes les créatures ennemies.', rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=zeus' },
  { name: 'Athena, Déesse de la Sagesse', cardType: 'creature', manaCost: 7, attack: 6, defense: 9, effectText: 'Toutes tes créatures gagnent +1/+1. Pioche une carte à chaque début de tour.', rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=athena' },
  { name: 'Poséidon, Maître des Mers', cardType: 'creature', manaCost: 7, attack: 7, defense: 7, effectText: "Provoque. Lorsqu'il attaque, étourdit la créature ciblée pendant 1 tour.", rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=poseidon' },
  { name: "Hadès, Seigneur des Enfers", cardType: 'creature', manaCost: 8, attack: 8, defense: 6, effectText: "Lorsqu'une créature ennemie meurt, reviens avec la moitié de ses points d'attaque.", rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hades' },
  // ─── CRÉATURES ÉPIQUES ───────────────────────────────────────────
  { name: 'Hercule le Demi-Dieu', cardType: 'creature', manaCost: 6, attack: 8, defense: 5, effectText: 'Charge. Peut attaquer le jour même où il entre en jeu.', rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hercule' },
  { name: 'Méduse la Gorgone', cardType: 'creature', manaCost: 5, attack: 6, defense: 4, effectText: 'Pétrifie : toute créature qui attaque Méduse est immobilisée 1 tour.', rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=meduse' },
  { name: 'Achille aux Pieds Légers', cardType: 'creature', manaCost: 5, attack: 7, defense: 3, effectText: "Esquive les attaques des créatures à 3 d'attaque ou moins.", rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=achille' },
  { name: 'Minotaure du Labyrinthe', cardType: 'creature', manaCost: 5, attack: 7, defense: 5, effectText: "Provoque. +2 attaque si l'adversaire a 3 créatures ou plus en jeu.", rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=minotaure' },
  { name: 'Hydre de Lerne', cardType: 'creature', manaCost: 6, attack: 5, defense: 6, effectText: "Régénération : si l'Hydre survit à une attaque, gagne +2 d'attaque.", rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hydre' },
  // ─── CRÉATURES RARES ─────────────────────────────────────────────
  { name: 'Pégase Ailé', cardType: 'creature', manaCost: 4, attack: 4, defense: 3, effectText: "Vol : ne peut être attaqué que par d'autres créatures volantes.", rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=pegase' },
  { name: 'Cyclope de Sicile', cardType: 'creature', manaCost: 4, attack: 6, defense: 2, effectText: "Frappe brutale : inflige 1 dégât au joueur adverse en plus lors d'une attaque.", rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=cyclope' },
  { name: 'Centaure Chiron', cardType: 'creature', manaCost: 3, attack: 3, defense: 4, effectText: 'Soins : restaure 2 PV au joueur allié à chaque fin de ton tour.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=chiron' },
  { name: 'Sphinx de Thèbes', cardType: 'creature', manaCost: 4, attack: 4, defense: 4, effectText: "Énigme : l'adversaire doit défausser une carte aléatoire lorsque le Sphinx entre en jeu.", rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=sphinx' },
  { name: 'Gorgone Sthéno', cardType: 'creature', manaCost: 3, attack: 3, defense: 3, effectText: 'Venin : les créatures blessées par Sthéno perdent 1 attaque.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=stheno' },
  { name: 'Harpie du Vent', cardType: 'creature', manaCost: 3, attack: 4, defense: 2, effectText: 'Vol. Vole 1 carte à la main adverse quand elle inflige des dégâts directs.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=harpie' },
  // ─── CRÉATURES COMMUNES ──────────────────────────────────────────
  { name: 'Soldat Spartiate', cardType: 'creature', manaCost: 1, attack: 1, defense: 2, effectText: null, rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=spartiate' },
  { name: 'Archer Athénien', cardType: 'creature', manaCost: 2, attack: 2, defense: 1, effectText: 'Portée : peut attaquer les créatures en retrait.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=archer' },
  { name: 'Satyre des Bois', cardType: 'creature', manaCost: 2, attack: 2, defense: 2, effectText: null, rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=satyre' },
  { name: 'Nymphe Aquatique', cardType: 'creature', manaCost: 2, attack: 1, defense: 3, effectText: 'Régénération : récupère 1 PV en défense à chaque tour.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nymphe' },
  { name: 'Fantôme des Enfers', cardType: 'creature', manaCost: 1, attack: 2, defense: 1, effectText: null, rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=fantome' },
  // ─── SORTS LÉGENDAIRES ───────────────────────────────────────────
  { name: "Foudre de l'Olympe", cardType: 'spell', manaCost: 7, attack: null, defense: null, effectText: 'Inflige 7 dégâts à une créature ou directement au joueur adverse.', rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=foudre' },
  // ─── SORTS ÉPIQUES ───────────────────────────────────────────────
  { name: 'Colère de Poséidon', cardType: 'spell', manaCost: 5, attack: null, defense: null, effectText: 'Détruit toutes les créatures ennemies avec 3 défense ou moins.', rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=colere-poseidon' },
  { name: "Malédiction d'Hadès", cardType: 'spell', manaCost: 4, attack: null, defense: null, effectText: "Réduit l'attaque de toutes les créatures ennemies de 3 jusqu'à la fin du tour.", rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=malediction' },
  // ─── SORTS RARES ─────────────────────────────────────────────────
  { name: "Bénédiction d'Athena", cardType: 'spell', manaCost: 3, attack: null, defense: null, effectText: "Pioche 3 cartes. Une créature alliée gagne +2/+2 jusqu'à la fin du tour.", rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=benediction' },
  { name: "Flèche d'Apollon", cardType: 'spell', manaCost: 2, attack: null, defense: null, effectText: 'Inflige 3 dégâts à une créature ciblée.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=fleche-apollon' },
  { name: 'Brume du Styx', cardType: 'spell', manaCost: 3, attack: null, defense: null, effectText: 'Toutes les créatures ennemies perdent leur capacité spéciale pendant 2 tours.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=brume-styx' },
  // ─── SORTS COMMUNS ───────────────────────────────────────────────
  { name: 'Frappe Divine', cardType: 'spell', manaCost: 1, attack: null, defense: null, effectText: 'Inflige 2 dégâts à une créature ciblée.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=frappe-divine' },
  { name: 'Soin des Muses', cardType: 'spell', manaCost: 2, attack: null, defense: null, effectText: 'Restaure 4 PV au joueur allié.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=soin-muses' },
  { name: 'Invocation Mineure', cardType: 'spell', manaCost: 1, attack: null, defense: null, effectText: 'Invoque un Soldat Spartiate (1/2) sur le champ de bataille.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=invocation' },
  // ─── ARTEFACTS LÉGENDAIRES ───────────────────────────────────────
  { name: "Égide d'Athena", cardType: 'artifact', manaCost: 6, attack: null, defense: null, effectText: "Permanent. Tes créatures ont +2 défense. Une fois par tour, annule les dégâts d'un sort adverse.", rarity: 'legendary', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=egide' },
  // ─── ARTEFACTS ÉPIQUES ───────────────────────────────────────────
  { name: 'Trident de Poséidon', cardType: 'artifact', manaCost: 5, attack: null, defense: null, effectText: 'Équipe une créature. Elle gagne +3 attaque et Provoque.', rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=trident' },
  { name: "Casque d'Hadès", cardType: 'artifact', manaCost: 4, attack: null, defense: null, effectText: "La créature équipée devient invisible : elle ne peut pas être ciblée par des sorts adverses.", rarity: 'epic', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=casque-hades' },
  // ─── ARTEFACTS RARES ─────────────────────────────────────────────
  { name: "Sandales d'Hermès", cardType: 'artifact', manaCost: 3, attack: null, defense: null, effectText: 'La créature équipée gagne Charge et +2 attaque ce tour.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=sandales' },
  { name: "Lyre d'Orphée", cardType: 'artifact', manaCost: 3, attack: null, defense: null, effectText: 'Permanent. Pioche 1 carte supplémentaire à chaque début de ton tour.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=lyre' },
  { name: 'Bouclier de Persée', cardType: 'artifact', manaCost: 2, attack: null, defense: null, effectText: 'Équipe une créature. Elle gagne +3 défense.', rarity: 'rare', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=bouclier-persee' },
  // ─── ARTEFACTS COMMUNS ───────────────────────────────────────────
  { name: "Amulette d'Héra", cardType: 'artifact', manaCost: 1, attack: null, defense: null, effectText: "Restaure 2 PV au joueur allié quand cet artefact entre en jeu.", rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=amulette' },
  { name: 'Torche de Prométhée', cardType: 'artifact', manaCost: 2, attack: null, defense: null, effectText: 'Inflige 1 dégât par tour à toutes les créatures ennemies.', rarity: 'common', imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=torche' },
]

async function main() {
  // ── 1. Cards (idempotent) ─────────────────────────────────────────────────
  const cardCount = await prisma.card.count()
  if (cardCount === 0) {
    console.log('🌱 Seeding cards...')
    const cards = await prisma.card.createMany({ data: cardData })
    console.log(`✅ ${cards.count} cartes créées.`)
  } else {
    console.log(`ℹ️  ${cardCount} cartes déjà en base, skip.`)
  }

  // ── 2. Bot player (upsert) ────────────────────────────────────────────────
  console.log('🤖 Setting up bot player...')
  const bot = await prisma.player.upsert({
    where: { email: 'bot@olympos.internal' },
    update: {},
    create: {
      username: 'Rival Deity',
      email: 'bot@olympos.internal',
      passwordHash: await bcrypt.hash('bot-cannot-login-xxxxxxxxxxx', 10),
      eloScore: 1200,
    },
  })
  console.log(`✅ Bot player: ${bot.username} (id: ${bot.id})`)

  // ── 3. Bot deck (idempotent) ──────────────────────────────────────────────
  const existingBotDeck = await prisma.deck.findFirst({
    where: { playerId: bot.id, isValid: true },
  })

  if (!existingBotDeck) {
    console.log('🃏 Creating bot deck...')
    // Use all creature cards (up to 15 unique × 2 = 30)
    const creatures = await prisma.card.findMany({
      where: { cardType: 'creature' },
      take: 15,
    })

    if (creatures.length < 15) {
      throw new Error(`Not enough creature cards to build bot deck (found ${creatures.length}, need 15)`)
    }

    const deck = await prisma.deck.create({
      data: {
        name: 'Wrath of Olympus',
        playerId: bot.id,
        isValid: true,
        deckCards: {
          create: creatures.map((c) => ({ cardId: c.id, quantity: 2 })),
        },
      },
    })
    console.log(`✅ Bot deck created: ${deck.name}`)
  } else {
    console.log(`ℹ️  Bot deck already exists, skip.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
