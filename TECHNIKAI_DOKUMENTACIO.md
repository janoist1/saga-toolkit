# Saga Toolkit - Technikai Dokumentáció

Ez a dokumentum részletesen leírja a `saga-toolkit` működését, belső mechanizmusait és architektúráját. A könyvtár elsődleges célja, hogy áthidalja a szakadékot a Redux Toolkit (RTK) modern `createAsyncThunk` API-ja és a Redux Saga aszinkron folyamatkezelése között.

## 1. Architekturális Áttekintés

A `saga-toolkit` működésének alapja egy **"Promise Bridge"** minta. A Redux Toolkit `createAsyncThunk`-ja Promise alapú (a UI várhat a betöltésre), míg a Saga generátor alapú (háttérszálak). A könyvtár ezt a két világot köti össze egy közös, memóriában tárolt regiszter segítségével, amelyet a `requestId` azonosít.

### A fő szereplők:
1.  **Thunk (UI oldal):** Létrehoz egy kérést és vár egy Promise feloldására.
2.  **Shared State (`requests`):** Egy objektum, ami tárolja az aktív kérések Promise vezérlőit (`resolve`, `reject`).
3.  **Saga Wrapper (Saga oldal):** Egy burkoló réteg, ami elfogja a Saga futását, és az eredményétől függően feloldja vagy elutasítja a Thunk Promise-át.

---

## 2. Belső Működés Részletesen

A forráskód (`src`) elemzése alapján a folyamat a következő lépésekre bontható:

### 2.1. A Thunk Létrehozása (`createSagaAction`)
A `src/index.ts`-ben található `createSagaAction` egy wrapper a szabványos `createAsyncThunk` körül.

```typescript
// Egyszerűsített pszeudókód
const thunk = createAsyncThunk(type, (_, { requestId }) => {
    // 1. Regisztráljuk a kérést a requestId alapján
    // 2. Visszaadunk egy Promise-t, ami addig "függőben" marad, amíg a Saga nem végez
    return addRequest(requestId);
});
```

Amikor a felhasználó dispatch-eli ezt az action-t:
1.  Az RTK generál egy egyedi `requestId`-t.
2.  A thunk "payload creator" függvénye meghívódik.
3.  Az `addRequest` (ld. `src/utils.ts`) létrehoz egy `Deferred` objektumot (promise, resolve, reject) és elmenti a belső `requests` tárolóba a `requestId` kulcs alá.
4.  A thunk visszaadja ezt a Promise-t a komponensnek, így az `await dispatch(...)` hívás várakozó állapotba kerül.

### 2.2. A Saga Interceptálása (`takeEveryAsync` / `wrap`)
A Saga oldalon a `takeEveryAsync` vagy `takeLatestAsync` (`src/effects.ts`) nem közvetlenül a felhasználó sagáját futtatja, hanem egy `wrap` (src/utils.ts) által burkolt verziót.

Amikor az action beérkezik a middleware-be:
1.  A wrapped saga kinyeri a `requestId`-t az action `meta` tulajdonságából.
2.  A `getRequest` generátorral kikeresi a memóriából a hozzá tartozó `Deferred` objektumot.
3.  Elindítja a felhasználó eredeti sagáját (`worker`).
4.  **Ha a saga sikeresen visszatér:** Meghívja a `deferred.resolve(result)`-ot. Ezzel a UI oldalon a Promise `fulfilled` állapotba kerül.
5.  **Ha a saga hibát dob:** Meghívja a `deferred.reject(error)`-t. A UI oldalon a Promise `rejected` lesz.

### 2.3. Cancellation (Megszakítás)
A `src/effects.ts`-ben a `takeLatestAsync` implementációja különleges. Mivel a `takeLatest` lényege, hogy az új action törli az előzőt:
1.  Ha jön egy új action, a `takeLatestAsync` leállítja az előző saga taskot (`cancel`).
2.  Ezen felül megkeresi az előző `requestId`-hez tartozó kérést is, és meghívja rajta az `abort()`-ot (ha van).
3.  Ez biztosítja, hogy a React komponensben lévő `await` hívás azonnal hibát dobjon (vagy `Aborted` állapotba kerüljön), ne maradjon beragadva örökre.

### 2.4. `putAsync`
Ez az effekt (`src/effects.ts`) lehetővé teszi, hogy egy saga dispatch-eljen egy *másik* saga action-t, és megvárja annak az eredményét, mintha csak egy `call` effekt lenne.

Működése:
1.  `yield put(action)`: Dispatch-eli az action-t a Redux store-ba.
2.  Mivel a dispatch visszatérési értéke a Thunk Promise-a, a generátor ezt megkapja.
3.  `yield promise`: A saga felfüggeszti a futását, amíg a Promise feloldódik.
4.  Végül kicsomagolja (`unwrapResult`) az eredményt.

---

## 3. Fájlok és Szerepkörök

- **`src/index.ts`**: A belépési pont. Itt definiálják a `createSagaAction`-t, ami létrehozza a kapcsolatot az RTK és a rendszer között.
- **`src/utils.ts`**: A "motorháztető alatti" logika.
    - `requests`: A globális állapottároló a futó kéréseknek.
    - `addRequest`: Promise létrehozása és tárolása.
    - `wrap`: A magas szintű függvény, ami a felhasználói sagát vezérli és jelenti az eredményt a Promise-nak.
