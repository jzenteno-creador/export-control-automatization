# Inventario de campos — 111 JSONs 304

**Generado**: 111 archivos en `samples/304/` (incluye los 11 manuales del 22/04 + 100 nuevos del 29/04).

**Distribución por tipo de orden**: STO=55, Trade=56, Unknown=0


---


## 1. Campos de primer nivel

| Campo | Presencia | Tipo(s) | Resumen valores | Ejemplo |
|---|---|---|---|---|
| `RoutingNumber` | 111/111 (100.0%) | `int`×111 | `33708426259`×111 | `33708426259` |
| `ShipmnetIdentificationNumber` | 111/111 (100.0%) | `str`×111 | 111 valores únicos. Top: `0048067849`×1, `0048080781`×1, `0048062233`×1, `0048076976`×1, `0048076977`×1, `0048087019`×1, `0048123559`×1, `0048120424`×1 | `0048067849` |
| `TariffServiceCode` | 111/111 (100.0%) | `str`×111 | `DD`×56, `DP`×55 | `DD` |
| `ShipmentMethodPayment` | 111/111 (100.0%) | `str`×111 | `PP`×111 | `PP` |
| `TransactionSetPurposeCode` | 111/111 (100.0%) | `str`×111 | `49`×111 | `49` |
| `ApplicationType` | 111/111 (100.0%) | `str`×111 | `BN`×111 | `BN` |
| `ReferenceIdentificationGeneral` | 111/111 (100.0%) | `list`×111 | `list` (compuesto) | `[{"ReferenceIdentificationQualifier": "19", "ReferenceIdenti…` |
| `CurrencyCode` | 111/111 (100.0%) | `str`×111 | `USD`×111 | `USD` |
| `TransportationTermsCode` | 111/111 (100.0%) | `str`×111 | `CPT`×39, `CFR`×27, `FOB`×26, `CIP`×14, `FCA`×5 | `FCA` |
| `DeliveryLocation` | 111/111 (100.0%) | `str`×111 | 17 valores únicos. Top: `Buenos Aires Port`×26, `Santos Port`×25, `MANAUS PORT`×16, `NAVEGANTES PORT`×15, `PARANAGUA PORT`×10, `SANTOS PORT`×4, `BAHIA BLANCA`×2, `CALLAO PORT`×2 | `BAHIA BLANCA` |
| `TermsOfSale` | 111/111 (100.0%) | `int`×111 | `0`×64, `31`×47 | `0` |
| `TermsOfSaleDescription` | 111/111 (100.0%) | `str`×111 | 13 valores únicos. Top: `NET EOM PLUS 1 MO PLUS 1 DAY`×44, `90 DAYS FROM B/L DATE`×30, `NET 30`×11, `60 DAYS AFTER B/L DATE`×7, `NET 90 DAYS EOM`×3, `60 DAYS FROM B/L DATE - DRAFT`×3, `NET 60 DAYS FROM INVOICE DATE`×2, `NET 3 DAYS FROM INVOICE DATE`×2 | `NET 60 DAYS FROM INVOICE DATE` |
| `DateTimeReference` | 111/111 (100.0%) | `list`×111 | `list` (compuesto) | `[{"DateTimeQualifier": "RSD", "Date": 20260504}, {"DateTimeQ…` |
| `Entities` | 111/111 (100.0%) | `list`×111 | `list` (compuesto) | `[{"EntityIdentifier": "16", "Name": "PBB Polisur S.R.L. Site…` |
| `RouteInformation` | 111/111 (100.0%) | `list`×111 | `list` (compuesto) | `[{"StandardCarrierAlphaCode": "SSB", "TransportationMethodTy…` |
| `BusinessInstructionsReferenceNumberNotes` | 111/111 (100.0%) | `str`×111 | 27 valores únicos. Top: `SET OF DOCUMENTS:,, - Invoice …`×51, `10 On Carriage Manaus Port 12A…`×12, `12A LOABABILITY EXCEPTION PLEA…`×5, `12A LOABABILITY EXCEPTION PLEA…`×5, `#12A# LOADABILITY EXCEPTION PL…`×4, `12A Loading Exceptions USE 40'…`×4, `Entregar - L a V: 8 a 18 S: No…`×2, `#12A# LOADABILITY EXCEPTION PL…`×2 | `FREIGHT COLLECT. VIA TERRESTRE. PLEASE GENERATE THE CRT IN A…` |
| `Items` | 111/111 (100.0%) | `list`×111 | `list` (compuesto) | `[{"ContainerDetails": [{"NumberOfContainers": 1, "Intermodal…` |
| `q` | 111/111 (100.0%) | `str`×111 | `/api/orders/store`×111 | `/api/orders/store` |
| `PlaceOfReceiptCode` | 85/111 (76.6%) | `str`×85 | `D146`×51, `D147`×25, `D116`×5, `D176`×2, `D044`×1, `K168`×1 | `D116` |
| `PlaceOfDelivery` | 27/111 (24.3%) | `str`×27 | `BRMAO`×18, `BRACA`×5, `PELIM`×3, `USHOU`×1 | `PELIM` |
| `numerointerno` | 2/111 (1.8%) | `str`×2 | `ME-00047643`×1, `ME-00047770`×1 | `ME-00047643` |


