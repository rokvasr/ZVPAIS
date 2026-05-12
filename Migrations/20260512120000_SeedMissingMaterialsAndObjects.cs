using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ŽVPAIS_API.Migrations
{
    public partial class SeedMissingMaterialsAndObjects : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- 1. Missing individual pollutant materials ---
            // These were in the local DB (manually inserted 2026-04-17) but never
            // formalized into a migration, so the deployed system never received them.
            migrationBuilder.Sql(@"
                INSERT INTO materials (name, description, unit, substance_type, base_rate, toxicity_factor, emission_category, created_at)
                SELECT name, description, unit, substance_type, base_rate, toxicity_factor, emission_category, NOW()
                FROM (VALUES
                    ('Naftos produktai',            'Nafta, dyzelinas, mazutas ir jų mišiniai. Vandens / dirvožemio tarša.',           't', 'standard',  1450.00,  8.0,  NULL),
                    ('Benzinas',                    'Degalai ir lakieji naftos frakcijos. Vandens / dirvožemio tarša.',                't', 'standard',  2100.00, 10.0,  NULL),
                    ('Gyvsidabris (Hg)',            'Ypač pavojingas sunkusis metalas. Kaupiasi maisto grandinėje.',                  't', 'standard', 95000.00,100.0,  NULL),
                    ('Švinas (Pb)',                 'Sunkusis metalas. Neurotoksinis, kaupiasi dirvožemyje ir vandenyje.',            't', 'standard', 12500.00, 20.0,  NULL),
                    ('Kadmis (Cd)',                 'Kancerogeninis sunkusis metalas. Labai pavojingas vandens ekosistemoms.',        't', 'standard', 46000.00, 50.0,  NULL),
                    ('Chromas (Cr)',                'Sunkusis metalas. Cr(VI) forma ypač toksiška ir kancerogeninė.',                't', 'standard',  8200.00, 15.0,  NULL),
                    ('Varis (Cu)',                  'Sunkusis metalas. Toksiškas vandens organizmams net mažomis dozėmis.',          't', 'standard',  5100.00, 12.0,  NULL),
                    ('Cinkas (Zn)',                 'Sunkusis metalas. Didelėmis koncentracijomis kenksmingas ekosistemoms.',        't', 'standard',  3200.00,  8.0,  NULL),
                    ('Azoto junginiai (N)',         'Nitratai, nitritai ir amonis. Sukelia eutrofikaciją vandens telkiniuose.',      't', 'standard',   380.00,  5.0,  NULL),
                    ('Fosforo junginiai (P)',       'Fosfatai ir organinis fosforas. Pagrindinis eutrofikacijos skatintojas.',       't', 'standard',  1850.00,  7.0,  NULL),
                    ('Anglies monoksidas (CO)',     'Degimo produktas. Kenkia žmogaus sveikatai ir oro kokybei.',                   't', 'standard',    12.00,  3.0,  NULL),
                    ('Lakieji organiniai junginiai (LOJ)', 'Tirpikliai, degalų garai ir kt. Troposferinio ozono pirmtakai.',        't', 'standard',   210.00,  8.0,  NULL)
                ) AS v(name, description, unit, substance_type, base_rate, toxicity_factor, emission_category)
                WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE m.name = v.name);
            ");

            // --- 2. Missing resin materials ---
            // Inserted locally 2026-04-23 but never migrated to deployed.
            migrationBuilder.Sql(@"
                INSERT INTO materials (name, description, unit, substance_type, base_rate, toxicity_factor, emission_category, created_at)
                SELECT name, description, unit, substance_type, base_rate, toxicity_factor, emission_category, NOW()
                FROM (VALUES
                    ('Epoksidinės dervos',   'Epoksidinės dervos — dažai, klijai, kompozitai',                                't', 'standard', NULL::numeric, NULL::double precision, NULL::text),
                    ('Poliesterio dervos',   'Nesotintosios poliesterio dervos — stiklo pluoštas, kompozitai',                't', 'standard', NULL::numeric, NULL::double precision, NULL::text),
                    ('Fenolio dervos',       'Fenolio-formaldehido dervos — elektros izoliacijos, presavimo masės',           't', 'standard', NULL::numeric, NULL::double precision, NULL::text),
                    ('Akrilinės dervos',     'Akriliniai lakai, dažai ir klijų bazės',                                       't', 'standard', NULL::numeric, NULL::double precision, NULL::text),
                    ('Alkidinės dervos',     'Alkidiniai dažai ir lakai — baldai, metalinės konstrukcijos',                   't', 'standard', NULL::numeric, NULL::double precision, NULL::text)
                ) AS v(name, description, unit, substance_type, base_rate, toxicity_factor, emission_category)
                WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE m.name = v.name);
            ");

            // --- 3. New environment objects ---
            migrationBuilder.Sql(@"
                INSERT INTO objects (name, description, total_mass, total_volume, created_at)
                SELECT name, description, total_mass, total_volume, NOW()
                FROM (VALUES
                    ('Pesticidu sandelis',
                     'Agrochemikalų ir pesticidų saugykla. Avariniu atveju labai toksiški junginiai patenka į gruntinį vandenį ir dirvožemį.',
                     12.0, 15.0),
                    ('Automobiliu servisas',
                     'Transporto priemonių techninės priežiūros cechas. Naudotos alyvos, degalai, guma ir sunkieji metalai iš akumuliatorių.',
                     8.0, 12.0),
                    ('Laku ir dayu sandelis',
                     'Lakų, dažų ir tirpiklių sandėlis. Gaisro metu išsiskiria lakieji organiniai junginiai ir halogenintieji tirpikliai.',
                     6.0, 10.0),
                    ('Medienos apdirbimo cechas',
                     'Medienos apdirbimo ir medienos produktų gamybos cechas. Generuoja pjuvenas, dulkes ir tirpiklinius garas.',
                     NULL, 200.0),
                    ('Akumuliatoriu utilizavimo cechas',
                     'Senų akumuliatorių ir baterijų perdirbimo cechas. Aukšta sunkiųjų metalų (Pb, Cd, Hg) koncentracija nuotekose ir ore.',
                     20.0, 25.0)
                ) AS v(name, description, total_mass, total_volume)
                WHERE NOT EXISTS (SELECT 1 FROM objects o WHERE o.name = v.name);
            ");

            // --- 4. Assign materials to new objects ---
            migrationBuilder.Sql(@"
                INSERT INTO object_materials (object_id, material_id, mass, volume, percentage, recovered_quantity)
                SELECT o.id_object, m.id_material, vals.mass, NULL, NULL, NULL
                FROM (VALUES
                    -- Pesticidu sandelis: group I (water/soil) — halogenated pesticides; group II — heavy metals
                    ('Pesticidu sandelis',             'I grupė (vanduo/žemė)',              2.0),
                    ('Pesticidu sandelis',             'II grupė (vanduo/žemė)',             1.5),
                    ('Pesticidu sandelis',             'I grupė (oras)',                     0.5),

                    -- Automobiliu servisas: fuels, oils, rubber, heavy metals from brakes/batteries
                    ('Automobiliu servisas',           'Dyzelinas / Benzinas',               3.0),
                    ('Automobiliu servisas',           'Nafta / Mineralinė alyva',           1.5),
                    ('Automobiliu servisas',           'Guma (techninis kaučiukas)',          2.0),
                    ('Automobiliu servisas',           'Švinas (Pb)',                        0.08),
                    ('Automobiliu servisas',           'Cinkas (Zn)',                        0.15),

                    -- Laku ir dayu sandelis: VOCs, halogenated solvents, resins
                    ('Laku ir dayu sandelis',          'Lakieji organiniai junginiai (LOJ)', 1.8),
                    ('Laku ir dayu sandelis',          'Halogenintieji organiniai jk',       0.6),
                    ('Laku ir dayu sandelis',          'Akrilinės dervos',                   1.2),
                    ('Laku ir dayu sandelis',          'Alkidinės dervos',                   0.8),
                    ('Laku ir dayu sandelis',          'IV grupė (oras)',                    0.5),

                    -- Medienos apdirbimo cechas: wood waste, finishing solvents, particulates
                    ('Medienos apdirbimo cechas',      'Mediena / Pjuvenos',                25.0),
                    ('Medienos apdirbimo cechas',      'Lakieji organiniai junginiai (LOJ)', 0.4),
                    ('Medienos apdirbimo cechas',      'III grupė (oras)',                   0.2),

                    -- Akumuliatoriu utilizavimo cechas: heavy metals, group II water/soil
                    ('Akumuliatoriu utilizavimo cechas','Švinas (Pb)',                       8.0),
                    ('Akumuliatoriu utilizavimo cechas','Kadmis (Cd)',                       0.5),
                    ('Akumuliatoriu utilizavimo cechas','Gyvsidabris (Hg)',                  0.1),
                    ('Akumuliatoriu utilizavimo cechas','Cinkas (Zn)',                       1.2),
                    ('Akumuliatoriu utilizavimo cechas','II grupė (vanduo/žemė)',            2.0)
                ) AS vals(obj_name, mat_name, mass)
                JOIN objects o ON o.name = vals.obj_name
                JOIN materials m ON m.name = vals.mat_name
                ON CONFLICT (object_id, material_id) DO NOTHING;
            ");

            // Reset sequences so future inserts get correct IDs.
            migrationBuilder.Sql(@"
                SELECT setval('materials_id_material_seq', COALESCE((SELECT MAX(id_material) FROM materials), 1), (SELECT COUNT(*) > 0 FROM materials));
                SELECT setval('objects_id_object_seq',     COALESCE((SELECT MAX(id_object)   FROM objects),   1), (SELECT COUNT(*) > 0 FROM objects));
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM materials WHERE name IN (
                    'Naftos produktai', 'Benzinas', 'Gyvsidabris (Hg)', 'Švinas (Pb)',
                    'Kadmis (Cd)', 'Chromas (Cr)', 'Varis (Cu)', 'Cinkas (Zn)',
                    'Azoto junginiai (N)', 'Fosforo junginiai (P)', 'Anglies monoksidas (CO)',
                    'Lakieji organiniai junginiai (LOJ)',
                    'Epoksidinės dervos', 'Poliesterio dervos', 'Fenolio dervos',
                    'Akrilinės dervos', 'Alkidinės dervos'
                );

                DELETE FROM objects WHERE name IN (
                    'Pesticidu sandelis', 'Automobiliu servisas', 'Laku ir dayu sandelis',
                    'Medienos apdirbimo cechas', 'Akumuliatoriu utilizavimo cechas'
                );
            ");
        }
    }
}