- **`src/effects.ts`**: Redux Saga effekt wrapper-ek.
    - `takeEveryAsync`, `takeLatestAsync`: Ezek biztosítják, hogy minden saga futás automatikusan be legyen kötve a `wrap` mechanizmusba.
    - `putAsync`: Kényelmi funkció saga-ból saga hívásra.

## 4. Összehasonlítás Alternatívákkal (Zustand, Jotai)

Míg a `saga-toolkit` a Redux ökoszisztémát bővíti, érdemes összevetni a modern, "könnyűsúlyú" state management megoldásokkal, hogy lássuk, mikor melyiket érdemes választani.

### 4.1. Zustand
A Zustand egy minimalista, unopinionated (vélemény nélküli) megoldás.
-   **Filozófia:** Egy egyszerű store, ami hook-okon keresztül érhető el. A state update-ek egyszerű függvények.
-   **Különbség:** A Zustandban az aszinkron műveletek sima `async/await` függvények az action-ökön belül. Nincs külön "middleware" réteg vagy generátorok.
-   **Mikor használd a Zustandot?** Ha az alkalmazásod közepes méretű, és nincs szükséged komplex folyamatvezérlésre (pl. bonyolult cancellation logikák, háttérben futó párhuzamos szálak, websocket figyelés).
-   **Mikor használd a Saga Toolkitet?** Ha "Enterprise" szintű követelményeid vannak: tranzakciós pontosság, komplex side-effect láncok (pl. ha A történik, szakítsd meg B-t, de csak ha C már lefutott), vagy ha már eleve Reduxot használsz és szeretnéd modernizálni a kódhívásokat.

### 4.2. Jotai
A Jotai egy atomi (atomic) state manager, hasonlóan a Recoil-hoz.
-   **Filozófia:** "Bottom-up" megközelítés. Az állapot apró atomokból épül fel, ezeket kombinálják. A komponensek csak azokra az atomokra iratkoznak fel, amikre szükségük van.
-   **Különbség:** A Jotai az aszinkronitást az atomokon belül, gyakran a React Suspense-szel integrálva kezeli. Nagyon deklaratív.
-   **Mikor használd a Jotait?** Ha erősen interaktív, grafikus alkalmazást készítesz (pl. rajzprogram, dashboard), ahol a teljesítmény kritikus, és el akarod kerülni a felesleges re-rendereket (amit a Context API vagy egy rosszul optimalizált Redux okozhat).
-   **Mikor használd a Saga Toolkitet?** Ha az alkalmazásod "üzleti logika" vezérelt, központosított állapotkezelést igényel, és a mellékhatások (side effects) szétválasztása a komponenstől kritikus fontosságú (pl. tesztelhetőség miatt).

### 4.3. "Saga-sítás" - Integrációs Lehetőségek
Gyakori kérdés, hogy a Redux elhagyásával elveszítjük-e a Saga erejét.

#### Zustand + Saga
Igen, lehetséges! A **`zustand-saga`** middleware segítségével használhatsz generátor függvényeket a Zustand store mellé.
-   **Hogyan működik:** Egy middleware figyeli a Zustand `setState` hívásait vagy egyedi action-jeit, és triggereli a sagákat.
-   **Értékelés:** Jól működő hibrid megoldás, ha szereted a Zustand egyszerűségét, de kell a Saga "long-running transaction" képessége.

#### Jotai + Saga
Technikailag "lehetséges" lenne (pl. `jotai-effect`-tel), de **nem ajánlott**.
-   **Miért?** A Jotai atomi modellje (`async atom`, `Suspense`) alapvetően más filozófiát követ. A Saga központosított (centralized) folyamatvezérlést feltételez, míg a Jotai decentralizált (atomonkénti).
-   **Alternatíva:** Jotai esetén a `jotai-tanstack-query` (react-query) vagy az `async write atoms` használata a javasolt "modern" megközelítés a side effectek kezelésére.

### 4.4. Összegző Táblázat

| Funkció | Saga Toolkit (Redux) | Zustand | Jotai |
| :--- | :--- | :--- | :--- |
| **Model** | Centralized Store | Centralized Store | Atomic (Distributed) |
| **Async Logika** | Generátorok (Sagas) | Async/Await | Async Atom / Suspense |
| **Fő Erősség** | Komplex folyamatvezérlés (Flow) | Egyszerűség, kis méret | Granuláris re-render, származtatott állapot |
| **Boilerplate** | Magasabb (Action, Saga, Reducer) | Alacsony | Alacsony |
| **Cancellation** | Beépített (First-class) | Manuális (`AbortController`) | Részleges / Manuális |

---

## 5. Összegzés

Ez az eszköz zseniálisan egyszerű megoldást kínál egy gyakori problémára: **hogyan kapjunk visszajelzést (return value) egy Saga futásából a UI rétegben?**

Ahelyett, hogy bonyolult event channel-eket vagy callback-eket használna, kihasználja a Redux Toolkit beépített `requestId` rendszerét és a Promise-okat, így a fejlesztő számára a sagák gyakorlatilag "aszinkron függvényekké" válnak, miközben megmarad a Saga minden ereje (fork, cancel, race, stb.).