## 2. Arrays y objetos anidados

### `ReferenceIdentificationGeneral` — array
- Docs con array no-vacío: **111/111**
- Cardinalidad: min=5, max=8, avg=6.52, mediana=8
- Total de items observados: 724

| Campo interno | Presencia* | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ReferenceIdentificationQualifier` | 724/724 (100.0%) | `str`×724 | 9 valores únicos. Top: `19`×111, `11`×111, `PE`×111, `SF`×111, `PO`×111, `1V`×56, `CO`×56, `AEG`×56 | `19` |
| `ReferenceIdentification` | 724/724 (100.0%) | `str`×724 | 185 valores únicos. Top: `0803`×111, `Z039`×103, `P703`×56, `DIRECT CONSUMER`×56, `D146`×51, `P706`×51, `D147`×41, `D119`×10 | `0803` |
| `FreeFormDescription` | 56/724 (7.7%) | `str`×56 | `AES - Ultimate Consignee Type`×56 | `AES - Ultimate Consignee Type` |

\* % sobre el total de items en el array, no sobre docs.

### `DateTimeReference` — array
- Docs con array no-vacío: **111/111**
- Cardinalidad: min=2, max=2, avg=2, mediana=2
- Total de items observados: 222

| Campo interno | Presencia* | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `DateTimeQualifier` | 222/222 (100.0%) | `str`×222 | `RSD`×111, `002`×111 | `RSD` |
| `Date` | 222/222 (100.0%) | `int`×222 | 49 valores únicos. Top: `20260506`×22, `20260518`×18, `20260527`×15, `20260422`×14, `20260502`×13, `20260503`×12, `20260526`×10, `20260622`×9 | `20260504` |
| `Time` | 14/222 (6.3%) | `int`×14 | `900`×6, `947`×3, `1031`×1, `901`×1, `915`×1, `1730`×1, `1000`×1 | `947` |

\* % sobre el total de items en el array, no sobre docs.

### `Entities` — array
- Docs con array no-vacío: **111/111**
- Cardinalidad: min=7, max=13, avg=8.96, mediana=9
- Total de items observados: 995

| Campo interno | Presencia* | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `EntityIdentifier` | 995/995 (100.0%) | `str`×995 | 13 valores únicos. Top: `16`×111, `ST`×111, `EX`×111, `N1`×111, `BT`×111, `NP`×111, `DIR`×106, `PK`×85 | `16` |
| `Name` | 995/995 (100.0%) | `str`×991, `null`×4 | 84 valores únicos. Top: `DOW BRASIL IND E COM`×129, `PBBPOLISUR S.R.L.`×113, `BDP SOUTH AMERICA LTDA`×110, `COMISSARIA PIBERNAT LTDA`×82, `PBB Polisur S.R.L. Site Logist…`×56, `PBBPolisur SRL Contenedor Line…`×51, `VERDE BRASIL IND DE PRODUTOS`×48, `VIDEPLAST INDUSTRIA DE`×36 | `PBB Polisur S.R.L. Site Logistics` |
| `IdentificationCode` | 995/995 (100.0%) | `str`×995 | 98 valores únicos. Top: `A136`×111, `0000030030`×88, `0020003856`×82, `0002566122`×75, `D146`×51, `0002469804`×48, `D147`×41, `0002574200`×32 | `D116` |
| `AddressInformation` | 995/995 (100.0%) | `str`×995 | 82 valores únicos. Top: `CALLE BOUCHARD 710, PISO 11`×111, `18 DE JULIO SN`×108, `R MANOEL COELHO 600`×99, `RUA MANOEL VIEIRA GARCAO 120`×82, `AV JOAQUIM LOURENCO DE LIMA 12…`×75, `AV CUPIUBA PARTE 625`×60, `ROD BR-101 700 KM 112 ANDAR 2 …`×32, `AV DAS ARAUCARIAS 5185`×30 | `18 DE JULIO SN` |
| `CityName` | 995/995 (100.0%) | `str`×995 | 43 valores únicos. Top: `ITAJAI`×152, `CIUDAD DE BUENOS AIRES`×111, `SAO CAETANO DO SUL`×110, `MANAUS`×110, `BAHIA BLANCA`×109, `EXTREMA`×75, `PATO BRANCO`×35, `RIO VERDE`×32 | `BAHIA BLANCA` |
| `PostalCode` | 995/995 (100.0%) | `str`×993, `null`×2 | 60 valores únicos. Top: `C1106ABL`×111, `09510-101`×110, `B8000XAU`×108, `88301-425`×82, `37644-032`×75, `69075-060`×60, `88311-600`×32, `83707-754`×30 | `B8000XAU` |
| `CountryCode` | 995/995 (100.0%) | `str`×995 | `BR`×711, `AR`×233, `PE`×22, `CL`×10, `UY`×7, `US`×5, `PY`×5, `MX`×2 | `AR` |
| `LocationIdentifier` | 995/995 (100.0%) | `str`×994, `null`×1 | 19 valores únicos. Top: `SC`×247, `SP`×141, `B`×112, `C`×111, `AM`×110, `PR`×82, `MG`×79, `GO`×32 | `B` |
| `Contacts` | 929/995 (93.4%) | `list`×929 | `list` (compuesto) | `[{"ContactFunctionCode": "ZZ", "Name": "Storto Solda", "Elec…` |
| `TAXID` | 232/995 (23.3%) | `str`×232 | 31 valores únicos. Top: `60435351010039`×50, `42278291004030`×32, `36848050000170`×24, `60435351002109`×22, `75635144000113`×15, `79687588000587`×12, `75029595000107`×10, `79687588000153`×8 | `00200283000115` |

\* % sobre el total de items en el array, no sobre docs.

### `RouteInformation` — array
- Docs con array no-vacío: **111/111**
- Cardinalidad: min=1, max=1, avg=1, mediana=1
- Total de items observados: 111

| Campo interno | Presencia* | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `StandardCarrierAlphaCode` | 111/111 (100.0%) | `str`×111 | `SSB`×111 | `SSB` |
| `FreeFormDescription` | 111/111 (100.0%) | `str`×111 | 14 valores únicos. Top: `LS0021`×26, `053705`×25, `056109`×18, `052009`×15, `053409`×10, `Z58036`×4, `052209`×4, `054309`×2 | `Z58036` |
| `RouteDescription` | 111/111 (100.0%) | `str`×111 | 14 valores únicos. Top: `AR-C106-LAA-BR-L040 D-D-FCL-22…`×26, `TM-ST05-TT37-TLT05`×25, `TM-ST05-TT61-TLT09`×18, `TM-ST05-TT20-TLT09`×15, `TM-ST05-TT34-TLT09`×10, `LAA-CUST-PCKUP-AR-FTL EXPORT-0…`×4, `TM-ST05-TT22-TLT09`×4, `TM-ST05-TT43-TLT09`×2 | `LAA-CUST-PCKUP-AR-FTL EXPORT-0DAY-01` |
| `TransportationMethodTypeCode` | 110/111 (99.1%) | `str`×110 | `O`×77, `M`×33 | `M` |

\* % sobre el total de items en el array, no sobre docs.

### `Items` — array
- Docs con array no-vacío: **111/111**
- Cardinalidad: min=1, max=5, avg=4.06, mediana=4
- Total de items observados: 451

| Campo interno | Presencia* | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ContainerDetails` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"NumberOfContainers": 1, "IntermodalServiceCode": "01", "E…` |
| `ReferenceIdentification` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"ReferenceIdentificationQualifier": "PO", "ReferenceIdenti…` |
| `BusinessInstructionsAndReferenceNumber` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"ReferenceIdentification": "PGIDATE", "Description": "2026…` |
| `QuantityAndWeight` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"GrossWeight": 1530, "ActualNetWeight": 1500, "BilledRated…` |
| `PricingInformationUnitPrice` | 451/451 (100.0%) | `float`×317, `int`×134 | 51 valores únicos. Top: `1.17`×50, `54.625`×40, `27`×24, `27.75`×24, `58.75`×22, `1608`×20, `31.25`×20, `57.5`×16 | `65.65` |
| `PricingInformationQuantity` | 451/451 (100.0%) | `int`×451 | 12 valores únicos. Top: `1080`×353, `25000`×50, `18`×36, `120`×2, `240`×2, `1`×2, `60`×1, `660`×1 | `60` |
| `PricingInformationMonetaryAmount` | 451/451 (100.0%) | `int`×449, `float`×2 | 55 valores únicos. Top: `29250`×50, `58995`×40, `29160`×24, `29970`×24, `63450`×22, `28944`×20, `33750`×20, `62100`×16 | `3939` |
| `ExchangeRateCurrencyCode` | 451/451 (100.0%) | `str`×451 | `USD`×451 | `USD` |
| `ExchangeRate` | 451/451 (100.0%) | `int`×206, `float`×245 | 19 valores únicos. Top: `5.2194`×209, `1364`×50, `1381`×35, `1354`×28, `1358`×23, `1370`×18, `1378`×17, `1387.5`×15 | `1394` |
| `DescriptionMarksAndNumbers` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"LadingDescription": "DOW(tm) LDPE 208M Resin", "Commodity…` |
| `ItemIdentification` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[{"ProductServiceIDQualifierVo": "0831644163", "ProductServi…` |
| `LJ` | 451/451 (100.0%) | `str`×451 | `N`×451 | `N` |
| `Hazardous` | 451/451 (100.0%) | `list`×451 | `list` (compuesto) | `[]` |
| `Remarks` | 336/451 (74.5%) | `str`×336 | `Marking Instructions:Not regulated for t…`×247, `Marking Instructions:Not regulated for t…`×88, `Marking Instructions:PIX # Productos Ind…`×1 | `Marking Instructions:Not regulated for transport Not regulat…` |

\* % sobre el total de items en el array, no sobre docs.


## 2b. Sub-arrays dentro de `Items[]`

### `Items[].ContainerDetails`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=1, max=1, avg=1, mediana=1

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `NumberOfContainers` | 451 | `int`×451 | `4`×224, `5`×200, `1`×15, `2`×6, `3`×6 | `1` |
| `IntermodalServiceCode` | 451 | `str`×451 | `05`×437, `01`×11, `11`×1, `06`×1, `03`×1 | `01` |
| `EquipmentType` | 451 | `str`×451 | `40CZ`×437, `VAEM`×11, `SGRA`×1, `T117`×1, `VAGR`×1 | `VAEM` |
| `EquipmentNumber` | 451 | `str`×451 | `40CMISSING`×436, `XNOTFOUNDX`×15 | `XNOTFOUNDX` |
| `SealNumber` | 451 | `str`×451 | `NA`×451 | `NA` |

### `Items[].ReferenceIdentification`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=2, max=3, avg=2.53, mediana=3

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ReferenceIdentificationQualifier` | 1140 | `str`×1140 | `PO`×451, `DP`×451, `CO`×238 | `PO` |
| `ReferenceIdentification` | 1140 | `str`×1140 | 180 valores únicos. Top: `0000010300`×120, `0000007141`×96, `0000008575`×95, `0000008566`×40, `0000009353`×31, `0000008651`×24, `0000027577`×20, `0000010945`×14 | `0118531879` |

### `Items[].BusinessInstructionsAndReferenceNumber`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=3, max=4, avg=3.4, mediana=3

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ReferenceIdentification` | 1532 | `str`×1532 | `PGIDATE`×451, `PAYMTRMS`×451, `DELIVERY`×451, `OCEAN CSGN`×179 | `PGIDATE` |
| `Description` | 1532 | `str`×1532 | 494 valores únicos. Top: `NET EOM PLUS 1 MO PLUS 1 DAY`×162, `90 DAYS FROM B/L DATE`×137, `20260506`×83, `20260422`×63, `VERDE BRASIL IND DE PRODUTOS P…`×59, `20260502`×54, `NET 30`×51, `20260503`×47 | `20260504` |

### `Items[].QuantityAndWeight`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=1, max=1, avg=1, mediana=1

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `GrossWeight` | 451 | `int`×448, `float`×3 | 13 valores únicos. Top: `27540`×353, `25000`×50, `22140`×36, `3060`×2, `6120`×2, `1530`×1, `16830`×1, `23725.625`×1 | `1530` |
| `ActualNetWeight` | 451 | `int`×451 | 13 valores únicos. Top: `27000`×353, `25000`×50, `21600`×36, `3000`×2, `6000`×2, `1500`×1, `16500`×1, `23375`×1 | `1500` |
| `BilledRatedWeight` | 451 | `int`×451 | 13 valores únicos. Top: `1080`×353, `25000`×50, `18`×36, `120`×2, `240`×2, `60`×1, `660`×1, `935`×1 | `60` |
| `Volume` | 451 | `float`×451 | 13 valores únicos. Top: `45.522`×353, `42.15`×50, `36.418`×36, `5.058`×2, `10.116`×2, `2.529`×1, `27.819`×1, `39.41`×1 | `2.529` |
| `LadingQuantity` | 451 | `int`×451 | 13 valores únicos. Top: `1080`×353, `25000`×50, `18`×36, `120`×2, `240`×2, `60`×1, `660`×1, `935`×1 | `60` |
| `PackagingFormCode` | 451 | `str`×451 | `BAG`×399, `UNP`×51, `BLK`×1 | `BAG` |

### `Items[].DescriptionMarksAndNumbers`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=1, max=1, avg=1, mediana=1

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `LadingDescription` | 451 | `str`×451 | 31 valores únicos. Top: `Polyethylene 35060L High Densi…`×66, `DOWLEX(tm) TG 2085B Polyethyle…`×65, `Polyethylene NG 6895 Medium De…`×51, `DOW(tm) LDPE 203M Resin`×32, `HDPE NG 7000 H`×31, `DOWLEX(tm) GM 8051 Polyethylen…`×20, `DOW(tm) Polyethylene 40055L Hi…`×20, `LLDPE 1613.11 Polyethylene Res…`×17 | `DOW(tm) LDPE 208M Resin` |
| `CommodityCode` | 451 | `str`×451 | 33 valores únicos. Top: `000000000000374367`×65, `000000000000374344`×51, `000000000000154301`×50, `000000000000374301`×32, `000000000099066480`×31, `000000000099083655`×20, `000000000000358578`×20, `000000000011094969`×17 | `000000000000374303` |

### `Items[].ItemIdentification`
- Items con sub-array no-vacío: **451/451**
- Cardinalidad: min=1, max=1, avg=1, mediana=1

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ProductServiceIDQualifierVo` | 451 | `str`×451 | 446 valores únicos. Top: `0831644163`×4, `0831659184`×2, `0831672442`×2, `0831636939`×1, `0831637185`×1, `0831654573`×1, `0831654697`×1, `0831654698`×1 | `0831644163` |
| `ProductServiceIDQualifierVs` | 451 | `str`×451 | `000010`×441, `000020`×7, `000030`×2, `000040`×1 | `000010` |
| `ReferenceIdentificationItem` | 451 | `list`×451 | `list` (compuesto) | `[{"ReferenceIdentification": "ITEMDESC", "FreeFormDescriptio…` |


### `Items[].ItemIdentification[].ReferenceIdentificationItem`
- Sub-arrays no-vacíos: **451/451**
- Cardinalidad: min=2, max=3, avg=3.0, mediana=3

| Campo | Presencia | Tipo(s) | Valores | Ejemplo |
|---|---|---|---|---|
| `ReferenceIdentification` | 1352 | `str`×1352 | `ITEMDESC`×451, `HAZPROPERNAME1`×451, `DGTXT`×450 | `ITEMDESC` |
| `FreeFormDescription` | 1352 | `str`×1352 | 42 valores únicos. Top: `Not regulated for transport`×450, `HAZARDOUS  GOODS INFO Argentin…`×314, `HAZARDOUS  GOODS INFO Not regu…`×114, `DOWLEX(tm) TG 2085B Polyethyle…`×65, `Polyethylene NG 6895 Medium De…`×51, `Polyethylene 35060L High Densi…`×50, `DOW(tm) LDPE 203M Resin 25 KG …`×32, `HDPE NG 7000 H 25 KG Bags 60 B…`×31 | `DOW(tm) LDPE 208M Resin 25 KG Bags 60 Bags on a Pallet` |


## 2c. Decodificaciones útiles

### `ReferenceIdentificationGeneral[].ReferenceIdentificationQualifier` — frecuencia por qualifier

| Qualifier | Apariciones | Docs distintos | Ejemplo |
|---|---|---|---|
| `19` | 111 | 111 | `0803` |
| `11` | 111 | 111 | `Z013` |
| `PE` | 111 | 111 | `P703` |
| `SF` | 111 | 111 | `D116` |
| `PO` | 111 | 111 | `0118531879` |
| `1V` | 56 | 56 | `0118531879` |
| `CO` | 56 | 56 | `PD2026/102097` |
| `AEG` | 56 | 56 | `DIRECT CONSUMER` |
| `BN` | 1 | 1 | `202601688` |

### `Entities[].EntityIdentifier` — frecuencia

| EntityIdentifier | Apariciones |
|---|---|
| `16` | 111 |
| `ST` | 111 |
| `EX` | 111 |
| `N1` | 111 |
| `BT` | 111 |
| `NP` | 111 |
| `DIR` | 106 |
| `PK` | 85 |
| `CN` | 51 |
| `AO` | 49 |
| `PK2` | 18 |
| `PK3` | 12 |
| `PK4` | 8 |

*Entities por documento: min=7, max=13, avg=8.96, mediana=9*


### `RouteInformation[].TransportationMethodTypeCode` (MOT)

| Código | Apariciones |
|---|---|
| `O` | 77 |
| `M` | 33 |

### `RouteInformation[].StandardCarrierAlphaCode` (SCAC)

| Code | Apariciones |
|---|---|
| `SSB` | 111 |

### `DateTimeReference[].DateTimeQualifier` — frecuencia

| Qualifier | Apariciones | Ejemplo de Date |
|---|---|---|
| `RSD` | 111 | `20260504` |
| `002` | 111 | `20260504` |


## 3. Campos siempre nulos o vacíos

- (ninguno presente en todos los docs siempre vacío)


## 4. Variaciones STO vs Trade

_(STO: 55 docs, Trade: 56 docs)_

### Diferencias de presencia de campos top-level (≥20 puntos %)

| Campo | STO presence (no-empty) | Trade presence (no-empty) | Δ |
|---|---|---|---|
| `PlaceOfReceiptCode` | 29/55 (53%) | 56/56 (100%) | -47pp |
| `PlaceOfDelivery` | 1/55 (2%) | 26/56 (46%) | -45pp |

### Distribuciones de valores por tipo (campos clave)


**`TariffServiceCode`**
| Valor | STO | Trade |
|---|---|---|
| `DD` | 0 | 56 |
| `DP` | 55 | 0 |

**`ShipmentMethodPayment`**
| Valor | STO | Trade |
|---|---|---|
| `PP` | 55 | 56 |

**`TransactionSetPurposeCode`**
| Valor | STO | Trade |
|---|---|---|
| `49` | 55 | 56 |

**`ApplicationType`**
| Valor | STO | Trade |
|---|---|---|
| `BN` | 55 | 56 |

**`CurrencyCode`**
| Valor | STO | Trade |
|---|---|---|
| `USD` | 55 | 56 |

**`TransportationTermsCode`**
| Valor | STO | Trade |
|---|---|---|
| `CPT` | 2 | 37 |
| `CFR` | 27 | 0 |
| `FOB` | 26 | 0 |
| `CIP` | 0 | 14 |
| `FCA` | 0 | 5 |

**`DeliveryLocation`**
| Valor | STO | Trade |
|---|---|---|
| `Buenos Aires Port` | 26 | 0 |
| `Santos Port` | 25 | 0 |
| `MANAUS PORT` | 0 | 16 |
| `NAVEGANTES PORT` | 0 | 15 |
| `PARANAGUA PORT` | 0 | 10 |
| `SANTOS PORT` | 0 | 4 |
| `Manaus port` | 0 | 2 |
| `CALLAO PORT` | 0 | 2 |
| `MAIPU` | 2 | 0 |
| `BAHIA BLANCA` | 0 | 2 |

**`TermsOfSale`**
| Valor | STO | Trade |
|---|---|---|
| `0` | 11 | 53 |
| `31` | 44 | 3 |

**`PlaceOfReceiptCode`**
| Valor | STO | Trade |
|---|---|---|
| `D146` | 0 | 51 |
| `null` | 26 | 0 |
| `D147` | 25 | 0 |
| `D116` | 2 | 3 |
| `D176` | 1 | 1 |
| `D044` | 1 | 0 |
| `K168` | 0 | 1 |

**`BusinessInstructionsReferenceNumberNotes`**
| Valor | STO | Trade |
|---|---|---|
| `SET OF DOCUMENTS:,, - Invoice - 1 original signed (without w…` | 51 | 0 |
| `10 On Carriage Manaus Port 12A Loading Exceptions USE 40FT C…` | 0 | 12 |
| `12A LOABABILITY EXCEPTION PLEASE LOAD IN x X x' CTNRS 12H MI…` | 0 | 5 |
| `12A LOABABILITY EXCEPTION PLEASE USE 40FT CONTAINER 13B TRAN…` | 0 | 5 |
| `12A Loading Exceptions USE 40' CONTAINERS Statement Examples…` | 0 | 4 |
| `#12A# LOADABILITY EXCEPTION PLEASE LOAD IN 40FCL #13A# BILL …` | 0 | 4 |
| `12A Loading Exceptions Please load in 40FT container 13A Bil…` | 0 | 2 |
| `Original 13A2 ALL IN VALUE PRINTED ON BL. FREIGHTED BILL OF …` | 2 | 0 |
| `12A Loading Exceptions Please load in a 40# container 13A Bi…` | 0 | 2 |
| `12A LOABABILITY EXCEPTION PLEASE USE 40FT CONTAINER 12H MISC…` | 0 | 2 |

**`Entities[EntityIdentifier='EX'].IdentificationCode` (Exporter code)**
| Code | STO | Trade |
|---|---|---|
| `A136` | 55 | 56 |

**País de destino (`Entities[EntityIdentifier='ST'].CountryCode`)**
| País | STO | Trade |
|---|---|---|
| `BR` | 52 | 49 |
| `PE` | 0 | 3 |
| `AR` | 0 | 2 |
| `CL` | 2 | 0 |
| `UY` | 0 | 1 |
| `PY` | 0 | 1 |
| `US` | 1 | 0 |


## 5. Sorpresas y anomalías

### Tipos mixtos en un mismo campo top-level

- (ningún campo top-level tiene tipo mixto)

### Tipos mixtos en sub-campos de `Items[]`

- `Items[].QuantityAndWeight.GrossWeight` → {'int': 448, 'float': 3}
- `Items[].PricingInformationUnitPrice` → {'float': 317, 'int': 134}
- `Items[].PricingInformationMonetaryAmount` → {'int': 449, 'float': 2}
- `Items[].ExchangeRate` → {'int': 206, 'float': 245}

### Campo `q` (path API)
- Presencia: 111/111 (100.0%)
- Valores únicos: {'/api/orders/store': 111}
- Es ruido (path del request, no parte del 304 EDI canónico). Candidato a ignorar/strippear en el schema.

### Containers con `NumberOfContainers` 0/ausente
- Docs con al menos 1 item sin NumberOfContainers válido: 0/111

### `EquipmentNumber == 'XNOTFOUNDX'` (placeholder)
- Docs con al menos 1 item con XNOTFOUNDX: 10/111 — convención del SAP/Importer cuando todavía no asignaron contenedor real.

### `SealNumber == 'NA'`
- Total ContainerDetails con SealNumber NA: 451 (placeholder antes de embarque)

### `RoutingNumber` duplicados entre docs
- 1 RoutingNumbers que aparecen en >1 doc.
- Ejemplos: [(33708426259, 111)]

### `po_number` duplicados entre archivos
- 0 POs duplicados (esperado: 0 — los duplicados se descartaron en extracción)

### `Items[].Hazardous` no-vacío
- Docs con al menos 1 item Hazardous no-vacío: 0/111

### Productos únicos (`LadingDescription` en `DescriptionMarksAndNumbers`)
- Total descripciones distintas: 31
- Top 10: {'Polyethylene 35060L High Density': 66, 'DOWLEX(tm) TG 2085B Polyethylene Resin': 65, 'Polyethylene NG 6895 Medium Density': 51, 'DOW(tm) LDPE 203M Resin': 32, 'HDPE NG 7000 H': 31, 'DOWLEX(tm) GM 8051 Polyethylene Resin': 20, 'DOW(tm) Polyethylene 40055L High Density': 20, 'LLDPE 1613.11 Polyethylene Resin': 17, 'HDPE 6200': 17, 'DOWLEX(tm) NG2045B Polyethylene Resin': 15}


---


_Inventario auto-generado el 2026-04-29 sobre los 111 archivos en `samples/304/` (8 únicos del 22/04 + 3 duplicados manuales + 100 nuevos del 29/04). Ver `samples/304/304_index.csv` para metadata por archivo._