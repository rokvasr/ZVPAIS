# ŽVPAIS – Naudotojo dokumentacija

**Žalos ir Verslo Poveikio Aplinkos Informacinė Sistema**

---

## Turinys

1. [Įvadas](#1-įvadas)
2. [Sistemos reikalavimai](#2-sistemos-reikalavimai)
3. [Prieiga prie sistemos](#3-prieiga-prie-sistemos)
4. [Registracija](#4-registracija)
5. [Prisijungimas ir atsijungimas](#5-prisijungimas-ir-atsijungimas)
6. [Navigacija](#6-navigacija)
7. [Įvykiai](#7-įvykiai)
8. [Žalos skaičiavimas](#8-žalos-skaičiavimas)
9. [Vėjo sklaidos modeliavimas](#9-vėjo-sklaidos-modeliavimas)
10. [Aplinkos objektai](#10-aplinkos-objektai)
11. [Medžiagos](#11-medžiagos)
12. [Ataskaitos](#12-ataskaitos)
13. [Taršos sunkumas](#13-taršos-sunkumas)
14. [Specialisto funkcijos](#14-specialisto-funkcijos)
15. [Kalbos keitimas](#15-kalbos-keitimas)
16. [Dažnai užduodami klausimai](#16-dažnai-užduodami-klausimai)

---

## 1. Įvadas

ŽVPAIS – tai žiniatinklinė informacinė sistema, skirta aplinkosauginių incidentų (gaisrų, medžiagų išsiliejimų, stichinių nelaimių) registravimui, aplinkos taršos lygio vertinimui ir žalos aplinkai skaičiavimui pagal Lietuvos Respublikos aplinkos ministro įsakymą Nr. 471.

Sistema leidžia:

- registruoti aplinkosaugos incidentus su geografine vieta (poligonu žemėlapyje);
- susieti incidentus su aplinkos objektais ir jų medžiaginiu sudėtimi;
- automatiškai apskaičiuoti žalos dydį pagal normatyvinę formulę;
- modeliuoti teršalų sklaidą oro terpėje vėjo modelio pagrindu;
- peržiūrėti ir palyginti visų registruotų incidentų taršos sunkumą;
- generuoti žalos vertinimo ataskaitas PDF formatu.

Sistemoje yra dvi rolės – **naudotojas** ir **specialistas**. Kai kurios funkcijos (redagavimas, tvirtinimas, ataskaitų kūrimas) prieinamos tik specialistams.

---

## 2. Sistemos reikalavimai

Sistema veikia naršyklėje – jokios papildomos programinės įrangos diegti nereikia.

| Reikalavimas | Rekomenduojama |
|---|---|
| Naršyklė | Google Chrome 110+, Mozilla Firefox 110+, Microsoft Edge 110+ |
| Interneto ryšys | Taip (stabilus plačiajuostis) |
| Ekrano raiška | 1280 × 720 ar didesnė |
| JavaScript | Turi būti įjungtas naršyklėje |

Mobiliesiems įrenginiams sistema veikia, tačiau yra optimizuota staliniams kompiuteriams.

---

## 3. Prieiga prie sistemos

Sistema pasiekiama adresu:

```
https://zvpis-frontend-ahbrcberf8abaqgu.uaenorth-01.azurewebsites.net
```

Neautentifikuotiems naudotojams rodomi tik prisijungimo ir registracijos puslapiai. Visi kiti puslapiai reikalauja aktyvios sesijos.

---

## 4. Registracija

Jei dar neturite paskyros, atlikite šiuos veiksmus:

1. Atidarykite sistemos adresą naršyklėje.
2. Viršutiniame meniu spustelėkite **Registracija**.
3. Užpildykite formą:
   - **El. paštas** – unikalus jūsų el. pašto adresas.
   - **Slaptažodis** – turi būti bent **8 simbolių** ilgio ir turėti: didžiąją raidę, skaitmenį ir specialų simbolį (pvz., `Vanduo1!`).
   - **Registruotis kaip specialistas** – pažymėkite, jei turite specialisto teises ir žinote specialisto prisijungimo duomenis organizacijoje. Specialistams papildomai reikia įvesti **vardą** ir **srities specializaciją**.
4. Spauskite **Registruotis**.

Jei įvesti duomenys neteisingi (pvz., per silpnas slaptažodis arba el. paštas jau naudojamas), po forma rodomas klaidos pranešimas.

> **Pastaba.** Slaptažodžio reikalavimai: minimalus ilgis 8 simboliai, bent viena didžioji raidė, bent vienas skaitmuo, bent vienas specialus simbolis (pvz., `!`, `@`, `#`, `$`).

---

## 5. Prisijungimas ir atsijungimas

### Prisijungimas

1. Viršutiniame meniu spustelėkite **Prisijungti**.
2. Įveskite **el. paštą** ir **slaptažodį**.
3. Spauskite **Prisijungti**.

Sėkmingai prisijungus, pateikiamas pradinis puslapis su navigacijos meniu. Viršuje dešinėje matoma jūsų rolė (**Specialistas** arba **Naudotojas**) ir el. pašto adresas.

Jei duomenys neteisingi, rodomas klaidos pranešimas: *„Neteisingas el. paštas arba slaptažodis."*

### Atsijungimas

Spauskite mygtuką **Atsijungti** navigacijos juostoje (dešinėje pusėje, šalia el. pašto). Sesija baigiama ir esate nukreipiami į prisijungimo puslapį.

---

## 6. Navigacija

Po prisijungimo viršuje rodomas navigacijos meniu su šiomis nuorodomis:

| Meniu punktas | Aprašymas | Rolė |
|---|---|---|
| **Pradžia** | Pagrindinis puslapis | Visi |
| **Įvykiai** | Incidentų sąrašas ir žemėlapis | Visi |
| **Medžiagos** | Teršalų medžiagų katalogas | Visi |
| **Objektai** | Aplinkos objektų sąrašas | Visi |
| **Ataskaitos** | Žalos vertinimo ataskaitos | Visi |
| **Žemėlapis** | Visų įvykių žemėlapis | Visi |
| **Tarša** | Incidentų taršos sunkumo suvestinė | Visi |
| **Indeksavimo koef.** | Indeksavimo koeficientų valdymas | Tik specialistai |

Kiekvienas meniu punktas iš karto įkelia atitinkamą puslapį be papildomo patvirtinimo.

---

## 7. Įvykiai

### 7.1 Įvykių sąrašas

Meniu pasirinkus **Įvykiai**, rodomas incidentų sąrašas lentelėje ir šalia jo – interaktyvus žemėlapis su visų įvykių poligonais.

Lentelėje pateikiama:
- Įvykio numeris (ID)
- Tipas (gaisras / medžiagų išsiliejimas / stichija)
- Data
- Vieta
- Statusas

**Filtravimas.** Virš lentelės yra du išskleidžiamieji sąrašai:
- **Tipas** – filtruoti pagal įvykio tipą.
- **Statusas** – filtruoti pagal įvykio būseną.

**Žemėlapis.** Kairėje lentelėje spustelėjus įvykio eilutę, žemėlapis automatiškai priartėja prie to įvykio zonos ir paryškina poligoną. Paspaudus poligoną žemėlapyje, apatinėje dalyje rodoma trumpa įvykio informacija.

**Statusų spalvos ženkleliai:**

| Statusas | Reikšmė |
|---|---|
| Naujas | Neapdorotas įvykis |
| Laukia peržiūros | Pateiktas specialistui |
| Tikrinamas | Specialistas tikrina |
| Patvirtintas | Žala įvertinta ir patvirtinta |
| Atmestas | Atmestas su pastabomis |

### 7.2 Naujo įvykio kūrimas

1. Spustelėkite nuorodą **Naujas įvykis** (dešinėje viršuje, įvykių puslapyje).
2. Užpildykite formą:
   - **Tipas** – pasirinkite: gaisras, medžiagų išsiliejimas arba stichija.
   - **Data** – incidento data.
   - **Aprašymas** – tekstinis aprašymas (neprivalomas).
   - **Vieta** – vietovės pavadinimas (neprivalomas).
   - **Zona žemėlapyje** – spustelėkite žemėlapyje ir nubrėžkite poligoną, žymint incidento paveiktą teritoriją. Tai privalomas laukas.
3. Skyriuje **Objektai** galite priskirti susijusius aplinkos objektus. Kiekvienam objektui nurodomas:
   - **Aplinkos komponentas** – vanduo, dirvožemis arba oras.
   - **K_kat** – kategorijos koeficientas (pagal teisės aktą).
4. Spauskite **Sukurti**.

Jei nebuvo pažymėta zona žemėlapyje, sistema rodo perspėjimą ir forma neišsaugoma.

### 7.3 Poligono braižymas žemėlapyje

Formos žemėlapyje naudokite Leaflet braižymo įrankius:
- Spustelėkite žemėlapyje – pradėsite žymėti poligono kampus.
- Kiekvieni papildomi paspaudimai prideda naujus kampus.
- Dukart spustelėję ar paspaudę pirmąjį tašką – užbaigiate figūrą.
- Norėdami pradėti iš naujo – ištrinkite esamą figūrą per redagavimo mygtuką.

### 7.4 Žalos skaičiavimo peržiūra

Prie kiekvieno įvykio lentelėje yra nuoroda **Žala**. Spustelėjus ją, atidaromas žalos skaičiavimo puslapis (žr. [8 skyrių](#8-žalos-skaičiavimas)).

### 7.5 Įvykio redagavimas ir šalinimas

Redaguoti bei trinti įvykius gali tik **specialistai**. Jų sąrašo eilutėje rodomi mygtukai **Redaguoti** ir **Ištrinti**.

---

## 8. Žalos skaičiavimas

Žalos skaičiavimo puslapis pasiekiamas paspaudus **Žala** prie norimo įvykio arba tiesiai per URL `/events/{id}/calculation`.

### 8.1 Skaičiavimo suvestinė

Puslapis rodo:
- Kiekvieną prie įvykio priskirtą **aplinkos objektą**.
- Kiekvienam objektui – **medžiagų lentelę** su stulpeliais:
  - **Medžiaga** – teršalo pavadinimas.
  - **Tipas** – standartinis / BDS₇ / suspenduotos.
  - **T_n** – bazinis tarifas (EUR/t).
  - **I_n** – indeksavimo koeficientas.
  - **Q_n** – išmesta kiekis (t).
  - **K_kat** – kategorijos koeficientas.
  - **Taršos dydis** – apskaičiuotas taršos dydis.
  - **Z_n** – žala eurais.
- Objekto ir viso įvykio žalos suvestines.
- Įvykio zonos **žemėlapį**.

### 8.2 PDF ataskaitos atsisiuntimas

Žalos skaičiavimo puslapio apačioje yra mygtukas **Atsisiųsti PDF**. Paspaudus generuojama ir atsisiunčiama ataskaita su skaičiavimo suvestine ir žemėlapio vaizdu.

> **Pastaba.** PDF mygtukas rodomas tik tiems įvykiams, kurių statusas nėra „Naujas" (t. y. jie jau buvo apdoroti).

### 8.3 Perskaičiavimas (tik specialistams)

Specialistai gali inicijuoti žalos perskaičiavimą paspausdami **Perskaičiuoti** ir patvirtindami veiksmą dialogo lange. Tai naudinga, kai buvo pakeisti objekto medžiagų duomenys arba baziniai tarifai.

---

## 9. Vėjo sklaidos modeliavimas

Vėjo sklaidos sekcija rodoma **gaisrų** žalos skaičiavimo puslapio apačioje – paspaudus išskleidžiamą skyrių **Vėjo sklaidos modeliavimas**.

### 9.1 Parametrų įvedimas

Formoje reikia nurodyti:
- **Gaisro koordinatės** (platuma, ilguma) – užpildomos automatiškai iš įvykio poligono centro.
- **Vėjo parametrai:**
  - Greitis (m/s)
  - Kryptis (laipsniai, 0–360°, „iš kurios pučia")
  - Stabilumo klasė (A–F pagal Pasquill-Gifford)
- **Emisijos aukštis** (m) – teršalo išmetimo aukštis virš žemės.

### 9.2 Automatinis orų duomenų gavimas

Mygtuku **Gauti orų duomenis** sistema automatiškai kreipiasi į Open-Meteo istorinę orų duomenų paslaugą ir užpildo:
- Vėjo greitį ir kryptį pagal įvykio datą ir vietą.
- Stabilumo klasę (apskaičiuojamą iš trumpabangės spinduliuotės ir debesuotumo).

Mygtuku **Gauti ir skaičiuoti** atliekami abu veiksmai iš karto.

### 9.3 Sklaidos žemėlapis

Po skaičiavimo žemėlapyje rodomi:
- Mėlynas poligonas – įvykio zona.
- Žymeklis – gaisro centras.
- Spalvoti sklaidos poligonai – koncentracijos juostos nuo gaisro:
  - **Raudona** – aukšta koncentracija.
  - **Oranžinė** – vidutinė koncentracija.
  - **Geltona** – žema koncentracija.

---

## 10. Aplinkos objektai

### 10.1 Objektų sąrašas

Meniu **Objektai** rodo visus sistemoje registruotus aplinkos objektus (pastatai, gamyklos, vandens telkiniai ir kt.).

### 10.2 Naujo objekto kūrimas

1. Spauskite **Sukurti naują objektą**.
2. Užpildykite:
   - **Pavadinimas** (privalomas).
   - **Aprašymas** (neprivalomas).
   - **Bendra masė (t)** ir **Bendras tūris (m³)** – naudojami kaip atspirties taškas procentiniam kiekiui skaičiuoti.
3. Spauskite **Sukurti ir pridėti medžiagas**.

Sukūrus objektą, tame pačiame puslapyje atsiranda skyrius **Objekto medžiagos**.

### 10.3 Medžiagų priskyrimas objektui

Skyriuje **Objekto medžiagos** spauskite **Pridėti medžiagą**:
- Pasirinkite medžiagą iš sąrašo.
- Nurodykite kiekį vienu iš būdų:
  - **Procentas (%)** – medžiagos dalis nuo bendros objekto masės.
  - **Masė (t)** – absoliutus svoris tonomis.
  - **Tūris (m³)** – absoliutus tūris.
- Neprivalomas laukas: **Susigrąžinta (t)** – kiekis, kuris buvo surinktas / atkurtas po incidento.

Išsaugojus, medžiaga pridedama prie sąrašo. Šalinti galima paspaudus **Šalinti** šalia norimos medžiagos (sistema paprašys patvirtinimo).

> **Pastaba.** Objekto redagavimas (ne kūrimas) prieinamas tik specialistams.

---

## 11. Medžiagos

Meniu **Medžiagos** rodo visų sistemoje užregistruotų teršalų medžiagų katalogą.

### 11.1 Medžiagų katalogas

Lentelėje pateikiama:
- Pavadinimas
- Tipas (standartinis / BDS₇ / suspenduotos)
- Emisijų kategorija (naudojama vėjo sklaidos modeliui)

### 11.2 Naujos medžiagos kūrimas

Spauskite **Sukurti naują medžiagą** ir užpildykite:
- **Pavadinimas** (privalomas).
- **Aprašymas**.
- **Toksiškumo faktorius** – naudojamas žalos formulėje.
- **Vienetas** – matavimo vienetas.
- **Bazinis tarifas T_n (EUR/t)** – tarifas pagal įsakymą Nr. 471.
- **Medžiagos tipas** – standartinis, BDS₇ arba suspenduotos medžiagos.
- **Emisijų kategorija** – reikalinga vėjo sklaidos modeliavimui; pasirinkite tinkamą kategoriją (polimerai, plastikai, mediena, alyva ir kt.).

> **Pastaba.** Medžiagų redagavimas prieinamas tik specialistams.

---

## 12. Ataskaitos

### 12.1 Ataskaitų sąrašas

Meniu **Ataskaitos** rodo žalos vertinimo ataskaitų sąrašą su datos, įvykio, žalos dydžio ir piniginės žalos informacija.

### 12.2 Naujos ataskaitos kūrimas (tik specialistams)

1. Spauskite **Nauja ataskaita**.
2. Pasirinkite **įvykį** iš sąrašo.
   - Sistema automatiškai bando užpildyti **žalos dydį** ir **piniginę žalą** iš jau atlikto skaičiavimo.
3. Patikslinkite laukus, jei reikia:
   - **Vertinimo data**.
   - **Žalos dydis** (skaičiavimo vienetas).
   - **Piniginė žala (EUR)**.
   - **Pastabos**.
4. Spauskite **Sukurti**.

### 12.3 Ataskaitos redagavimas ir šalinimas

Ataskaitas redaguoti ir šalinti gali tik **specialistai**.

---

## 13. Taršos sunkumas

Meniu **Tarša** rodo visų įvykių taršos sunkumo suvestinę, surūšiuotą nuo didžiausio iki mažiausio indekso.

Lentelėje kiekvienam įvykiui rodoma:
- Eilės numeris pagal sunkumą.
- Įvykio numeris, tipas, data, vieta.
- **Taršos sunkumo indeksas** su spalvota juosta:
  - **Raudona** – aukštas sunkumas.
  - **Oranžinė** – vidutinis sunkumas.
  - **Žalia** – žemas sunkumas.

**Detalios informacijos peržiūra.** Spustelėjus bet kurią eilutę, ji išsiplečia ir rodo:
- Kiekvieną paveiktą objektą su jo komponentu (vanduo / dirvožemis / oras) ir K_kat koeficientu.
- Kiekvienos medžiagos Q_n kiekį, K_kat ir taršos indekso indėlį.
- Objekto ir viso įvykio taršos indekso suvestinę.

Dešinėje eilutėje taip pat yra nuoroda **Žalos skaičiavimas**, leidžianti pereiti į detalų skaičiavimo puslapį.

---

## 14. Specialisto funkcijos

### 14.1 Laukiančių peržiūros įvykių tvirtinimas / atmetimas

Kai sistemoje yra įvykių su statusu **Laukia peržiūros**, specialistui prisijungus prie **Įvykių** puslapio viršuje rodomas oranžinis perspėjimo blokas su šių įvykių sąrašu.

Kiekvienam laukiančiam įvykiui galima:
- Spustelėti **Žalos skaičiavimas** ir peržiūrėti detales.
- Paspausti **Tvirtinti** – įvykio statusas pakeičiamas į *Patvirtintas*.
- Įvesti **atmetimo priežastį** ir paspausti **Atmesti** – statusas pakeičiamas į *Atmestas*.

### 14.2 Indeksavimo koeficientų valdymas

Meniu punktas **Indeksavimo koef.** (rodomas tik specialistams) leidžia peržiūrėti ir tvarkyti ketvirtinių indeksavimo koeficientų (I_n) lentelę.

Koeficientai naudojami žalos formulėje:

```
Z_n = Q_n × T_n × K_kat × I_n
```

Kiekvienam įrašui nurodomas **ketvirtis** (pvz., 2024 Q3) ir **koeficiento reikšmė**. Galima pridėti naują koeficientą, redaguoti arba ištrinti esamą.

---

## 15. Kalbos keitimas

Viršutiniame navigacijos meniu dešinėje yra mygtukas **LT / EN**. Paspaudus jį, visa sąsaja persijungia iš lietuvių kalbos į anglų ir atvirkščiai. Pasirinkta kalba išlaikoma per visą sesiją.

---

## 16. Dažnai užduodami klausimai

**K: Kodėl man neprieinamas mygtukas „Redaguoti" prie įvykio?**  
A: Įvykių redagavimas galimas tik specialistų rolės naudotojams. Įprastiems naudotojams rodomi tik peržiūros veiksmai.

**K: Kodėl žalos skaičiavimas rodo „nėra objektų"?**  
A: Prie įvykio nepriskirti aplinkos objektai arba priskirtiems objektams nėra medžiagų. Patikrinkite objekto medžiagų sąrašą puslapyje **Objektai**.

**K: PDF atsisiuntimo mygtukas nerodomas – kodėl?**  
A: PDF galima atsisiųsti tik tada, kai įvykio statusas nėra „Naujas". Įvykis turi būti peržiūrėtas specialisto (statusas „Laukia peržiūros", „Tikrinamas", „Patvirtintas" arba „Atmestas").

**K: Vėjo sklaidos sekcija nerodoma žalos skaičiavimo puslapyje.**  
A: Vėjo sklaidos modeliavimas prieinamas tik **gaisrų** tipo įvykiams.

**K: Įvedžiau slaptažodį, bet registracija nepavyksta.**  
A: Įsitikinkite, kad slaptažodis atitinka visus reikalavimus: bent 8 simboliai, viena didžioji raidė, vienas skaitmuo, vienas specialus simbolis (pvz., `!`, `@`, `#`).

**K: Kaip sistema automatiškai apdoroja naujus įvykius?**  
A: Sistema kas 5 minutes automatiškai tikrina naujus įvykius. Jei įvykis yra senesnis nei nustatytas delsimo laikas ir jam dar nebuvo atliktas žalos vertinimas, sistema automatiškai inicijuoja skaičiavimą ir pakeičia statusą į „Laukia peržiūros".

---

*Dokumentas parengtas ŽVPAIS sistemos versijai, veikiančiai Azure platformoje.*
