/**
 * Seed file for Nexus locations
 * Creates sample locations for organizations
 */

exports.seed = async function(knex) {
  // Delete existing entries (if any)
  await knex('locations').del();

  // Get organizations
  const organizations = await knex('organizations')
    .select('id', 'name')
    .limit(5);

  if (organizations.length === 0) {
    console.log('No organizations found. Skipping locations seed.');
    return;
  }

  const locations = [];

  // Sample locations for each organization
  const locationTemplates = [
    {
      name: 'Head Office',
      address: 'Dr. Sophie Redmondstraat 118',
      city: 'Paramaribo',
      state: 'Paramaribo',
      postal_code: '00000',
      country: 'SR',
      is_primary: true,
      is_active: true
    },
    {
      name: 'Branch Office - North',
      address: 'Commewijnestraat 45',
      city: 'Paramaribo',
      state: 'Paramaribo',
      postal_code: '00000',
      country: 'SR',
      is_primary: false,
      is_active: true
    },
    {
      name: 'Warehouse',
      address: 'Industrieweg 23',
      city: 'Paramaribo',
      state: 'Paramaribo',
      postal_code: '00000',
      country: 'SR',
      is_primary: false,
      is_active: true
    },
    {
      name: 'Regional Office - West',
      address: 'Oost-West Verbinding 67',
      city: 'Paramaribo',
      state: 'Paramaribo',
      postal_code: '00000',
      country: 'SR',
      is_primary: false,
      is_active: true
    }
  ];

  // Create locations for first 3 organizations
  for (let i = 0; i < Math.min(3, organizations.length); i++) {
    const org = organizations[i];
    const numLocations = i === 0 ? 4 : 2; // First org gets all locations

    for (let j = 0; j < numLocations; j++) {
      const template = locationTemplates[j];
      locations.push({
        id: knex.raw('gen_random_uuid()'),
        organization_id: org.id,
        name: template.name,
        address: template.address,
        city: template.city,
        state: template.state,
        postal_code: template.postal_code,
        country: template.country,
        phone: '+597 123-4567',
        email: `${template.name.toLowerCase().replace(/\s+/g, '.')}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        is_primary: template.is_primary,
        is_active: template.is_active,
        timezone: 'America/Paramaribo',
        metadata: JSON.stringify({
          capacity: 50 + (j * 25),
          parking_spaces: 10 + (j * 5),
          accessibility: true
        }),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // Insert locations
  await knex('locations').insert(locations);

  console.log(`✓ Seeded ${locations.length} locations for ${Math.min(3, organizations.length)} organizations`);
};
