Lis le fichier CONTEXT.md en entier.

Ensuite lis dans cet ordre :
1. design/aura_of_olympus/DESIGN.md — système de design complet
2. design/login_register/code.html — référence Login
3. design/dashboard/code.html — référence Dashboard
4. design/deck_builder/code.html — référence Deck Builder
5. design/game_board/code.html — référence Game Board

Puis exécute tout sans demander de confirmation :

1. Crée le dossier `frontend/` et initialise :
   `npm create vite@latest frontend -- --template react-ts`

2. Dans `frontend/`, installe :
   `npm install zustand framer-motion socket.io-client react-router-dom axios`
   `npm install -D tailwindcss postcss autoprefixer @types/node`
   `npx tailwindcss init -p`

3. Configure Tailwind dans `frontend/tailwind.config.js` en copiant
   EXACTEMENT le tailwind.config du fichier design/login_register/code.html
   (couleurs, borderRadius, fontFamily)

4. Dans `frontend/index.html`, ajoute les fonts Google :
   Noto Serif + Manrope

5. Crée `frontend/.env` :
   VITE_API_URL=http://localhost:3000
   VITE_WS_URL=http://localhost:3000
   VITE_USE_MOCK=true

6. Convertis chaque code.html en composant React TypeScript
   pixel perfect en adaptant uniquement la syntaxe JSX :
   - design/login_register/code.html → frontend/src/pages/Login.tsx
   - design/dashboard/code.html → frontend/src/pages/Dashboard.tsx
   - design/deck_builder/code.html → frontend/src/pages/DeckBuilder.tsx
   - design/game_board/code.html → frontend/src/pages/GameBoard.tsx

7. Crée les composants communs extraits des pages :
   - frontend/src/components/layout/Sidebar.tsx
   - frontend/src/components/layout/Topbar.tsx

8. Crée le router dans `frontend/src/router/index.tsx` :
   - / → redirect selon auth
   - /login → Login
   - /dashboard → Dashboard (protégé)
   - /deck-builder → DeckBuilder (protégé)
   - /deck-builder/:deckId → DeckBuilder (protégé)
   - /game/:gameId → GameBoard (protégé)

9. Crée les stores Zustand :
   - frontend/src/store/authStore.ts
   - frontend/src/store/deckStore.ts
   - frontend/src/store/gameStore.ts
   Avec des données mock réalistes (VITE_USE_MOCK=true)

10. Crée les services API :
    - frontend/src/services/api.ts (instance Axios + intercepteurs JWT)
    - frontend/src/services/authService.ts
    - frontend/src/services/deckService.ts
    - frontend/src/services/gameService.ts
    Avec mock data si VITE_USE_MOCK=true

11. Crée le socket :
    - frontend/src/socket/gameSocket.ts

12. Lance `npm run dev` depuis `frontend/` et vérifie que
    les 4 pages s'affichent correctement sur le port 5173

Respecte strictement la structure définie dans CONTEXT.md.
Ne jamais hardcoder de couleurs — utiliser uniquement
les classes Tailwind du design system.