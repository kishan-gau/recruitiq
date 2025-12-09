/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Insert forfait benefit components based on Wet Loonbelasting (Surinamese Wage Tax Law)
  // These components represent actual benefits provided to employees that trigger forfait taxation
  
  await knex('pay_components').insert([
    // ==================== BENEFIT COMPONENTS ====================
    // Car Benefit - Article 11 Wet Loonbelasting
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null, // Global components for all organizations
      code: 'CAR_BENEFIT',
      name: 'Autovoordeel',
      type: 'benefit',
      category: 'transport',
      description: 'Company car benefit - triggers forfait taxation per Wet Loonbelasting Art. 11',
      is_taxable: true,
      is_statutory: false,
      display_order: 250,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        catalogValue: { type: 'number', required: true, min: 0, label: 'Car Catalog Value (SRD)' },
        registrationDate: { type: 'date', required: true, label: 'Registration Date' },
        businessUsePercentage: { 
          type: 'number', 
          required: false, 
          min: 0, 
          max: 100, 
          default: 100,
          label: 'Business Use Percentage' 
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'company_car',
          forfaitComponentCode: 'CAR_FORFAIT_2PCT',
          calculationType: 'percentage_of_catalog_value',
          rate: 0.02,
          fieldMapping: {
            sourceField: 'catalogValue',
            targetField: 'catalogValue'
          },
          legalReference: 'Wet Loonbelasting Art. 11 - Company car benefits subject to 2% forfait taxation on catalog value'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    
    // Housing Benefit - Article 10 Wet Loonbelasting
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null,
      code: 'HOUSING_BENEFIT',
      name: 'Huisvestingsvoordeel',
      type: 'benefit',
      category: 'housing',
      description: 'Housing benefit provided by employer - subject to forfait taxation at 7.5%',
      is_taxable: true,
      is_statutory: false,
      display_order: 251,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        rentalValue: { type: 'number', required: true, min: 0, label: 'Monthly Rental Value (SRD)' },
        propertyType: { 
          type: 'select', 
          options: [
            { value: 'apartment', label: 'Apartment' },
            { value: 'house', label: 'House' },
            { value: 'room', label: 'Room' }
          ], 
          required: true,
          label: 'Property Type'
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'housing',
          forfaitComponentCode: 'HOUSING_FORFAIT_7_5PCT',
          calculationType: 'percentage_of_rental_value',
          rate: 0.075,
          fieldMapping: {
            sourceField: 'rentalValue',
            targetField: 'rentalValue'
          },
          legalReference: 'Wet Loonbelasting Art. 10 - Housing benefits subject to 7.5% forfait taxation on rental value'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    
    // Meal Benefit - Article 11 Wet Loonbelasting
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null,
      code: 'MEAL_BENEFIT',
      name: 'Maaltijdvoordeel',
      type: 'benefit',
      category: 'meal',
      description: 'Meal benefit - hot meals subject to forfait taxation per Wet Loonbelasting',
      is_taxable: true,
      is_statutory: false,
      display_order: 252,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        mealsPerMonth: { 
          type: 'number', 
          required: true, 
          min: 1, 
          max: 31,
          label: 'Meals per Month' 
        },
        mealType: { 
          type: 'select', 
          options: [
            { value: 'hot_meal', label: 'Hot Meal' },
            { value: 'cold_meal', label: 'Cold Meal' },
            { value: 'voucher', label: 'Meal Voucher' }
          ], 
          required: true,
          label: 'Meal Type'
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'hot_meals',
          forfaitComponentCode: 'MEAL_FORFAIT_1_50',
          calculationType: 'fixed_per_meal',
          rate: 1.50,
          fieldMapping: {
            sourceField: 'mealsPerMonth',
            targetField: 'mealsPerMonth'
          },
          legalReference: 'Wet Loonbelasting Art. 11 - Hot meal benefits subject to fixed forfait taxation of SRD 1.50 per meal'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    
    // Fuel Benefit
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null,
      code: 'FUEL_BENEFIT',
      name: 'Brandstofvoordeel',
      type: 'benefit',
      category: 'transport',
      description: 'Fuel allowance benefit - subject to forfait taxation',
      is_taxable: true,
      is_statutory: false,
      display_order: 253,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        monthlyAmount: { type: 'number', required: true, min: 0, label: 'Monthly Fuel Amount (SRD)' },
        fuelType: { 
          type: 'select', 
          options: [
            { value: 'gasoline', label: 'Gasoline' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'electric', label: 'Electric' }
          ], 
          required: true,
          label: 'Fuel Type'
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'fuel_allowance',
          forfaitComponentCode: 'FUEL_FORFAIT_20PCT',
          calculationType: 'percentage_of_amount',
          rate: 0.20,
          fieldMapping: {
            sourceField: 'monthlyAmount',
            targetField: 'monthlyAmount'
          },
          legalReference: 'Wet Loonbelasting - Fuel allowance benefits subject to 20% forfait taxation on allowance amount'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    
    // Phone Benefit
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null,
      code: 'PHONE_BENEFIT',
      name: 'Telefoonvoordeel',
      type: 'benefit',
      category: 'communication',
      description: 'Company phone benefit - taxable benefit per employer policy',
      is_taxable: true,
      is_statutory: false,
      display_order: 254,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        monthlyValue: { type: 'number', required: true, min: 0, label: 'Monthly Phone Value (SRD)' },
        phoneType: { 
          type: 'select', 
          options: [
            { value: 'mobile', label: 'Mobile Phone' },
            { value: 'landline', label: 'Landline' },
            { value: 'both', label: 'Mobile & Landline' }
          ], 
          required: true,
          label: 'Phone Type'
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'communication_allowance',
          forfaitComponentCode: 'PHONE_FORFAIT_10PCT',
          calculationType: 'percentage_of_value',
          rate: 0.10,
          fieldMapping: {
            sourceField: 'monthlyValue',
            targetField: 'monthlyValue'
          },
          legalReference: 'Wet Loonbelasting - Communication benefits subject to 10% forfait taxation on monthly value'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    
    // Medical Benefit - Progressive forfait taxation
    {
      id: knex.raw('gen_random_uuid()'),
      organization_id: null,
      code: 'MEDICAL_BENEFIT',
      name: 'Medisch Voordeel',
      type: 'benefit',
      category: 'medical',
      description: 'Medical/health insurance benefit - progressive forfait taxation',
      is_taxable: true,
      is_statutory: false,
      display_order: 255,
      requires_configuration: true,
      configuration_schema: JSON.stringify({
        monthlyPremium: { type: 'number', required: true, min: 0, label: 'Monthly Premium (SRD)' },
        coverageType: { 
          type: 'select', 
          options: [
            { value: 'basic', label: 'Basic Coverage' },
            { value: 'extended', label: 'Extended Coverage' },
            { value: 'family', label: 'Family Coverage' }
          ], 
          required: true,
          label: 'Coverage Type'
        }
      }),
      calculation_metadata: JSON.stringify({
        forfaitRule: {
          benefitType: 'medical_insurance',
          forfaitComponentCode: 'MEDICAL_FORFAIT_15PCT',
          calculationType: 'percentage_of_premium',
          rate: 0.15,
          fieldMapping: {
            sourceField: 'monthlyPremium',
            targetField: 'monthlyPremium'
          },
          legalReference: 'Wet Loonbelasting - Medical insurance benefits subject to 15% forfait taxation on premium amount'
        }
      }),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
  
  console.log('✅ Seeded forfait benefit components based on Wet Loonbelasting');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove the forfait benefit components
  await knex('pay_components').whereIn('code', [
    'CAR_BENEFIT',
    'HOUSING_BENEFIT', 
    'MEAL_BENEFIT',
    'FUEL_BENEFIT',
    'PHONE_BENEFIT',
    'MEDICAL_BENEFIT'
  ]).del();
  
  console.log('✅ Removed forfait benefit components');
};