# zaplecze-resellera

Testowy sklep internetowy w stylu **premium dark** — w pełni responsywny (mobile / tablet / desktop), bez zewnętrznych zależności i CDN-ów.

## 🚀 Uruchomienie

Wystarczy dowolny serwer statyczny, np.:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## 🧱 Struktura

```
index.html            # szkielet strony (hero, kategorie, sklep, płatności, opinie, footer)
assets/css/style.css  # motyw premium (dark + złoto), fonty, responsywność, animacje
assets/js/data.js     # katalog: 40 produktów, ceny, kategorie, opinie, metody płatności
assets/js/app.js      # logika: filtry, szukajka, sortowanie, koszyk, modale, toasty
assets/fonts/         # zmienne fonty Inter + Syne (Fontsource, licencja OFL)
ceny/ceny.md          # źródło cen (AirPods, Dyson, JBL, AirPods Max, buty, perfumy)
IMG_*.jpg             # zdjęcia produktów + zrzuty opinii klientów
zestaw-lego-*.jpg     # zestawy LEGO (cena zakodowana w nazwie pliku)
```

## 🗂 Kategorie i ceny

| Kategoria   | Sztuk | Cena (promocja / regularna)                          |
| ----------- | ----- | ---------------------------------------------------- |
| Elektronika | 4     | AirPods Pro 3 120/189 · AirPods Max 400/599 · JBL Flip 7 300/449 · Dyson Supersonic 450/649 |
| Buty        | 9     | para 200 zł / 289 zł (Nike TN, Shox, NB 1906R, LV Trainer) |
| Perfumy     | 17    | 150 zł/szt. / 219 zł — zniżki ilościowe: 5 szt. = 130 zł, 10 szt. = 110 zł, 10+ = do ustalenia |
| LEGO®       | 10    | zgodnie z nazwami plików: 450 / 550 / 700 / 1000 / 1100 / 1500 zł (przekreślona cena regularna) |

Każda karta produktu pokazuje **cenę promocyjną oraz przekreśloną cenę regularną** + badge procenta przeceny.

## 💳 Metody płatności (sekcja „Płatność”)

- ✅ **AKCEPTUJEMY:** BLIK/PSC · KRYPTOWALUTY (+10%, szczegóły na priv) · POBRANIE InPost (+30 zł)
- 📌 **ZASADY:** płatność z góry (30 zł przy zakupie przez pobranie), wysyłka do 24 h, paczka fotografowana przed nadaniem
- Koszyk automatycznie dolicza dopłatę wybranej metody (+10% krypto / +30 zł pobranie) oraz nalicza rabaty ilościowe na perfumy.

## ✨ Funkcje

- responsywny grid produktów z filtrami kategorii, szukajką i sortowaniem (cena / przecena / nazwa),
- szybki podgląd produktu (modal z galerią zdjęć),
- koszyk (drawer) z zapisem w `localStorage`, ilościami, metodami płatności i podsumowaniem,
- sekcje: hero z kolażem, marquee marek, kategorie, jak kupić, opinie klientów (social proof), footer,
- dolny pasek nawigacji na mobile, menu burger, toasty, animacje reveal-on-scroll,
- fonty i ikony bundle'owane lokalnie — strona działa offline / bez CDN.
