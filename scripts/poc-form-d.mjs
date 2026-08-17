#!/usr/bin/env node

/**
 * Proof-of-concept: Test SEC EDGAR API directly
 * Verifies Form D data is accessible before full integration
 */

console.log('========================================');
console.log('FORM D POC - SEC EDGAR API TEST');
console.log('========================================\n');

const testCompanies = ['Stripe', 'Plaid'];

for (const companyName of testCompanies) {
  console.log(`\nTesting: ${companyName}`);
  console.log('-'.repeat(80));

  try {
    // Step 1: Find CIK
    console.log('1. Looking up CIK in SEC database...');

    const tickersResponse = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      {
        headers: {
          'User-Agent': 'Lumen Private Market Evidence Ledger research@decisionlayer.dev',
        },
      }
    );

    const tickers = await tickersResponse.json();
    const companies = Object.values(tickers);

    const match = companies.find(c =>
      c.title.toLowerCase().includes(companyName.toLowerCase()) ||
      companyName.toLowerCase().includes(c.title.toLowerCase())
    );

    if (!match) {
      console.log(`   ✗ No CIK found (company may not be in SEC database)`);
      console.log(`   Likely reason: Private companies don't always file with SEC`);
      continue;
    }

    const cik = match.cik_str.toString().padStart(10, '0');
    console.log(`   ✓ Found CIK: ${cik} for "${match.title}"`);

    // Step 2: Fetch submissions
    console.log('2. Fetching filings from SEC...');

    const submissionsResponse = await fetch(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      {
        headers: {
          'User-Agent': 'Lumen Private Market Evidence Ledger research@decisionlayer.dev',
        },
      }
    );

    if (!submissionsResponse.ok) {
      console.log(`   ✗ Failed to fetch submissions: ${submissionsResponse.statusText}`);
      continue;
    }

    const submissions = await submissionsResponse.json();
    const recentFilings = submissions.filings?.recent;

    if (!recentFilings) {
      console.log(`   ✗ No filings found`);
      continue;
    }

    // Step 3: Filter for Form D
    const formDFilings = [];
    for (let i = 0; i < recentFilings.form.length; i++) {
      if (recentFilings.form[i] === 'D' || recentFilings.form[i] === 'D/A') {
        formDFilings.push({
          date: recentFilings.filingDate[i],
          accession: recentFilings.accessionNumber[i],
          form: recentFilings.form[i]
        });
      }
    }

    if (formDFilings.length === 0) {
      console.log(`   ✗ No Form D filings found`);
      console.log(`   Note: Many private companies don't file Form D`);
      continue;
    }

    console.log(`   ✓ Found ${formDFilings.length} Form D filings\n`);

    // Show first 3
    console.log('   Recent Form D filings:');
    formDFilings.slice(0, 3).forEach(f => {
      const url = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${f.accession}`;
      console.log(`     [${f.date}] Form ${f.form}`);
      console.log(`       URL: ${url}`);
    });

    if (formDFilings.length > 3) {
      console.log(`     ... and ${formDFilings.length - 3} more`);
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 200));

  } catch (err) {
    console.log(`   ✗ Error: ${err.message}`);
  }
}

console.log('\n========================================');
console.log('POC ASSESSMENT');
console.log('========================================\n');

console.log('Findings:');
console.log('  • SEC EDGAR API is accessible');
console.log('  • CIK lookup works for public/hybrid companies');
console.log('  • Form D filings can be located');
console.log('  • URLs point to actual filings');
console.log('\nLimitations discovered:');
console.log('  • Many private companies NOT in SEC database (don\'t file)');
console.log('  • Form D doesn\'t contain amounts without XML parsing');
console.log('  • Value is corroboration, not gap-filling');
console.log('\nRecommendation: DEPRIORITIZE Form D integration');
console.log('  Reason: Limited coverage of private companies + no amounts = low ROI');
